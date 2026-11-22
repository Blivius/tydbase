-- +goose Up
-- IDs are UUIDv7 text (time-sortable, unguessable). Timestamps are UTC ISO-8601 text.
-- Each table is owned by one module and only that module queries it (CLAUDE.md, modular
-- monolith). The only cross-module foreign keys point at workspaces.

CREATE TABLE workspaces (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- platform/vault: one data key per workspace, wrapped by the master key (KEK). Deleting a
-- workspace deletes its key, which makes every secret it sealed unrecoverable.
CREATE TABLE vault_deks (
    workspace_id TEXT PRIMARY KEY REFERENCES workspaces (id) ON DELETE CASCADE,
    wrapped      BLOB NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- workspace module. `engine` is a driver catalog id. `secret` is vault ciphertext (the
-- password), sealed with the connection id as associated data so it can't be moved to another row.
CREATE TABLE connections (
    id           TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name         TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
    engine       TEXT NOT NULL,
    host         TEXT NOT NULL,
    port         INTEGER NOT NULL CHECK (port BETWEEN 1 AND 65535),
    database     TEXT NOT NULL,
    username     TEXT NOT NULL,
    secret       BLOB,
    ssl_mode     TEXT NOT NULL DEFAULT 'prefer',
    options      TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(options)),
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (workspace_id, name)
) STRICT;

-- workspace module.
CREATE TABLE saved_queries (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    connection_id TEXT REFERENCES connections (id) ON DELETE SET NULL,
    name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
    sql           TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (workspace_id, name)
) STRICT;

-- Every execute, from the workspace UI or an MCP client, with the full SQL text.
-- connection_id has no foreign key on purpose: the audit trail outlives a deleted connection.
CREATE TABLE query_audit (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    connection_id TEXT NOT NULL,
    source        TEXT NOT NULL CHECK (source IN ('workspace', 'mcp')),
    actor         TEXT NOT NULL,
    sql           TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('ok', 'error', 'rejected', 'timeout')),
    row_count     INTEGER,
    truncated     INTEGER NOT NULL DEFAULT 0 CHECK (truncated IN (0, 1)),
    duration_ms   INTEGER NOT NULL CHECK (duration_ms >= 0),
    error         TEXT,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX query_audit_workspace_created ON query_audit (workspace_id, created_at DESC);

-- +goose Down
DROP TABLE query_audit;
DROP TABLE saved_queries;
DROP TABLE connections;
DROP TABLE vault_deks;
DROP TABLE workspaces;
