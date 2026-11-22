// Package store opens the SQLite metadata database and applies its embedded goose migrations.
// Modules get the *sql.DB and query only the tables they own (see migrations/).
package store

import (
	"context"
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"net/url"

	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite" // registers the pure-Go "sqlite" driver (CGO_ENABLED=0)
)

//go:embed migrations/*.sql
var migrations embed.FS

// FileName is the database file inside the data dir.
const FileName = "tydbase.db"

// Open opens (creating if needed) the SQLite database at path, sets the per-connection pragmas,
// and migrates it to the latest schema. The caller closes the returned DB.
func Open(ctx context.Context, path string) (*sql.DB, error) {
	// modernc applies every _pragma on each new pool connection, so foreign keys hold everywhere.
	// _txlock=immediate takes the write lock at BEGIN, which avoids SQLITE_BUSY on lock upgrade
	// when `tydbase start` and `tydbase mcp` share the file.
	q := url.Values{}
	q.Add("_pragma", "foreign_keys(1)")
	q.Add("_pragma", "journal_mode(WAL)")
	q.Add("_pragma", "synchronous(NORMAL)")
	q.Add("_pragma", "busy_timeout(5000)")
	q.Set("_txlock", "immediate")

	db, err := sql.Open("sqlite", path+"?"+q.Encode())
	if err != nil {
		return nil, fmt.Errorf("open metadata db %s: %w", path, err)
	}
	if err := db.PingContext(ctx); err != nil {
		return nil, errors.Join(fmt.Errorf("open metadata db %s: %w (check the data dir exists and is writable)", path, err), db.Close())
	}
	if err := migrate(ctx, db); err != nil {
		return nil, errors.Join(err, db.Close())
	}
	return db, nil
}

func migrate(ctx context.Context, db *sql.DB) error {
	fsys, err := fs.Sub(migrations, "migrations")
	if err != nil {
		return fmt.Errorf("migrations: %w", err)
	}
	p, err := goose.NewProvider(goose.DialectSQLite3, db, fsys)
	if err != nil {
		return fmt.Errorf("migrations: %w", err)
	}
	if _, err := p.Up(ctx); err != nil {
		return fmt.Errorf("migrate metadata db: %w (the data dir is unchanged up to the failed migration; restore a backup or open an issue with this error)", err)
	}
	return nil
}
