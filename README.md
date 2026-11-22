# TydBase

A database workspace and governed MCP gateway. Connect a database once: your team gets a browser
workspace, and AI clients (Claude, Codex, Gemini, Cursor) get one MCP endpoint with read-only
guards, an audit log and write approvals. Database passwords stay off laptops and out of
`mcp.json`.

Self-hosting is free under Apache-2.0, with every feature included. Managed TydBase Cloud is how
the project pays for itself.

> **Status: early.** What runs today is the marketing site with an in-browser PostgreSQL playground,
> and an engine that serves health, the database engine catalog and its OpenAPI spec. The
> workspace, drivers, MCP server, auth and relay land phase by phase: see
> [`docs/01-PLAN.md`](docs/01-PLAN.md).

## Layout

| Path | What it is |
| --- | --- |
| `engine/` | The Go binary `tydbase` (Huma v2 + Chi). A modular monolith: `internal/app` wires modules, `internal/platform` is shared, and each module lives in `internal/<name>` |
| `apps/site/` | Landing page, PGlite playground, MCP guardrail simulator, `/demo`, and the Resend waitlist (`tydbase.blivius.com`) |
| `apps/web/` | The workspace SPA, embedded into the binary (Phase 1) |
| `packages/sdk/` | TypeScript client generated from `engine/openapi.json` |
| `packages/ui/` | Design tokens and shared components |
| `packages/wasm-playground/` | PGlite hook and seed data for the site |
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

Docker is the verification path:

```bash
docker compose -p tydbase-api -f deploy/compose/backend.compose.yml up -d --build
docker compose -p tydbase-site -f deploy/compose/site.compose.yml up -d --build
```

## Contributing and security

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Report vulnerabilities privately as described in
[`SECURITY.md`](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
