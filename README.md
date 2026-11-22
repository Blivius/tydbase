# TydBase

One zero-install web workspace and governed MCP control plane for SQL, NoSQL, key-value, and vector databases.

Self-host every feature for $0 forever under Apache-2.0, or use managed TydBase Cloud at `app.tydbase.com` (early beta at `tydbase.blivius.com`).

## Monorepo Layout

- `apps/site`: Landing page, interactive browser PostgreSQL sandbox (`PGlite`), MCP guardrail simulator, `/demo` teaser mode, and Resend beta waitlist (`tydbase.blivius.com`).
- `packages/ui`: Shared dark-first design tokens, components, and brand/database vector marks.
- `packages/wasm-playground`: Client-side PostgreSQL WebAssembly engine (`@electric-sql/pglite`) with seeded datasets.
- `packages/config`: Shared TypeScript configuration.
- `engine`: the Go binary (`tydbase`). Today: health, engine catalog, OpenAPI 3.1 export. Drivers, MCP, relay and WASM plugins arrive by phase (`docs/01-PLAN.md`).

## Local Development

Requires **Bun `1.4.4+`** and **Node `26.13.1` LTS** (see `.nvmrc`).

```bash
bun install
bun run dev
```

## Verification

```bash
bun run lint
bun run fmt:check
bun run typecheck
bun run build
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
