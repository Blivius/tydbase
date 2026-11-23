# 01 — Plan

Implement one milestone at a time. A phase's Non-goals are binding. Stop at a milestone's acceptance
criteria, then report and hand over chunked commit blocks (see `CLAUDE.md` → Handover format).

Status: **Pre-Phase ✅ · Phase 0 ✅ · Phase 0.5 ✅ (2026-11-22: CI + Security green, tydbase.blivius.com live on Vercel) · Phase 1 · M1 ✅ · Phase V ← current (2026-11-23: reposition + 14-day landing test; product code paused, decision 5.9)**

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
| M0.5-d Docker | `docker/`: `Dockerfile`, `Dockerfile.site`, `compose.yml`, `compose.dev.yml`, `compose.dbs.yml`, `dbs/seed/*`, `README.md`; delete `deploy/`. Pulled forward from M0.5-e because the image needs them: `tydbase healthcheck` and ldflags version stamping |
| M0.5-e Engine polish | Scalar docs, themed with TydBase tokens; vendor toolbar, AI agent and telemetry off; catalog accuracy + `catalog_test.go` (actionable 404 detail already shipped in M0.5-b). Follow-up for P3: `TYDBASE_PUBLIC_URL` → OpenAPI `servers` so Scalar's curl samples carry a host |
| M0.5-f Waitlist + site basics | Resend errors become actionable server logs (`restricted_api_key` → "needs a Full access key"); warn at startup when `RESEND_NOTIFY_EMAIL` is set without `RESEND_FROM_EMAIL` (no email is sent); `tyd-*` classes into `@layer components` (mobile nav fix); clear the 16 type-aware oxlint warnings (`res.json() as T` → zod parse, real `PGlite` type); fail-closed 503; `x-real-ip` + pruning; 8s timeouts + `allSettled`; Resend API shape verified; tests. OG image, robots, sitemap, `/privacy`, security headers, `not-found` |
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


## Phase V — Reposition and validate (2026-11-23)

**Goal:** find out, in 14 days and before more product code, whether small teams want safe database
access for their coding agents (decision 1.2). The repositioned page is the test.

**Non-goals:** engine work. P1 · M1 (store + vault) is kept as it is.

| Milestone | Scope |
|---|---|
| V0 Docs + public repo | This plan, decisions 1.1–1.3 and 5.1–5.9, CLAUDE.md, README, hub blueprint. Repo transferred to `github.com/blivius/tydbase` (two org owners, branch protection); Go module path `github.com/blivius/tydbase/engine`; full-history gitleaks scan; then public |
| V1 Landing page | Hallmark full redesign in TydBase's own tokens plus Blivius family markers (Newsreader serif, 2px section rules, "TydBase by Blivius" lockup). Hero: the live caught write, a real PGlite transaction showing the row diff and a teammate approval. Sections: problem, how a write gets through (agent / teammate / admin), what exists today (open source, plugins, honest status table), FAQ led by "why not just a read-only role?", closing form. Two-step waitlist: email, then team size + "what worries you". `?ref=` channel tags. PostHog behind a same-origin `/ingest` proxy, off without a key. The old multi-engine playground, architecture, pricing, problem story and `/demo` are deleted |
| V2 Launch + measure | Posts drafted for Moeen to publish: an Ask HN asked as a real question, two Reddit posts (sidebars read first), one X thread. A 20-minute call script. Daily replies to worry stories. Day 14: score the kill criteria and record the outcome here and in decision 5.9 |

**Exit (kill criteria, all within 14 days of the first post):**
- at least 10 signups describe a real worry in free text;
- at least 3 people book a 20-minute call;
- at least half of those stories come from teams of two or more.

Miss any one and TydBase is parked; M1 stays in the repo.

**Test area:** the page at 1280×800, 1920 and 390; the caught-write demo (run, approve, reject,
re-run, WASM failure); the form in every state including step 2, 429 and 503; PostHog requests
same-origin; 0 console errors and no CSP violations.

---

## Phase 1 — Team server MVP (Postgres), starts only if Phase V passes

**Goal:** a small team self-hosts one TydBase server. Each person's coding agent reads Postgres
through the CLI with no password on its machine, and an agent's write runs only after a teammate has
seen the row diff and approved it. Everything is audited with the person and the agent.

**Non-goals:** web UI, MCP, login screens or OAuth, engines other than Postgres, SSH tunnels,
TulipTech projects (until the IP letter exists).

| Milestone | Scope |
|---|---|
| M1 Store + vault ✅ | `platform/store`: SQLite WAL + foreign keys + embedded goose. `platform/vault`: AES-256-GCM envelope with KEK from env or `master.key`. Server boots the platform; Docker data volume `/data` |
| M2 Driver | `Driver` interface with capability flags (`Explain`, `ColumnOrigins`, `DryRun`; decision 5.8). Postgres via pgx/v5: READ ONLY tx, `statement_timeout`, `idle_in_transaction_session_timeout`, row/byte caps with `truncated`, EXPLAIN JSON, column origins (table OID + attnum). Dry-run writes: `BEGIN`, capture before rows + `xmin`, run with `RETURNING`, `ROLLBACK`. Pool keyed by connection with idle TTL (`synctest`). Tests against `compose.dbs.yml` |
| M3 Server core | `tydbase server`; `internal/workspace` (connections, secret via vault, sqlc via `engine/tools/go.mod`); `internal/identity` (people and agents such as `ana/claude-code`, hashed tokens, admin bootstrapped from the CLI); `internal/policy`, one pipeline for every query: EXPLAIN → scope + cost check → execute → mask → audit. Masking defaults for sensitive column names plus explicit `table.column`. Hash-chained audit with person and agent |
| M4 Writes + approvals | `internal/approval`: propose → stored dry-run diff → approve or reject by a different person (self-approval refused) → apply, aborting if any `xmin` changed → audit. Webhook notifier: generic JSON plus Slack and Teams (Workflows) payload shapes |
| M5 CLI + skill | `tydbase login \| query \| describe \| propose \| approve \| status`, output sized for LLM context, errors that tell the agent how to fix the query, results fenced as untrusted data. `tydbase skill install --client claude\|codex\|cursor` writes the skill or AGENTS.md snippet with no credentials |
| M6 TUI | Bubble Tea v2 client of the server API: connections, policy, approval queue with diffs, audit tail. Works at 80×24; teatest coverage |
| M7 Beta release | GoReleaser (darwin/linux, arm64/amd64), Homebrew tap, Docker image, getting-started doc. Onboard the first waitlist teams, then Show HN |

**Acceptance:** two people and two agent tokens on Docker against seeded Postgres:
- an agent reads through the CLI with no database password anywhere on its machine;
- a denied table is invisible to `describe` and rejected in queries;
- a masked column comes back masked, including through an alias;
- a cross join over the cost limit is rejected before it runs; `pg_sleep(60)` is cut off;
- a write is held with its diff, self-approval is refused, a teammate approves, and it applies;
- a row changed between approval and apply aborts the write;
- the webhook reaches a Slack and a Teams channel;
- the audit hash chain verifies;
- at least one outside beta team uses it on a real staging database.

---

## Phase 2 — Web surface (what beta teams ask for first)

**Goal:** the first web surface, chosen from beta feedback. Expected first: an approval page linked
from the webhook message (diff, Approve, Reject), then the workspace views.

**Scope:** sessions and roles (Owner, Admin, Member) with HttpOnly SameSite=Lax cookies and
`http.CrossOriginProtection`; workspace-scoped middleware (zero IDOR); `apps/web` (Vite, TanStack
Router, `@tydbase/ui`, `@tydbase/sdk`) embedded via `internal/webui`; router changes (no CORS,
per-route deadlines, `RealIP` only behind `TYDBASE_TRUSTED_PROXY`, `WriteTimeout: 0`); SDK regen.

**Acceptance:** written at the start of the phase from beta feedback.

---

## Phase 3 — Adapters and engines

**Scope:** a thin MCP adapter (go-sdk, stdio and Streamable HTTP with tokens) over the same
pipeline; the out-of-process plugin protocol (gRPC) with SQLite/LibSQL as plugin #2, then MySQL and
MariaDB in the order teams ask; the SSH tunnel dialer.

**Acceptance:** one shared driver suite passes per engine against `compose.dbs.yml`
(testcontainers in CI); the MCP adapter is driven from a real client.

---

## Phase 4 — Cloud

**Scope:** `tydbase agent` outbound WSS relay; the SSRF-guarded dialer (multi-tenant only); Postgres metadata backend (unlocks multi-container
`--modules`); GitHub OAuth; billing; `app.tydbase.blivius.com`.

**Acceptance:** Cloud reaches a team's private Postgres through the agent with zero open inbound
ports.

---

## Phase 5 — GA

**Scope:** invites and RBAC UI, audit export and retention, docs site, `CHANGELOG.md` and release
notes, cutover to `tydbase.com`.

**Acceptance:** the GA checklist, written at the start of the phase.
