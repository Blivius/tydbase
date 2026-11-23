package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/blivius/tydbase/engine/internal/platform/config"
	"github.com/blivius/tydbase/engine/internal/platform/store"
	"github.com/blivius/tydbase/engine/internal/platform/vault"
)

// Platform is the shared kernel modules are built from: the metadata DB and the secret vault.
type Platform struct {
	DB    *sql.DB
	Vault *vault.Vault
}

// OpenPlatform creates the data dir (0700) if needed, opens and migrates tydbase.db, and loads
// the master key. Close it on shutdown.
func OpenPlatform(ctx context.Context, cfg config.Config) (*Platform, error) {
	if cfg.DataDir == "" {
		return nil, errors.New("no data dir: set TYDBASE_DATA_DIR (this OS reports no user config dir)")
	}
	if err := os.MkdirAll(cfg.DataDir, 0o700); err != nil {
		return nil, fmt.Errorf("create data dir %s: %w (set TYDBASE_DATA_DIR to a writable directory)", cfg.DataDir, err)
	}
	root, err := os.OpenRoot(cfg.DataDir)
	if err != nil {
		return nil, fmt.Errorf("open data dir %s: %w", cfg.DataDir, err)
	}
	defer func() { _ = root.Close() }()

	db, err := store.Open(ctx, filepath.Join(cfg.DataDir, store.FileName))
	if err != nil {
		return nil, err
	}
	v, err := vault.New(ctx, db, root, cfg.MasterKey)
	if err != nil {
		return nil, errors.Join(fmt.Errorf("%w (data dir %s)", err, cfg.DataDir), db.Close())
	}
	return &Platform{DB: db, Vault: v}, nil
}

// Close releases the metadata database.
func (p *Platform) Close() error { return p.DB.Close() }
