# 01 — Plan

Implement one milestone at a time. A phase's Non-goals are binding. Stop at a milestone's acceptance
criteria, then report and hand over chunked commit blocks (see `CLAUDE.md` → Handover format).

Status: **Pre-Phase ✅ · Phase 0 ✅ (audited 2026-11-22) · Phase 0.5 ← current (M0.5-a ✅ · M0.5-b ✅)**

---

## Done

- **Pre-Phase:** landing site (`apps/site`), PGlite playground, MCP guardrail simulator, `/demo`,
  Resend waitlist, design tokens.
- **Phase 0:** Go Huma/Chi API (health, engine catalog), OpenAPI → `@tydbase/sdk`, dev DB compose,
  commitlint/husky, CI.

Audit findings (2026-11-22) that feed Phase 0.5:
- 13 commits unpushed, so CI never ran.
- `catalog.go` not gofmt'd, and there is no golangci-lint.
- No SDK drift check.
- `typescript: latest` (7.0.2) next to sdk's 5.9.3.
- The waitlist silently writes to a file in production.
- The rate limiter trusts spoofable XFF and leaks memory.
- 30s × 3 sequential Resend calls.
- The global 30s timeout would kill streaming.
- The catalog overclaims vector support.
- No version stamping.

Docker + Chrome validation (2026-11-22, Step 3):
- The site, playground (all 4 presets, PII toggle), NoSQL tab, MCP simulator (replay → approve), waitlist UI, and `/demo` (scenes, record mode) all work, with 0 console errors.
- **Mobile nav bug.** `globals.css:128` puts `.tyd-nav-rail { display: flex }` outside any cascade layer. Unlayered CSS beats Tailwind v4's `@layer utilities`, so `hidden md:flex` never hides it. Below 768px the links overflow and the "Join beta" CTA is clipped. Fix: move the custom `tyd-*` classes into `@layer components`.
- Prod container without a Resend key answers `201 provider:"local-dev"`, so signups land in a container file. Rotating `X-Forwarded-For` bypassed the limiter: 12 of 12 requests passed with no 429.
- Missing: `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/privacy`, and all security headers.
- Both compose files default to project `compose`, which causes orphan-container warnings. Gemini also left its containers running.
- The engine's 404 detail ("database engine not found") doesn't say what to do. Point it to `GET /api/v1/engines`.

---

## Phase 0.5 — Hardening

**Goal:** a foundation that CI actually checks, an honest repo, Docker as the verification path, and
a live waitlist.

**Non-goals:** new product features (no store, drivers, SPA or MCP).

| Milestone | Scope |
|---|---|
| M0.5-a Toolchain + CI | gofmt; golangci-lint v2 config; CI gofmt + lint + SDK drift; actions bumped and SHA-pinned; `security.yml` (bun audit, govulncheck, gitleaks, zizmor); Bun catalog pins; `bunfig.toml` (`exact`, `minimumReleaseAge`); oxlint aligned with velaops |
| M0.5-b `engine/` rename + modular skeleton | `backend/` → `engine/`; `internal/engine` → `internal/driver`; `internal/app` composition root + `boundaries_test.go`; `internal/platform` (config, httpx); `server --modules=`; all paths updated. `engine/tools/go.mod` for sqlc moves to P1 · M1 (no sqlc query exists yet) |
| M0.5-c Hooks + hygiene | husky pre-commit (lint-staged), pre-push, post-merge; `.editorconfig`; `SECURITY.md`; `CONTRIBUTING.md`; PR + issue templates; root `.env.example`; README rewritten to the truth; `.gitignore` additions |
| M0.5-d Docker | `docker/`: `Dockerfile`, `Dockerfile.site`, `compose.yml`, `compose.dev.yml`, `compose.dbs.yml`, `dbs/seed/*`, `README.md`; delete `deploy/` |
| M0.5-e Engine polish | Scalar docs; ldflags version; `tydbase healthcheck`; catalog accuracy + `catalog_test.go`; actionable 404 details |
| M0.5-f Waitlist + site basics | `tyd-*` classes into `@layer components` (mobile nav fix); clear the 16 type-aware oxlint warnings (`res.json() as T` → zod parse, real `PGlite` type); fail-closed 503; `x-real-ip` + pruning; 8s timeouts + `allSettled`; Resend API shape verified; tests. OG image, robots, sitemap, `/privacy`, security headers, `not-found` |
| M0.5-g Ship | Full Docker + Chrome pass; Moeen pushes; CI + security green; Vercel deploy + prod smoke |

**Acceptance:**
- All checks green locally and in CI.
- `docker compose -f docker/compose.yml -f docker/compose.dev.yml up -d --build` comes up healthy.
- `/docs` renders Scalar.
- The site passes a Chrome walk at 1280/1920/390 with 0 console errors.
- The waitlist returns 400/201/200/429 and 503 in prod-without-key.
- `tydbase.blivius.com` is live.

**Test area:** the site (all playground tabs, MCP simulator, waitlist, `/demo`), engine routes
(`/api/v1/health`, `/api/v1/engines`, a 404 problem response, `/docs`), and seeded target DBs
reachable on their host ports.

---

## Phase 1 — Local workspace

**Goal:** `tydbase start` is a useful Postgres client in the browser.

**Non-goals:** auth, multi-user, engines other than Postgres, MCP, writes, SSH tunnels.

| Milestone | Scope |
|---|---|
| M1 Store + vault | `platform/store`: SQLite WAL + foreign keys + embedded goose (`workspaces`, `connections`, `saved_queries`, `query_audit`). `platform/vault`: AES-256-GCM envelope with KEK from env or `master.key` |
| M2 Driver + pool | `Driver` interface (`Ping`, `Introspect`, `Execute`); pgx/v5 driver with READ ONLY tx, `statement_timeout`, row/byte caps and `truncated` flag; pool keyed by (workspace, connection) with idle TTL (`synctest` tests); testcontainers |
| M3 Workspace API | Connections CRUD + test, schema, query, saved queries; router changes (no CORS, per-route deadlines, `RealIP` only behind `TYDBASE_TRUSTED_PROXY`, `WriteTimeout: 0`); SDK regen |
| M4 SPA + embed | `apps/web` (Vite, TanStack Router, Tailwind 4, `@tydbase/ui`, `@tydbase/sdk`, `@tanstack/react-virtual`); CodeMirror editor moved to `packages/ui`; `internal/webui` with SPA fallback; `start` on 127.0.0.1:4800; image builds web first; TanStack skills wired in |

**Acceptance:** run the Docker image and the `start` binary against seeded Postgres and confirm:
- you can browse the schema;
- a 10k-row result scrolls smoothly;
- `INSERT` is rejected;
- `pg_sleep(60)` is cut off by the timeout;
- the stored secret is ciphertext and still decrypts after a restart.

---

## Phase 2 — Local governed MCP

**Goal:** Claude, Codex, Gemini and Cursor query databases through TydBase with zero credentials in
`mcp.json`.

**Non-goals:** HTTP MCP, OAuth, mutations, approvals.

**Scope:**
- `internal/mcp`, using go-sdk over stdio and reading the store and vault in-process.
- Tools: `list_connections`, `search_schema`, `describe_object`, `execute_read_query`, `explain_query`.
- Every UI and MCP query is written to `query_audit`, and the SPA has an audit view.
- `tydbase mcp install --client claude|codex|gemini|cursor`.

**Acceptance:** real Claude Code lists, searches and queries seeded Postgres through `tydbase mcp`,
and every call shows up in the audit view.

---

## Phase 3 — Server mode + auth

**Goal:** a self-hosted team instance.

**Non-goals:** GitHub/Google OAuth, OAuth 2.1, Postgres metadata, billing.

**Scope:**
- `tydbase server` with `internal/identity`: users, sessions, members, argon2id.
- HttpOnly SameSite=Lax cookie and `http.CrossOriginProtection`.
- Workspace-scoped middleware (actor from context only, zero IDOR).
- Roles: Owner, Admin, Editor, Viewer.
- SSRF dialer in `server` mode only.
- Streamable HTTP `/mcp` with personal access tokens.

**Acceptance:** with 2 users and 2 workspaces running in Docker:
- cross-workspace reads return 404;
- a Viewer cannot edit connections;
- HTTP MCP works with a PAT and is audited.

---

## Phase 4 — Engines

**Goal:** all four paradigms.

**Non-goals:** Qdrant and other Tier-2 engines.

**Scope:**
- MySQL/MariaDB, SQLite/LibSQL and MSSQL drivers.
- MongoDB document explorer, Redis key browser, and pgvector similarity view.
- SSH tunnel dialer.

**Acceptance:** one shared driver test suite passes for every engine against `compose.dbs.yml`
(testcontainers in CI).

---

## Phase 5 — Approvals + Copilot

**Goal:** safe AI writes.

**Non-goals:** managed AI credits.

**Scope:**
- `propose_mutation` feeding an approval state machine (`internal/approval`).
- SSE notifications and an approval UI.
- BYOK copilot (Anthropic, OpenAI, Gemini, Ollama).

**Acceptance:** an AI proposes an UPDATE, a human approves it, it runs, and it is audited end to end.

---

## Phase 6 — Relay + Cloud

**Goal:** the paid product.

**Non-goals:** SSO/SAML, SCIM.

**Scope:**
- `tydbase agent` WSS relay (`internal/relay`).
- Postgres metadata backend, which unlocks multi-container `--modules`.
- GitHub OAuth, and OAuth 2.1 for remote MCP.
- Billing, and `app.tydbase.blivius.com`.

**Acceptance:** Cloud reaches a laptop's Docker DB through the agent with zero open inbound ports.

---

## Phase 7 — WASM, team, GA

**Goal:** launch.

**Scope:**
- wazero PII masker and SQL guardrail plugins.
- Invites and RBAC UI, `Cmd+K`, and the audit viewer.
- Fumadocs docs site and DuckDB-Wasm in the playground.
- GoReleaser + Homebrew, a release workflow, and `CHANGELOG.md`.
- Cutover to `tydbase.com`.

**Acceptance:** the GA checklist (written at the start of the phase).
