export interface SqlPreset {
  id: string;
  label: string;
  description: string;
  sql: string;
}

export const SEED_SQL = `
CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  last_query_ms INT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_queries (
  id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  engine TEXT NOT NULL,
  env TEXT NOT NULL,
  runs_30d INT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  collection TEXT NOT NULL,
  dims INT NOT NULL,
  cosine_score NUMERIC(4, 3) NOT NULL
);

INSERT INTO workspaces (slug, plan, region, created_at) VALUES
  ('northstar-labs', 'cloud-pro', 'us-east-1', '2026-04-12'),
  ('kestrel-pay', 'cloud-pro', 'eu-central-1', '2026-06-03'),
  ('harbor-ml', 'self-hosted', 'ap-southeast-1', '2026-08-19'),
  ('verve-commerce', 'cloud-hobby', 'us-west-2', '2026-10-05')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO members (workspace_id, full_name, email, role, last_query_ms) VALUES
  (1, 'Ramiro Silva', 'ramiro@northstar.dev', 'owner', 18),
  (1, 'Nadia Haddad', 'nadia@northstar.dev', 'editor', 24),
  (2, 'Soren Lindqvist', 'soren@kestrelpay.io', 'admin', 11),
  (3, 'Tariq Chowdhury', 'tariq@harborml.ai', 'owner', 9),
  (4, 'Elena Park', 'elena@verve.shop', 'viewer', 31)
ON CONFLICT (email) DO NOTHING;

INSERT INTO saved_queries (workspace_id, title, engine, env, runs_30d) VALUES
  (1, 'Active checkout latency p95', 'postgres', 'production', 412),
  (1, 'Session token TTL sweep', 'redis', 'staging', 198),
  (2, 'Ledger reconciliation audit', 'postgres', 'production', 287),
  (3, 'Top semantic document matches', 'pgvector', 'production', 534),
  (4, 'Abandoned cart payload scan', 'mongodb', 'development', 94);

INSERT INTO ai_documents (title, collection, dims, cosine_score) VALUES
  ('Relay agent mTLS handshake guide', 'docs_embeddings', 1536, 0.962),
  ('WASM PII masker policy spec', 'docs_embeddings', 1536, 0.941),
  ('MCP OAuth 2.1 PKCE token flow', 'docs_embeddings', 1536, 0.918),
  ('PostgreSQL read-only tx wrapper', 'docs_embeddings', 1536, 0.884);
`;

export const SQL_PRESETS: SqlPreset[] = [
  {
    id: "workspace-queries",
    label: "Workspace query volume",
    description: "Join workspaces with saved queries across engines.",
    sql: `SELECT
  w.slug AS workspace,
  w.plan,
  q.engine,
  q.env,
  q.title,
  q.runs_30d
FROM saved_queries q
JOIN workspaces w ON w.id = q.workspace_id
ORDER BY q.runs_30d DESC;`,
  },
  {
    id: "pii-members",
    label: "Members with email PII",
    description: "Inspect user rows to test live client-side SQL execution.",
    sql: `SELECT
  m.full_name,
  m.email,
  m.role,
  w.slug AS workspace,
  m.last_query_ms
FROM members m
JOIN workspaces w ON w.id = m.workspace_id
ORDER BY m.last_query_ms ASC;`,
  },
  {
    id: "vector-rank",
    label: "Vector similarity top-k",
    description: "Rank embedded chunks by cosine similarity score.",
    sql: `SELECT
  title,
  collection,
  dims,
  cosine_score
FROM ai_documents
WHERE cosine_score > 0.85
ORDER BY cosine_score DESC;`,
  },
  {
    id: "schema-tables",
    label: "Inspect public schema",
    description: "Introspect tables running inside in-browser PostgreSQL WASM.",
    sql: `SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;`,
  },
];
