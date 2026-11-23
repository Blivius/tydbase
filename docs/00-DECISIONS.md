# 00 — Decisions

Each decision has a rationale. Many are negative: things deliberately not done. Before you propose
something a decision rejects, read why it was rejected. Change a decision by editing this file in the
same change that acts on it, with a dated note.

---

## 1. Product and licensing

**1.1 Self-hosting is Apache-2.0 with every feature included. Money comes only from managed Cloud.**
Open-core feature gates split the codebase and cost trust with the self-host audience this product
grows from. Cloud sells operations: hosting, managed relays, retention and AI credits.
*Re-checked 2026-11-23 and kept.* The known risk: a gate in front of production databases is what
careful teams self-host, so Cloud-only revenue may be thin. Revisit with beta data, and never as a
surprise relicence after launch. *Rejected for now:* mirroring Dispach's Apache core + FSL split.

**1.2 The differentiator is a governed access layer for small teams' coding agents (rewritten
2026-11-23).** Agents (Claude Code, Codex, Cursor) reach shared databases through TydBase and never
hold the password. Reads are scoped and masked, writes run as a dry run and wait for a teammate's
approval with the row diff in front of them, and every query is audited with the person and the
agent. The wedge is developer experience for teams of 2–30: one self-hosted binary, a CLI and skill
for agents, a terminal UI for humans. Neighbours already cover parts of this (hoop.dev, Formal,
Teleport, StrongDM, Bytebase DBHub, Google MCP Toolbox, polycore/pg-dry-run), so the combination and
its craft are the product. *Rejected:* MCP as the product (it is one adapter, P3); the 2023
every-database browser client (a crowded, shrinking market); any "first" or "only" claim.

**1.3 Brand and home (2026-11-23).** "TydBase by Blivius", next to Dispach under the Blivius "hard
limits for autonomous software" story. The repo lives at `github.com/blivius/tydbase`, public, and
the org keeps two owners so one locked account can't strand it.

---

## 2. Engine (Go)

**2.1 One Go binary.** It is the server (`server`), the CLI agents call (`query`, `propose`,
`approve` and the rest), the TUI (no arguments), and later `mcp` (P3) and the relay `agent` (P4),
plus the utilities `openapi`, `version` and `healthcheck`. A single file is what makes "self-host free forever"
practical: nobody needs Node, Docker or a database just to try it.

**2.2 Modular monolith, splittable later (2026-11-22).**
- `engine/internal/app` is the composition root.
- Each module (`workspace`, `driver`, `policy`, `identity`, `approval`, later `mcp`, `relay`) lives in `internal/<module>/` and hides its implementation under a nested `internal/`.
- Modules import only `internal/platform` and their own subtree, enforced by `internal/app/boundaries_test.go`.
- Cross-module calls go through consumer-declared interfaces that `internal/app` adapts.
- `server --modules=` mounts a subset, so one image can run as several services once the metadata DB can be shared (P4).
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
- A Postgres metadata backend arrives in P4, when Cloud needs HA and multiple instances.
- *Rejected:* dual SQLite + Postgres from day one, which doubles every query and migration before anyone needs it. *Rejected:* Postgres everywhere, which kills the zero-dependency binary.

**3.2 Target databases are not the metadata store.** Users' databases are reached through drivers
and never written by TydBase except through an approved write (P1 · M4, decision 5.6).

**3.3 Credentials use an AES-256-GCM envelope vault.**
- Per-workspace DEK, wrapped by a KEK from `TYDBASE_MASTER_KEY` or `<dataDir>/master.key` (0600).
- With neither set, both `start` and `server` generate `master.key` on first boot, but only while no
  DEK exists. With secrets present, a missing or mismatched key refuses to boot (2026-11-22).
- Ciphertexts are bound to their workspace and owner (for example the connection id) as GCM
  associated data, so a ciphertext copied to another row fails to open. Deleting a workspace deletes
  its DEK, which shreds its secrets.
- *Rejected:* storing plaintext, and also never storing (the legacy backend's approach, which forced re-entry on every session).

**3.4 Every execute is bounded:**
- a read-only transaction,
- `statement_timeout`,
- row and byte caps that return `truncated`.

A read-only transaction alone is not a sandbox (see CLAUDE.md hazards).

**3.5 Pools are keyed per (workspace, connection) and have no global singletons.** The legacy
backend's single global connection per engine leaked one user's queries into another's database.

**3.6 Data dir and IDs (2026-11-22).**
- One `TYDBASE_DATA_DIR`, defaulting to `os.UserConfigDir()/tydbase` in every mode. The Docker
  image sets `/data` on the `tydbase-data` volume.
- Primary keys are UUIDv7 text from the stdlib `uuid` package: time-sortable, unguessable in URLs,
  and unchanged when the Postgres backend lands. *Rejected:* integer autoincrement.

**3.7 `query_audit` keeps the full SQL text (2026-11-22).** Governance is the product: you can see
exactly what an AI ran. Literals may hold PII, so retention and redaction become a setting later.
*Rejected:* storing only literal-redacted SQL.

---

## 4. Web

**4.1 `apps/web` is a Vite + React 19 + TanStack Router SPA, embedded via `go:embed` (2026-11-22).**
The SPA is same-origin with the API, so no CORS layer is needed (the Vite dev server proxies
`/api`). *Rejected:* Next.js for the app. A Next server can't be embedded in the binary, and static
export breaks dynamic routes.

**4.2 The editor is CodeMirror 6 (P2).** It lives in `packages/ui` once `apps/web` needs it; the site
dropped its old playground editor on 2026-11-23 (git history has `sql-code-editor.tsx`).
*Rejected:* Monaco (heavier). The legacy Monarch grammars are not ported.

**4.3 The site (`apps/site`) stays on Next.js 16 and deploys to Vercel at `tydbase.blivius.com`.**
It is marketing plus a waitlist and never ships inside the binary.

**4.4 There is one design system: tokens in `packages/ui/src/tokens.css`.** Hallmark, Impeccable,
UI/UX Pro Max and Unslop govern every web surface.

---

## 5. Sequencing

**5.1 A minimal team server comes first (superseded 2026-11-23).** One self-hosted `tydbase server`
holds the credentials and the policy; the admin issues hashed tokens per person and per agent from
the CLI. Login screens, sessions, OAuth and SSO wait. *Was (2026-11-22):* local stdio MCP before
auth, which served one developer when the problem belongs to teams.

**5.2 The connectivity order is direct first, then SSH tunnel (P3), then relay agent (P4).**

**5.3 Deferred on purpose:**
- Google OAuth, because GitHub covers the ICP (P4).
- SSO/SAML, until after GA.
- Managed AI credits and the BYOK copilot.
- Every target engine but Postgres, until the plugin protocol (P3).
- The web UI, until beta teams say which surface they need first (P2).
- An event bus.
- RPC between modules.

**5.4 Phase 1 is a team server for Postgres only (2026-11-23).** Governance is still the product
(credential custody, scope, masking, cost guards, identity, tamper-evident audit), and approved
writes move into Phase 1 because they are the part a read-only role can't give you. *Rejected:*
SQLite as a P1 target. A server can't reach a file on someone's laptop, and SQLite isn't a
database a team shares; it returns with LibSQL as plugin #2.

**5.5 Humans use a terminal UI that is a client of the server API (updated 2026-11-23).** Bubble
Tea v2 for connections, policy, the approval queue with diffs, and the audit tail. *Rejected:* a
config file with password env refs (puts secrets back in the shell), and the web UI first.

**5.6 Policy decisions use the database's own planner (2026-11-23).** Scope checks and the cost
guard read `EXPLAIN` output (Postgres `FORMAT JSON`), and masking follows result column origins
(pgx table OID + attnum), so aliases can't dodge a rule. A write's dry run is a transaction:
capture the before rows and their `xmin`, run the statement with `RETURNING`, roll back. Applying
an approved write aborts if any `xmin` changed since the diff was shown. No SQL parser: the good
Postgres one (`pg_query`) needs cgo, and parsing SQL ourselves is how guardrails get bypassed.

**5.7 Agents get a CLI and a skill; MCP is an adapter (2026-11-23).** Coding agents already drive a
shell well, and MCP tool definitions cost context on every turn. `tydbase query | describe |
propose | status` with compact output, plus `tydbase skill install` writing the skill or AGENTS.md
snippet. Approval notices go out as one generic webhook with Slack and Teams (Workflows) payload
shapes. *Rejected:* MCP-first, and Slack interactive buttons before Cloud (they need a public
callback, awkward for self-hosting).

**5.8 Plugins: interface now, protocol at engine #2 (2026-11-23).** P1 defines an in-process Go
`Driver` interface with capability flags (`Explain`, `ColumnOrigins`, `DryRun`), because governance
depends on engine internals that differ per database. The out-of-process plugin protocol (gRPC, as
Vault's database plugins and Terraform providers do) ships with the second engine, when there is
something to design it against. *Rejected:* designing the protocol against one engine; WebAssembly
drivers (WASI can't easily open database connections; WASM stays for pure functions like maskers).

**5.9 Validate before building (2026-11-23).** Product code pauses after P1 · M1 while a
repositioned landing page runs a 14-day test. TydBase continues only if all three hold: at least 10
free-text worry stories, at least 3 calls booked, and at least half of the stories from teams of two
or more. Otherwise it is parked. Show HN waits for an installable CLI (its rules exclude sign-up
pages). Outcome: *pending*.

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
