package app_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/blivius/tydbase/engine/internal/app"
	"github.com/blivius/tydbase/engine/internal/platform/config"
)

func TestOpenPlatformCreatesPrivateDataDir(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "tydbase")
	cfg := config.Config{DataDir: dir}

	p, err := app.OpenPlatform(t.Context(), cfg)
	if err != nil {
		t.Fatalf("OpenPlatform: %v", err)
	}
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(dir)
	if err != nil {
		t.Fatal(err)
	}
	if perm := info.Mode().Perm(); perm != 0o700 {
		t.Errorf("data dir mode = %o, want 700", perm)
	}
	for _, name := range []string{"tydbase.db", "master.key"} {
		if _, err := os.Stat(filepath.Join(dir, name)); err != nil {
			t.Errorf("%s not created: %v", name, err)
		}
	}

	// Second boot reuses both.
	p, err = app.OpenPlatform(t.Context(), cfg)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	if err := p.Close(); err != nil {
		t.Fatal(err)
	}
}

func TestOpenPlatformErrorsNameTheFix(t *testing.T) {
	if _, err := app.OpenPlatform(t.Context(), config.Config{}); err == nil ||
		!strings.Contains(err.Error(), "TYDBASE_DATA_DIR") {
		t.Errorf("empty data dir: err = %v, want a TYDBASE_DATA_DIR hint", err)
	}

	dir := t.TempDir()
	_, err := app.OpenPlatform(t.Context(), config.Config{DataDir: dir, MasterKey: "nope"})
	if err == nil || !strings.Contains(err.Error(), "openssl rand") || !strings.Contains(err.Error(), dir) {
		t.Errorf("bad master key: err = %v, want the generate hint and the data dir", err)
	}
}
