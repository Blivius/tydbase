package vault_test

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/blivius/tydbase/engine/internal/platform/store"
	"github.com/blivius/tydbase/engine/internal/platform/vault"
)

const (
	wsA = "0196f0c0-0000-7000-8000-00000000000a"
	wsB = "0196f0c0-0000-7000-8000-00000000000b"
)

// env is a data dir with a migrated store and two workspaces.
type env struct {
	dir  string
	root *os.Root
	db   *sql.DB
}

func newEnv(t *testing.T) env {
	t.Helper()
	dir := t.TempDir()
	root, err := os.OpenRoot(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = root.Close() })
	db := openDB(t, dir)
	for _, ws := range []string{wsA, wsB} {
		if _, err := db.ExecContext(t.Context(), "INSERT INTO workspaces (id, name) VALUES (?, ?)", ws, ws); err != nil {
			t.Fatal(err)
		}
	}
	return env{dir: dir, root: root, db: db}
}

func openDB(t *testing.T, dir string) *sql.DB {
	t.Helper()
	db, err := store.Open(t.Context(), filepath.Join(dir, store.FileName))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func (e env) vault(t *testing.T, envKey string) *vault.Vault {
	t.Helper()
	v, err := vault.New(t.Context(), e.db, e.root, envKey)
	if err != nil {
		t.Fatalf("vault.New: %v", err)
	}
	return v
}

func TestSealOpenSurvivesRestart(t *testing.T) {
	e := newEnv(t)
	secret := []byte("s3cret-pg-password")
	aad := []byte("conn-1/password")

	ct, err := e.vault(t, "").Seal(t.Context(), wsA, secret, aad)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(ct, secret) {
		t.Fatal("ciphertext contains the plaintext")
	}

	info, err := os.Stat(filepath.Join(e.dir, vault.KeyFile))
	if err != nil {
		t.Fatalf("master.key was not generated: %v", err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("master.key mode = %o, want 600", perm)
	}
	if leftovers, _ := filepath.Glob(filepath.Join(e.dir, "*.tmp-*")); len(leftovers) > 0 {
		t.Errorf("temp key files left behind: %v", leftovers)
	}

	// "Restart": a new connection pool and a new vault over the same data dir.
	if err := e.db.Close(); err != nil {
		t.Fatal(err)
	}
	e.db = openDB(t, e.dir)
	got, err := e.vault(t, "").Open(t.Context(), wsA, ct, aad)
	if err != nil {
		t.Fatalf("Open after restart: %v", err)
	}
	if !bytes.Equal(got, secret) {
		t.Fatalf("Open = %q, want %q", got, secret)
	}
}

func TestOpenRejectsTamperingAndMisuse(t *testing.T) {
	e := newEnv(t)
	v := e.vault(t, "")
	aad := []byte("conn-1/password")
	ct, err := v.Seal(t.Context(), wsA, []byte("pw"), aad)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := v.Seal(t.Context(), wsB, []byte("other"), aad); err != nil {
		t.Fatal(err)
	}

	flipped := bytes.Clone(ct)
	flipped[len(flipped)-1] ^= 1

	cases := map[string]struct {
		ws  string
		ct  []byte
		aad []byte
	}{
		"flipped byte":    {wsA, flipped, aad},
		"other field":     {wsA, ct, []byte("conn-2/password")},
		"other workspace": {wsB, ct, aad},
		"truncated":       {wsA, ct[:10], aad},
	}
	for name, c := range cases {
		if _, err := v.Open(t.Context(), c.ws, c.ct, c.aad); !errors.Is(err, vault.ErrDecrypt) {
			t.Errorf("%s: err = %v, want ErrDecrypt", name, err)
		}
	}

	if _, err := v.Open(t.Context(), "0196f0c0-0000-7000-8000-0000000000ff", ct, aad); err == nil ||
		!strings.Contains(err.Error(), "no data key") {
		t.Errorf("unknown workspace: err = %v, want a 'no data key' error", err)
	}
	if _, err := v.Seal(t.Context(), "missing-workspace", []byte("pw"), aad); err == nil ||
		!strings.Contains(err.Error(), "does the workspace exist") {
		t.Errorf("seal for missing workspace: err = %v, want an actionable error", err)
	}
}

func TestDeletingWorkspaceShredsItsSecrets(t *testing.T) {
	e := newEnv(t)
	v := e.vault(t, "")
	ct, err := v.Seal(t.Context(), wsA, []byte("pw"), nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.ExecContext(t.Context(), "DELETE FROM workspaces WHERE id = ?", wsA); err != nil {
		t.Fatal(err)
	}
	if _, err := v.Open(t.Context(), wsA, ct, nil); err == nil {
		t.Fatal("secret still opens after its workspace (and data key) was deleted")
	}
}

func TestMasterKeySources(t *testing.T) {
	envKey := base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{7}, 32))

	t.Run("env key wins and writes no file", func(t *testing.T) {
		e := newEnv(t)
		ct, err := e.vault(t, envKey).Seal(t.Context(), wsA, []byte("pw"), nil)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := os.Stat(filepath.Join(e.dir, vault.KeyFile)); !errors.Is(err, os.ErrNotExist) {
			t.Errorf("master.key written although TYDBASE_MASTER_KEY was set (stat err = %v)", err)
		}
		if _, err := e.vault(t, "  "+envKey+"\n").Open(t.Context(), wsA, ct, nil); err != nil {
			t.Errorf("env key with surrounding whitespace: %v", err)
		}
	})

	t.Run("malformed env key", func(t *testing.T) {
		e := newEnv(t)
		for _, bad := range []string{"not-base64!", base64.StdEncoding.EncodeToString([]byte("short"))} {
			_, err := vault.New(t.Context(), e.db, e.root, bad)
			if err == nil || !strings.Contains(err.Error(), "openssl rand -base64 32") {
				t.Errorf("key %q: err = %v, want the generate hint", bad, err)
			}
		}
	})

	t.Run("missing key with existing secrets refuses to boot", func(t *testing.T) {
		e := newEnv(t)
		if _, err := e.vault(t, "").Seal(t.Context(), wsA, []byte("pw"), nil); err != nil {
			t.Fatal(err)
		}
		if err := os.Remove(filepath.Join(e.dir, vault.KeyFile)); err != nil {
			t.Fatal(err)
		}
		_, err := vault.New(t.Context(), e.db, e.root, "")
		if err == nil || !strings.Contains(err.Error(), "holds encrypted secrets") {
			t.Fatalf("err = %v, want refusal", err)
		}
		if _, statErr := os.Stat(filepath.Join(e.dir, vault.KeyFile)); !errors.Is(statErr, os.ErrNotExist) {
			t.Error("a new master.key was generated over existing secrets")
		}
	})

	t.Run("wrong key with existing secrets refuses to boot", func(t *testing.T) {
		e := newEnv(t)
		if _, err := e.vault(t, "").Seal(t.Context(), wsA, []byte("pw"), nil); err != nil {
			t.Fatal(err)
		}
		_, err := vault.New(t.Context(), e.db, e.root, envKey)
		if err == nil || !strings.Contains(err.Error(), "does not match") {
			t.Fatalf("err = %v, want key mismatch", err)
		}
	})
}

// Two processes booting a fresh data dir together (start + mcp) must agree on one key, and
// concurrent first Seals for a workspace must agree on one data key.
func TestConcurrentFirstUse(t *testing.T) {
	e := newEnv(t)
	vaults := make([]*vault.Vault, 8)
	var wg sync.WaitGroup
	for i := range vaults {
		wg.Go(func() {
			v, err := vault.New(t.Context(), e.db, e.root, "")
			if err != nil {
				t.Errorf("vault.New: %v", err)
			}
			vaults[i] = v
		})
	}
	wg.Wait()
	if t.Failed() {
		return
	}

	cts := make([][]byte, len(vaults))
	for i, v := range vaults {
		wg.Go(func() {
			ct, err := v.Seal(t.Context(), wsA, []byte("pw"), nil)
			if err != nil {
				t.Errorf("Seal: %v", err)
			}
			cts[i] = ct
		})
	}
	wg.Wait()
	for i, ct := range cts {
		if _, err := vaults[0].Open(t.Context(), wsA, ct, nil); err != nil {
			t.Errorf("ciphertext %d does not open with the shared keys: %v", i, err)
		}
	}
}
