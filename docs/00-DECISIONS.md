# 00 — Decisions

Each decision has a rationale. Many are negative: things deliberately not done. Before you propose
something a decision rejects, read why it was rejected. Change a decision by editing this file in the
same change that acts on it, with a dated note.

---

## 1. Product and licensing

**1.1 Self-hosting is Apache-2.0 with every feature included. Money comes only from managed Cloud.**
Open-core feature gates split the codebase and cost trust with the self-host audience this product
grows from. Cloud sells operations: hosting, managed relays, retention and AI credits.

**1.2 The differentiator is the governed MCP gateway, not the SQL editor.** Developers rarely pay
for a browser SQL tab. They do adopt a tool that removes DB passwords from laptops and `mcp.json`
files and audits what AI agents run. The roadmap orders work so the MCP path is demoable early
(see 2026-11-22 re-plan, `01-PLAN.md`).

---

## 2. Engine (Go)

**2.1 One Go binary.** The modes are `start`, `server`, `mcp`, `agent`, plus the utilities
`openapi`, `version` and `healthcheck`. A single file is what makes "self-host free forever"
practical: nobody needs Node, Docker or a database just to try it.

**2.2 Modular monolith, splittable later (2026-11-22).**
- `engine/internal/app` is the composition root.
- Each module (`workspace`, `driver`, `mcp`, `identity`, `approval`, `relay`, `plugin`) lives in `internal/<module>/` and hides its implementation under a nested `internal/`.
- Modules import only `internal/platform` and their own subtree, enforced by `internal/app/boundaries_test.go`.
- Cross-module calls go through consumer-declared interfaces that `internal/app` adapts.
- `server --modules=` mounts a subset, so one image can run as several services once the metadata DB can be shared (P6).
- *Rejected:* microservices now. That would add network hops, deploy contention and distributed transactions with one author and zero users. *Rejected:* a generic in-process event bus before a second consumer exists.

**2.3 The directory is `engine/`, not `backend/` (2026-11-22).** The old `internal/engine` package
becomes `internal/driver`, so `engine/internal/engine` never exists.

**2.4 Huma v2 + Chi v5, OpenAPI 3.1 as the contract.** The TS SDK is generated from the spec, and CI
fails on drift in either `openapi.json` or `schema.d.ts`. *Rejected:* hand-written API clients
(the legacy frontend/backend contract mismatches came from exactly that).

**2.5 API docs use Scalar via Huma's built-in renderer.** It is one config line. It loads from unpkg,
so air-gapped hosts see a blank `/docs`. Embed the asset only if an offline user asks.

**2.6 Prefer the stdlib to a dependency:**
- `http.CrossOriginProtection` for CSRF.
- `os.Root` for file paths.
- `testing/synctest` for time-based tests.
- `log/slog`.
- Container-aware GOMAXPROCS (built in, so no automaxprocs).

---

## 3. Data

**3.1 The metadata store is SQLite (`modernc.org/sqlite`, pure Go) until Cloud (2026-11-22).**
- One set of goose migrations and sqlc queries. `CGO_ENABLED=0` stays possible.
- Same model as Grafana, Gitea and PocketBase.
- A Postgres metadata backend arrives in P6, when Cloud needs HA and multiple instances.
- *Rejected:* dual SQLite + Postgres from day one, which doubles every query and migration before anyone needs it. *Rejected:* Postgres everywhere, which kills the zero-dependency binary.

**3.2 Target databases are not the metadata store.** Users' databases are reached through drivers
and never written by TydBase except through an approved mutation (P5).

**3.3 Credentials use an AES-256-GCM envelope vault.**
- Per-workspace DEK, wrapped by a KEK from `TYDBASE_MASTER_KEY` or `<dataDir>/master.key` (0600).
- *Rejected:* storing plaintext, and also never storing (the legacy backend's approach, which forced re-entry on every session).

**3.4 Every execute is bounded:**
- a read-only transaction,
- `statement_timeout`,
- row and byte caps that return `truncated`.

A read-only transaction alone is not a sandbox (see CLAUDE.md hazards).

**3.5 Pools are keyed per (workspace, connection) and have no global singletons.** The legacy
backend's single global connection per engine leaked one user's queries into another's database.

---

## 4. Web

**4.1 `apps/web` is a Vite + React 19 + TanStack Router SPA, embedded via `go:embed` (2026-11-22).**
The SPA is same-origin with the API, so no CORS layer is needed (the Vite dev server proxies
`/api`). *Rejected:* Next.js for the app. A Next server can't be embedded in the binary, and static
export breaks dynamic routes.

**4.2 The editor is CodeMirror 6.** It is shared through `packages/ui` with the site, which already
uses it. *Rejected:* Monaco (heavier). The legacy Monarch grammars are not ported.

**4.3 The site (`apps/site`) stays on Next.js 16 and deploys to Vercel at `tydbase.blivius.com`.**
It is marketing plus a waitlist and never ships inside the binary.

**4.4 There is one design system: tokens in `packages/ui/src/tokens.css`.** Hallmark, Impeccable,
UI/UX Pro Max and Unslop govern every web surface.

---

## 5. Sequencing

**5.1 Local stdio MCP comes before auth (2026-11-22).** `tydbase mcp` reads the local store and vault
in-process, so the USP needs no users, sessions or tokens. Auth arrives with `server` mode in P3.

**5.2 The connectivity order is direct first, then SSH tunnel (P4), then relay agent (P6).**

**5.3 Deferred on purpose:**
- Google OAuth, because GitHub covers the ICP (P6).
- SSO/SAML, until after GA.
- Managed AI credits.
- Qdrant and other Tier-2 engines.
- An event bus.
- RPC between modules.

---

## 6. Tooling

**6.1 Bun workspaces and Node 26.13.1.** *Rejected:* pnpm, yarn and npm.

**6.2 oxlint + oxfmt for TS, gofmt + golangci-lint v2 for Go.** *Rejected:* ESLint, Prettier and Biome
in this repo.

**6.3 `packages/sdk` pins TypeScript 5.9.** openapi-typescript needs the TS JS API, which TS 7
doesn't ship. Everything else uses the workspace catalog's TS.

**6.4 Go tools stay out of the app's `go.mod`.**
- sqlc via `engine/tools/go.mod` (`go tool -modfile=tools/go.mod`).
- goose as a library.
- golangci-lint pinned in CI and installed with brew locally.
- *Rejected:* the `tool` directive in the main `go.mod` (it pulls hundreds of indirect deps).

**6.5 Docker is velaops-style under `docker/`.**
- `Dockerfile` (engine + embedded web, distroless).
- `Dockerfile.site` (local verification only).
- `compose.yml`, `compose.dev.yml`, and `compose.dbs.yml` (seeded target DBs).
- Docker is the verification path for every change.

**6.6 Email is Resend.** *Rejected:* Loops.so.
