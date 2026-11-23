# TydBase

Safe database access for your team's AI coding agents, by [Blivius](https://blivius.com).

A team self-hosts one TydBase server that holds the database credentials and the rules. Each
person's agent (Claude Code, Codex, Cursor) reaches Postgres through the `tydbase` CLI and a skill,
with its own token and never the password. Reads are scoped and masked. A write runs as a dry run
and waits until a teammate has seen the row diff and approved it. Every query is recorded with the
person and the agent who ran it. Humans use a terminal UI. Postgres comes first; other databases
arrive as plugins.

Self-hosting is free under Apache-2.0, with every feature included. A managed TydBase Cloud comes
later.

> **Status: validating.** Before building further, we're checking that teams want this: see
> [`docs/01-PLAN.md`](docs/01-PLAN.md) (Phase V). What exists today is the encrypted credential
> vault and metadata store, an engine that serves health, the engine catalog and its OpenAPI spec,
> and the site at [tydbase.blivius.com](https://tydbase.blivius.com). The driver, server, approvals,
> CLI and TUI are planned, not built.

## Layout

| Path | What it is |
| --- | --- |
| `engine/` | The Go binary `tydbase` (Huma v2 + Chi). A modular monolith: `internal/app` wires modules, `internal/platform` is shared, and each module lives in `internal/<name>` |
| `apps/site/` | Landing page with the in-browser caught-write demo (PGlite) and the two-step Resend waitlist (`tydbase.blivius.com`) |
| `apps/web/` | The workspace SPA, embedded into the binary (Phase 2) |
| `packages/sdk/` | TypeScript client generated from `engine/openapi.json` |
| `packages/ui/` | Design tokens and shared components |
| `packages/wasm-playground/` | PGlite caught-write demo hook and seed data for the site |
| `docs/` | Decisions and the phase plan |

## Develop

Requirements: Bun 1.4.4+, Node 26.13.1 (`.nvmrc`), Go (`engine/go.mod`), go-task, Docker, and
golangci-lint v2.

```bash
bun install            # dependencies + git hooks
task check             # lint, format, typecheck, tests, govulncheck, build
task dev:engine        # engine on :8080 (API docs at /docs)
task dev:site          # site on :3000
task sdk:gen           # regenerate the TS SDK after changing an API route
```

Docker is the verification path (details and DB logins in [`docker/README.md`](docker/README.md)):

```bash
task up                # hot reload: engine (air) :8080 + site (next dev) :3000
task up:prod           # production builds, the check before handover
task dbs               # seeded Postgres/pgvector, MySQL, MariaDB, MongoDB, Redis
task down && task dbs:down
```

## Contributing and security

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Report vulnerabilities privately as described in
[`SECURITY.md`](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
