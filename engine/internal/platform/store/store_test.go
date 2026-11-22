package store_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/tydbase/tydbase/engine/internal/platform/store"
)

func TestOpenMigratesAndSetsPragmas(t *testing.T) {
	// macOS's os.UserConfigDir is "~/Library/Application Support": the path must survive a space.
	dir := filepath.Join(t.TempDir(), "Application Support")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, store.FileName)

	db, err := store.Open(t.Context(), path)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("db file not at %s: %v", path, err)
	}

	for pragma, want := range map[string]string{"foreign_keys": "1", "journal_mode": "wal", "busy_timeout": "5000"} {
		var got string
		if err := db.QueryRowContext(t.Context(), "PRAGMA "+pragma).Scan(&got); err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Errorf("PRAGMA %s = %s, want %s", pragma, got, want)
		}
	}

	for _, table := range []string{"workspaces", "vault_deks", "connections", "saved_queries", "query_audit"} {
		var n int
		err := db.QueryRowContext(t.Context(), "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name = ?", table).Scan(&n)
		if err != nil || n != 1 {
			t.Errorf("table %s missing (n=%d, err=%v)", table, n, err)
		}
	}

	// Foreign keys are enforced: a connection can't point at a workspace that doesn't exist.
	_, err = db.ExecContext(t.Context(),
		"INSERT INTO connections (id, workspace_id, name, engine, host, port, database, username) VALUES ('c', 'nope', 'n', 'postgresql', 'h', 5432, 'd', 'u')")
	if err == nil {
		t.Error("insert with a dangling workspace_id succeeded; foreign_keys is not enforced")
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}

	// Reopening an up-to-date database is a no-op, not an error.
	db, err = store.Open(t.Context(), path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestOpenMissingDirIsActionable(t *testing.T) {
	_, err := store.Open(t.Context(), filepath.Join(t.TempDir(), "absent", store.FileName))
	if err == nil {
		t.Fatal("Open in a missing directory succeeded")
	}
}
