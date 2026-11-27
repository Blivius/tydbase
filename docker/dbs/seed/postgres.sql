-- TydBase dev seed for PostgreSQL 17 + pgvector. Runs once, on first container start.
-- Same domain as the site playground (packages/wasm-playground/src/seed.ts), plus real vectors
-- and a 10k-row table for result-grid work.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  last_query_ms INT NOT NULL
);

CREATE TABLE saved_queries (
  id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  engine TEXT NOT NULL,
  env TEXT NOT NULL,
  runs_30d INT NOT NULL
);

CREATE TABLE ai_documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  collection TEXT NOT NULL,
  embedding vector(4) NOT NULL
);
CREATE INDEX ai_documents_embedding_idx ON ai_documents USING hnsw (embedding vector_cosine_ops);

CREATE TABLE query_events (
  id BIGSERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id),
  engine TEXT NOT NULL,
  duration_ms INT NOT NULL,
  rows_returned INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

INSERT INTO workspaces (slug, plan, region, created_at) VALUES
  ('northstar-labs', 'cloud-pro', 'us-east-1', '2026-04-12'),
  ('kestrel-pay', 'cloud-pro', 'eu-central-1', '2026-06-03'),
  ('harbor-ml', 'self-hosted', 'ap-southeast-1', '2026-08-19'),
  ('verve-commerce', 'cloud-hobby', 'us-west-2', '2026-10-05');

INSERT INTO members (workspace_id, full_name, email, role, last_query_ms) VALUES
  (1, 'Ramiro Silva', 'ramiro@northstar.dev', 'owner', 18),
  (1, 'Nadia Haddad', 'nadia@northstar.dev', 'editor', 24),
  (2, 'Soren Lindqvist', 'soren@kestrelpay.io', 'admin', 11),
  (3, 'Tariq Chowdhury', 'tariq@harborml.ai', 'owner', 9),
  (4, 'Elena Park', 'elena@verve.shop', 'viewer', 31);

INSERT INTO saved_queries (workspace_id, title, engine, env, runs_30d) VALUES
  (1, 'Active checkout latency p95', 'postgres', 'production', 412),
  (1, 'Session token TTL sweep', 'redis', 'staging', 198),
  (2, 'Ledger reconciliation audit', 'postgres', 'production', 287),
  (3, 'Top semantic document matches', 'pgvector', 'production', 534),
  (4, 'Abandoned cart payload scan', 'mongodb', 'development', 94);

INSERT INTO ai_documents (title, collection, embedding) VALUES
  ('Relay agent mTLS handshake guide', 'docs_embeddings', '[0.91, 0.12, 0.33, 0.05]'),
  ('WASM PII masker policy spec', 'docs_embeddings', '[0.12, 0.88, 0.21, 0.40]'),
  ('MCP OAuth 2.1 PKCE token flow', 'docs_embeddings', '[0.30, 0.25, 0.90, 0.11]'),
  ('PostgreSQL read-only tx wrapper', 'docs_embeddings', '[0.70, 0.10, 0.45, 0.52]');

-- 10,000 deterministic rows for virtualized-grid and row-cap testing.
INSERT INTO query_events (workspace_id, engine, duration_ms, rows_returned, created_at)
SELECT 1 + (n % 4),
       (ARRAY['postgres', 'mysql', 'mongodb', 'redis'])[1 + (n % 4)],
       5 + (n * 37) % 900,
       (n * 13) % 5000,
       TIMESTAMPTZ '2026-11-01 00:00:00+00' + n * INTERVAL '1 minute'
FROM generate_series(1, 10000) AS n;

-- Customers and orders schema for agent-write testing
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit trigger for orders
CREATE TABLE audit_orders (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_order_change()
RETURNS TRIGGER AS $
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_orders (order_id, action, old_data)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_orders (order_id, action, old_data, new_data)
    VALUES (OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_orders (order_id, action, new_data)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW));
  END IF;
  RETURN NULL;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER audit_order_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_order_change();

-- Table without primary key for testing edge cases
CREATE TABLE log_entries (
  id INT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert sample data
INSERT INTO customers (name, email) VALUES
  ('John Doe', 'john@example.com'),
  ('Jane Smith', 'jane@example.com'),
  ('Bob Johnson', 'bob@example.com');

INSERT INTO orders (customer_id, amount, status) VALUES
  (1, 99.99, 'completed'),
  (1, 49.50, 'pending'),
  (2, 29.99, 'shipped'),
  (3, 199.00, 'completed');

INSERT INTO log_entries (id, level, message) VALUES
  (1, 'info', 'Application started'),
  (2, 'error', 'Database connection failed'),
  (3, 'warn', 'Rate limit approaching');

-- Least-privilege login, the way TydBase docs tell users to connect.
CREATE ROLE tydbase_readonly LOGIN PASSWORD 'tydbase_readonly_dev_password';
GRANT CONNECT ON DATABASE tydbase_dev TO tydbase_readonly;
GRANT USAGE ON SCHEMA public TO tydbase_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tydbase_readonly;
