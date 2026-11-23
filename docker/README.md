# docker/

Every command runs from the repo root. Docker is the verification path for every change.

**Develop on `task up`:** saving any `engine/**/*.go` rebuilds and restarts the engine (~1s), and
saving under `apps/site/src` or `packages/*/src` updates the site live. After changing `package.json`,
`bun.lock`, `next.config.ts` or `go.mod`, run `task up` again to rebuild. **Verify on `task up:prod`**
before handing over. Both stacks read `apps/site/.env` at container creation; it never enters an
image (`.dockerignore`).

| File | Purpose | Command |
| --- | --- | --- |
| `Dockerfile` | Engine. Default target: static binary on distroless, nonroot, `tydbase healthcheck`. `dev` target: air hot reload | — |
| `Dockerfile.site` | Marketing site. Default target: Next standalone (production is Vercel). `dev` target: `next dev` | — |
| `compose.yml` | Production builds (`tydbase` project): engine on `:8080` (read-only rootfs, no capabilities); the site on `:3000` behind the `site` profile | `task up:prod` (self-host engine only: `docker compose -f docker/compose.yml up -d --build`) |
| `compose.dev.yml` | Hot-reload overlay: `dev` targets, `engine/` and the site/package `src` dirs bind-mounted, Go caches in volumes | `task up` |
| `compose.dbs.yml` | Seeded target DBs (`tydbase-dbs` project) | `docker compose -f docker/compose.dbs.yml up -d` |
| `dbs/seed/` | Seeds: workspaces, members, saved queries, pgvector `ai_documents`, 10k-row `query_events`, Mongo carts, Redis keys | run automatically on first start |

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
