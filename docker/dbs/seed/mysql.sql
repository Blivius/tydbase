-- TydBase dev seed for MySQL 8.4 and MariaDB 11.8 (one file, portable SQL).
-- Runs once, on first container start, in database tydbase_dev.

CREATE TABLE workspaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) UNIQUE NOT NULL,
  plan VARCHAR(32) NOT NULL,
  region VARCHAR(32) NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspace_id INT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) UNIQUE NOT NULL,
  role VARCHAR(16) NOT NULL,
  last_query_ms INT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE query_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  workspace_id INT NOT NULL,
  engine VARCHAR(16) NOT NULL,
  duration_ms INT NOT NULL,
  rows_returned INT NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
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

-- 10,000 rows from a digits cross join (no recursive CTE: MySQL and MariaDB cap them differently).
CREATE TABLE digits (d INT PRIMARY KEY);
INSERT INTO digits VALUES (0), (1), (2), (3), (4), (5), (6), (7), (8), (9);
INSERT INTO query_events (workspace_id, engine, duration_ms, rows_returned, created_at)
SELECT 1 + (n % 4),
       ELT(1 + (n % 4), 'postgres', 'mysql', 'mongodb', 'redis'),
       5 + (n * 37) % 900,
       (n * 13) % 5000,
       TIMESTAMP '2026-11-01 00:00:00' + INTERVAL n MINUTE
FROM (
  SELECT a.d + 10 * b.d + 100 * c.d + 1000 * e.d + 1 AS n
  FROM digits a, digits b, digits c, digits e
) AS seq;
DROP TABLE digits;
