# docker/

Every command runs from the repo root. Docker is the verification path for every change.

| File | Purpose | Command |
| --- | --- | --- |
| `Dockerfile` | Engine image: static Go binary on distroless, nonroot, `tydbase healthcheck` | built by `compose.yml` |
| `Dockerfile.site` | Marketing site (Next standalone). Local verification only; production is Vercel | built by `compose.dev.yml` |
| `compose.yml` | Self-host stack (`tydbase` project): engine on `:8080`, read-only rootfs, no capabilities | `docker compose -f docker/compose.yml up -d --build` |
| `compose.dev.yml` | Dev overlay: development env, the site on `:3000` (reads `apps/site/.env`) | `docker compose -f docker/compose.yml -f docker/compose.dev.yml up -d --build` |
| `compose.dbs.yml` | Seeded target DBs (`tydbase-dbs` project) | `docker compose -f docker/compose.dbs.yml up -d` |
| `dbs/seed/` | Seeds: same domain as the site playground, 10k-row `query_events`, pgvector, Mongo carts, Redis keys | run automatically on first start |

## Target databases

| Engine | Host port | Login | Notes |
| --- | --- | --- | --- |
| PostgreSQL 17 + pgvector | 5433 | `tydbase` / `tydbase_dev_password` | also `tydbase_readonly` / `tydbase_readonly_dev_password` (SELECT only) |
| MySQL 8.4 | 3307 | `tydbase` / `tydbase_dev_password` | |
| MariaDB 11.8 | 3308 | `tydbase` / `tydbase_dev_password` | has `VECTOR` |
| MongoDB 8 | 27018 | `tydbase` / `tydbase_dev_password` (admin) | database `tydbase_dev`, collections `workspaces`, `carts` |
| Redis 7 | 6380 | password `tydbase_dev_password` | seeded by the one-shot `redis-seed` |
| SQL Server 2022 | 1434 | `sa` / `TydbaseDevPassword1!` | `--profile mssql`; seeded by `mssql-seed` |

Seeds run only on an empty volume. To re-seed: `docker compose -f docker/compose.dbs.yml down -v`, then `up -d`.

From inside a container (e.g. the engine), use `host.docker.internal:<host port>`.

## Overrides

| Variable | Default | Used by |
| --- | --- | --- |
| `TYDBASE_PORT` | `8080` | published engine port |
| `TYDBASE_VERSION` | `0.1.0` / image tag `local` | `tydbase version`, image tag |
| `TYDBASE_MODULES` | `all` | `server --modules=` |
| `TYDBASE_ENV` | `production` (`development` in dev) | engine |
| `TYDBASE_CORS_ORIGIN` | `http://localhost:3000` | engine (until P1 · M4) |
