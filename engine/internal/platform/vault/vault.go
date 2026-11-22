// Package vault encrypts connection secrets with an AES-256-GCM envelope.
//
// Each workspace has a random data key (DEK) stored in vault_deks, wrapped by the master key
// (KEK). The KEK comes from TYDBASE_MASTER_KEY or <dataDir>/master.key and never touches the
// database, so a copy of tydbase.db alone decrypts nothing. Rotating the KEK only re-wraps DEKs.
package vault

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"strings"
)

// KeyFile is the master key's file name inside the data dir.
const KeyFile = "master.key"

const keySize = 32 // AES-256

// ErrDecrypt means a ciphertext failed authentication: it was tampered with, or sealed for a
// different workspace or associated data.
var ErrDecrypt = errors.New("vault: ciphertext failed authentication (tampered, or sealed for another workspace or field)")

// Vault seals and opens secrets per workspace. It is safe for concurrent use.
type Vault struct {
	db  *sql.DB
	kek cipher.AEAD
}

// New loads the master key and verifies it against the stored data keys.
//
// envKey is TYDBASE_MASTER_KEY (base64 of 32 bytes) and wins when set. Otherwise the key is read
// from master.key in dataDir. With neither, a new master.key (0600) is generated, but only while
// no data key exists: generating a fresh key over existing secrets would make them unreadable.
func New(ctx context.Context, db *sql.DB, dataDir *os.Root, envKey string) (*Vault, error) {
	var deks int
	if err := db.QueryRowContext(ctx, "SELECT count(*) FROM vault_deks").Scan(&deks); err != nil {
		return nil, fmt.Errorf("vault: read data keys: %w", err)
	}

	key, err := loadKey(dataDir, strings.TrimSpace(envKey), deks > 0)
	if err != nil {
		return nil, err
	}
	kek, err := newAEAD(key)
	if err != nil {
		return nil, err
	}
	v := &Vault{db: db, kek: kek}

	if deks > 0 {
		var ws string
		var wrapped []byte
		if err := db.QueryRowContext(ctx, "SELECT workspace_id, wrapped FROM vault_deks LIMIT 1").Scan(&ws, &wrapped); err != nil {
			return nil, fmt.Errorf("vault: read data keys: %w", err)
		}
		if _, err := v.unwrap(ws, wrapped); err != nil {
			return nil, errors.New("vault: the master key does not match the one that encrypted this data dir; " +
				"restore the original master.key or TYDBASE_MASTER_KEY (secrets can't be recovered without it)")
		}
	}
	return v, nil
}

// Seal encrypts plaintext for a workspace, creating the workspace's data key on first use.
// aad binds the ciphertext to its owner (for example the connection id): Open needs the same aad.
func (v *Vault) Seal(ctx context.Context, workspaceID string, plaintext, aad []byte) ([]byte, error) {
	dek, err := v.dataKey(ctx, workspaceID, true)
	if err != nil {
		return nil, err
	}
	return dek.Seal(nil, nil, plaintext, bind(workspaceID, aad)), nil //nolint:gosec // G407 false positive: NewGCMWithRandomNonce requires a nil nonce and generates its own
}

// Open decrypts a ciphertext produced by Seal with the same workspace and aad.
func (v *Vault) Open(ctx context.Context, workspaceID string, ciphertext, aad []byte) ([]byte, error) {
	dek, err := v.dataKey(ctx, workspaceID, false)
	if err != nil {
		return nil, err
	}
	plaintext, err := dek.Open(nil, nil, ciphertext, bind(workspaceID, aad))
	if err != nil {
		return nil, ErrDecrypt
	}
	return plaintext, nil
}

func (v *Vault) dataKey(ctx context.Context, workspaceID string, create bool) (cipher.AEAD, error) {
	const query = "SELECT wrapped FROM vault_deks WHERE workspace_id = ?"
	var wrapped []byte
	err := v.db.QueryRowContext(ctx, query, workspaceID).Scan(&wrapped)
	if errors.Is(err, sql.ErrNoRows) && create {
		key := make([]byte, keySize)
		_, _ = rand.Read(key) // crypto/rand.Read never returns an error
		// DO NOTHING keeps the first DEK when two callers race; both then read the winner.
		_, err = v.db.ExecContext(ctx,
			"INSERT INTO vault_deks (workspace_id, wrapped) VALUES (?, ?) ON CONFLICT (workspace_id) DO NOTHING",
			workspaceID, v.kek.Seal(nil, nil, key, dekAAD(workspaceID))) //nolint:gosec // G407: see Seal
		if err != nil {
			return nil, fmt.Errorf("vault: create data key for workspace %s: %w (does the workspace exist?)", workspaceID, err)
		}
		err = v.db.QueryRowContext(ctx, query, workspaceID).Scan(&wrapped)
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("vault: workspace %s has no data key, so nothing was sealed for it", workspaceID)
	}
	if err != nil {
		return nil, fmt.Errorf("vault: read data key for workspace %s: %w", workspaceID, err)
	}
	key, err := v.unwrap(workspaceID, wrapped)
	if err != nil {
		return nil, err
	}
	return newAEAD(key)
}

func (v *Vault) unwrap(workspaceID string, wrapped []byte) ([]byte, error) {
	key, err := v.kek.Open(nil, nil, wrapped, dekAAD(workspaceID))
	if err != nil {
		return nil, fmt.Errorf("vault: data key for workspace %s: %w", workspaceID, ErrDecrypt)
	}
	return key, nil
}

func loadKey(dataDir *os.Root, envKey string, haveSecrets bool) ([]byte, error) {
	if envKey != "" {
		return decodeKey(envKey, "TYDBASE_MASTER_KEY")
	}

	raw, err := dataDir.ReadFile(KeyFile)
	if err == nil {
		return decodeKey(string(raw), KeyFile)
	}
	if !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("vault: read %s: %w", KeyFile, err)
	}
	if haveSecrets {
		return nil, fmt.Errorf("vault: %s is missing and TYDBASE_MASTER_KEY is unset, but this data dir holds encrypted secrets; "+
			"restore the original key (secrets can't be recovered without it)", KeyFile)
	}

	key := make([]byte, keySize)
	_, _ = rand.Read(key) // crypto/rand.Read never returns an error
	// Write a synced temp file, then hard-link it into place. Link fails if master.key exists, so
	// when `tydbase start` and `tydbase mcp` boot together exactly one key wins, and the loser
	// never reads a half-written file.
	tmp := KeyFile + ".tmp-" + rand.Text()
	defer func() { _ = dataDir.Remove(tmp) }()
	if err := writeSynced(dataDir, tmp, base64.StdEncoding.EncodeToString(key)+"\n"); err != nil {
		return nil, fmt.Errorf("vault: create %s: %w (is the data dir writable?)", KeyFile, err)
	}
	err = dataDir.Link(tmp, KeyFile)
	if errors.Is(err, fs.ErrExist) {
		return loadKey(dataDir, "", haveSecrets)
	}
	if err != nil {
		return nil, fmt.Errorf("vault: create %s: %w", KeyFile, err)
	}
	return key, nil
}

func writeSynced(root *os.Root, name, data string) error {
	f, err := root.OpenFile(name, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return err
	}
	_, werr := f.WriteString(data)
	return errors.Join(werr, f.Sync(), f.Close())
}

func decodeKey(s, source string) ([]byte, error) {
	key, err := base64.StdEncoding.DecodeString(strings.TrimSpace(s))
	if err != nil || len(key) != keySize {
		return nil, fmt.Errorf("vault: %s must be base64 of exactly %d random bytes; generate one with `openssl rand -base64 32`", source, keySize)
	}
	return key, nil
}

func newAEAD(key []byte) (cipher.AEAD, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("vault: %w", err)
	}
	// Random 96-bit nonce per Seal, prepended to the ciphertext. Safe for well under 2^32
	// seals per key, which a per-workspace DEK sealing connection secrets never approaches.
	return cipher.NewGCMWithRandomNonce(block)
}

// bind prefixes the caller's aad with the workspace id (UUIDs never contain NUL), so a
// ciphertext copied into another workspace fails to open even if the DEKs were somehow equal.
func bind(workspaceID string, aad []byte) []byte {
	return append([]byte(workspaceID+"\x00"), aad...)
}

func dekAAD(workspaceID string) []byte { return []byte("tydbase/dek\x00" + workspaceID) }
