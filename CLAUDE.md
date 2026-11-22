# CLAUDE.md — TydBase

Standing brief for coding agents working in this repository. Read it first, every session.

---

## What this is

**TydBase** is an open-source database workspace and governed MCP gateway. You connect a database
once, and then two things work: teammates get a zero-install browser workspace, and AI clients
(Claude, Codex, Gemini, Cursor) get one policy-governed MCP endpoint. DB passwords never touch a
laptop or an `mcp.json`. Self-hosting is Apache-2.0 and free forever. Revenue comes only from managed
TydBase Cloud.

The product is one Go binary (`tydbase`) with an embedded web UI. The marketing site and waitlist
live in `apps/site` and deploy to Vercel at `tydbase.blivius.com`.

**The owner is Moeen**, a senior engineer and the sole author. Assume fluency. Skip tutorials and go
straight to the specific thing.

---

## Before you write code

1. **Read `docs/00-DECISIONS.md`.** Each decision carries its rationale, and many are negative (things
   deliberately not done). If you are about to propose something a decision rejects, the rationale
   tells you whether you have a real improvement or are reopening a settled question.
2. **Find the current phase and milestone in `docs/01-PLAN.md`.** Implement that milestone only.
3. **The phase's Non-goals are binding.** Work that belongs to a later phase makes this one
   unreviewable.
4. **Stop at the milestone's acceptance criteria.** Report what passes and what doesn't, then wait.
   Do not start the next milestone in the same run.

Business, pricing and GTM live outside the repo in the hub:
`~/Personal/blivius-hq/project-tydbase/docs/tydbase-master-blueprint.md`.

---

## Hard rules

1. **Never run `git add`, `git commit` or `git push`.** Prepare the change, verify it, then stop.
   Moeen reviews and commits. See the handover format below.
2. **Docker first.** Every change is verified by building and running it in Docker Compose
   (`docker/`), always detached (`-d`). Remove temporary verification containers afterwards unless
   asked to keep them.
3. **Chrome before commit lines.** UI changes are exercised in Google Chrome through the
   claude-in-chrome extension (not Playwright). Cover every entry point and state (empty, loading,
   error), 390px width, and a console with 0 errors. New CLI subcommands and API routes are exercised
   by hand too.
4. **All checks pass before handover** (see Verification).
5. **Ask before deciding.** Anything with more than one defensible shape gets a batch of questions
   first. Do not pick a default and mention it afterwards.
6. **No TODO handoffs.** Write the code. Mention a judgment call in one line so it can be redirected.
7. **Secrets are env var names in config, never values.** Trim env values at the boundary.
8. **No `any` in TS. No package-level mutable state in Go.**
9. **Every error says what went wrong and what to do next.** API errors are RFC 9457 problem details
   with an actionable `detail`. Nothing fails silently and exits 0.
10. **No performance or adoption claim without a reproducible number.** No fabricated metrics,
    testimonials or "trusted by" copy anywhere.

---

## Stack

| | |
| --- | --- |
| JS/TS | Bun 1.4.4+ workspaces, Node 26.13.1 (`.nvmrc`). Never npm/pnpm/yarn |
| Lint/format | `oxlint` + `oxfmt`. Never ESLint/Prettier. Go: `gofmt` + `golangci-lint` v2 |
| Site | Next.js 16 (`apps/site`), Tailwind 4, `motion`, PGlite playground, Resend waitlist |
| Web app | Vite + React 19 + TanStack Router SPA (`apps/web`), embedded into the Go binary |
| Engine | Go (`engine/`): Huma v2 + Chi v5, OpenAPI 3.1, Scalar docs at `/docs` |
| Metadata DB | SQLite via `modernc.org/sqlite` (pure Go, `CGO_ENABLED=0`), goose (library) + sqlc. Postgres metadata arrives with Cloud (P6) |
| Target DBs | pgx/v5 first (P1), then MySQL/MariaDB, MSSQL, SQLite/LibSQL, MongoDB, Redis (P4) |
| MCP | Official Go SDK `modelcontextprotocol/go-sdk` |
| SDK | `packages/sdk`: openapi-typescript + openapi-fetch, generated from `engine/openapi.json` |
| Email | Resend via direct `fetch` with `AbortSignal.timeout` and `Idempotency-Key`. Never Loops |
| License | Apache-2.0 |

---

## Commands

```bash
bun install
task check                    # lint, fmt:check, typecheck, test, build (JS + Go)
task sdk:gen                  # export engine OpenAPI → regenerate packages/sdk/src/schema.d.ts
task dev:site                 # site on :3000 (Docker is still the verification path)

docker compose -f docker/compose.yml -f docker/compose.dev.yml up -d --build   # tydbase engine (+ site)
docker compose -f docker/compose.dbs.yml up -d                                  # seeded target DBs
docker compose -f docker/compose.dbs.yml --profile mssql up -d                  # + MSSQL
docker compose -f docker/compose.dbs.yml down -v                                # wipe target DBs
```

---

## Architecture in one page

```
browser (apps/web SPA, embedded) ─┐
AI client (MCP stdio / HTTP) ─────┼─► tydbase binary
                                  │     internal/app        composition root, picks modules per mode
                                  │     internal/platform   config, httpx, store (sqlite), vault, log
                                  │     internal/<module>   workspace, driver, mcp, identity, approval, relay ...
                                  │
                                  └─► target databases (direct TLS, SSH tunnel, or relay agent)
```

Binary modes:
- `tydbase start` binds 127.0.0.1:4800, runs the local workspace with an implicit owner, and keeps its data dir in `os.UserConfigDir()/tydbase`.
- `tydbase server` runs the self-host/Cloud server with auth (P3+). `--modules=` mounts a subset.
- `tydbase mcp` runs local stdio MCP (P2).
- `tydbase agent` runs the outbound relay (P6).
- `tydbase openapi`, `version` and `healthcheck` are utilities.

**Modular monolith.** Each module lives in `engine/internal/<module>/` and exposes a constructor plus
`Register(api huma.API)` (and `Start`/`Stop` only if it owns goroutines). Its implementation sits
under its own nested `internal/`. A module imports only `platform` and its own subtree. Cross-module
calls go through small interfaces that the consumer declares, and `internal/app` adapts between them.
Each module queries only its own tables.

---

## Where things live

```
apps/site/            marketing site, PGlite playground, /demo, waitlist API (Vercel)
apps/web/             workspace SPA (P1), built into engine/internal/webui/dist
packages/ui/          tokens.css, logo, shared components (CodeMirror SQL editor)
packages/sdk/         generated TS client — never edit schema.d.ts by hand
packages/wasm-playground/  PGlite hook + seed for the site
packages/config/      shared tsconfig
engine/               Go module github.com/tydbase/tydbase/engine
  cmd/tydbase/        thin main
  internal/app/       composition root: module registry, health route, boundaries_test.go
  internal/platform/  shared kernel: config, httpx (router + Huma API)
  internal/driver/    engine catalog (+ Driver interface, drivers, pool from P1)
  sql/                goose migrations + sqlc queries (arrive in P1 · M1)
docker/               Dockerfile, Dockerfile.site, compose*.yml, dbs/seed/
docs/                 00-DECISIONS.md, 01-PLAN.md
```

Transition note: until M0.5-d lands, `docker/` is still `deploy/`. Delete this note then.

---

## Verification

Run these in order for every milestone:

1. `bun run fmt:check && bun run lint && bun run typecheck && bun run test`
2. `cd engine && test -z "$(gofmt -l .)" && golangci-lint run && go test -race ./... && go test -count=1 ./internal/app -run Boundaries && govulncheck ./...`
3. `node ~/.claude/skills/hallmark/scripts/sloplint.mjs apps/site/src apps/web/src`
4. Docker: the relevant compose files `up -d --build`. Containers are healthy and logs are clean.
5. Chrome (claude-in-chrome): every entry point and state, 390px, Scalar `/docs` renders, 0 console errors.
6. Write numbered manual test steps for Moeen, give the handover, and stop.

### Handover format

Each milestone gets several chunked commit blocks, one per logical unit of work (never one giant
commit):

```bash
git add path/one path/two && git commit -m "feat(engine): add sqlite store with embedded goose migrations"
git add path/three && git commit -m "test(engine): cover vault tamper detection"
```

- Conventional commits (commitlint enforces them). Each message is one short line with no body and
  no Co-Authored-By.
- Quote paths that contain parentheses or brackets, for zsh.
- A file touched by several units goes, whole, in the first commit where everything it needs to
  compile is present. Say so in one line.

---

## Design system

The web surfaces follow **Hallmark** (`~/.claude/skills/hallmark` + `sloplint.mjs`), **Impeccable**,
**UI/UX Pro Max**, and **Unslop** for copy.

The look matches the TydBase wordmark and Blivius HQ craft (`blivius.com`, `dispach.blivius.com`):
- **Schibsted Grotesk** + **JetBrains Mono**.
- Sharp corners: `0px` plates, `2px` controls.
- Segmented hairline nav rails.
- OKLCH tokens declared in `:root` (`packages/ui/src/tokens.css`) and nowhere else.

Animation and layout rules:
- GPU-only motion with `prefers-reduced-motion` fallbacks.
- No eyebrows, tracked caps, middle-dot strings, purple-blue gradients, card-in-card or fake browser chrome.

---

## Go conventions

- Context first. `slog` with the request ID. Wrap errors with `%w` and match them with `errors.AsType`.
- Use the stdlib before a dependency:
  - `http.CrossOriginProtection` for CSRF.
  - `os.Root` for any data-dir or user-supplied path.
  - `sync.WaitGroup.Go`.
  - `testing/synctest` for anything time-based (pool TTLs, timeouts).
  - `t.Context()` in tests.
- Builds use `CGO_ENABLED=0 -trimpath`, with the version stamped via `-ldflags "-X main.version=..."`.
- Tools: goose is a library (migrations embedded). sqlc will run via `go tool -modfile=tools/go.mod sqlc`
  (the tools module lands with the first sqlc query in P1 · M1). golangci-lint is pinned in CI and
  installed with brew locally.
- Adding a module: create `internal/<name>/` with `Register(huma.API)`, then add it to the `modules`
  table in `internal/app/app.go`. That is all `--modules` needs.
- Driver tests run against real databases: `docker/compose.dbs.yml` locally, testcontainers-go in CI.

---

## Style

- Direct and technical. No preamble and no restating the request.
- Reference code as `path/to/file.go:123`. Lead with the root cause, then the change.
- Give a recommendation, not a menu. If options are unavoidable, rank them.
- State uncertainty plainly. Name the file to check rather than asserting.

---

## Things that are easy to get wrong

- **`packages/sdk` stays on TypeScript 5.9.** openapi-typescript generates through the TS JS API,
  which TS 7 (native) does not ship. The rest of the workspace is on TS 7.
- **`engine/openapi.json` and `packages/sdk/src/schema.d.ts` are both generated and both checked for
  drift in CI.** Change a route, then run `task sdk:gen` and commit both.
- **A Postgres `READ ONLY` transaction is not a sandbox.** It blocks writes, but not `pg_sleep`,
  `pg_terminate_backend`, `dblink`, or expensive scans. `statement_timeout` plus row/byte caps are
  mandatory on every execute. Docs must tell users to connect with a least-privilege role.
- **The SSRF-guarded dialer runs in `server` mode only.** `start` exists to reach localhost DBs, so
  guarding it would break the product.
- **The distroless image has no shell, curl or wget.** The Docker HEALTHCHECK is
  `tydbase healthcheck`.
- **`go:embed all:dist` needs at least one file.** Keep `engine/internal/webui/dist/.gitkeep`
  committed, or a fresh clone won't compile.
- **Module boundaries are invisible to `go build` and `go vet`.** A cross-module import compiles fine.
  Only `internal/app/boundaries_test.go` catches it, and only with `-count=1`, because the test cache
  ignores other packages' sources.
- **`server --modules=` across several containers needs the Postgres metadata backend (P6).** SQLite
  cannot be shared between processes on different hosts.
- **Huma's Scalar renderer loads its JS from unpkg.** An air-gapped self-host sees a blank `/docs`
  page while the API keeps working.
- **Vercel's filesystem is read-only.** The waitlist's JSON fallback is dev-only, and production
  without `RESEND_API_KEY` must fail with 503, not lose signups.
- **Never run `lint-staged` (or the pre-commit hook) yourself.** It stages the files its tasks touch,
  which breaks hard rule 1. To test the hook, run it in a throwaway repo under the scratchpad.
  `engine/openapi.json` is excluded from oxfmt because CI diffs it byte-for-byte against Go's output.
- **Project skills had `Bash(git:*)` stripped from their `allowed-tools`** so git stays behind a
  permission prompt. `bunx skills update` restores upstream files. Re-run
  `sed -i '' -E '/^allowed-tools:/ s/ Bash\(git:\*\)//' .claude/skills/*/SKILL.md` after any update.
- **Paradigm IDs are `sql`, `document`, `kv`, `vector`.** They are wire values in the SDK and catalog.
  Don't rename them.
