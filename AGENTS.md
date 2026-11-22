# AGENTS.md — TydBase

Standing engineering rules for coding agents working in this repository. Read first every session.

## Owner & Working Style
- Owner: Moeen (senior engineer). Assume fluency; skip tutorials and preambles; lead with root causes and exact paths (`path/to/file.ts:line`).
- Assume the shell is already in the repository root. Never prefix user-facing commands with redundant `cd`.
- Do not fabricate metrics, testimonials, or unverified claims. Apply Unslop prose standards (plain active verbs, no LLM clichés).

## Hard Rules (Non-Negotiable)

1. **Never run `git add`, `git commit`, or `git push`.**
   - Prepare changes, verify everything, and stop.
   - At handover, provide exact **chunked** conventional commit commands (`git add <file1> <file2> ... && git commit -m "<conventional commit>"`) subdivided by logical unit of work—never one giant commit for an entire phase. Commit messages must satisfy `commitlint` / Husky conventional commits.

2. **Always verify visually in Google Chrome and test everything locally before handover.**
   - Never guess how UI, animations, or mode switches behave. Boot the app and inspect live renders, interactive clicks, bounding-box stability, and browser console errors (`0` errors) using Google Chrome.
   - Manually exercise every new CLI subcommand, HTTP API route, and interactive UI state before reporting completion. If user interaction is required (e.g., OAuth consent or external secret), say so explicitly.

3. **Prioritize Docker builds and run containers detached.**
   - Always build and test changes inside Docker (`docker compose -f deploy/compose/<file>.yml up -d --build`) rather than relying only on local dev servers.
   - Always pass `-d` (detached) when starting `docker compose` so the CLI is never occupied. Clean up temporary verification containers after testing unless requested to leave them running.

4. **All automated checks must pass before handover.**
   - Run and verify `bun run fmt:check` (`oxfmt`), `bun run lint` (`oxlint`), `bun run typecheck`, `bun run test` (`bun test`), Go tests (when `backend/` exists), and Hallmark `sloplint` on web surfaces before handing over.

## Stack & Service Preferences
- **JS/TS:** Bun (`1.4.4+`) workspaces with Node `26.13.1+` LTS runtime support (never pnpm/yarn). Lint/format with `oxlint` + `oxfmt` (never ESLint/Prettier).
- **Backend:** Go (latest stable) + Huma v2 + Chi v5 + `sqlc` + `goose` + Official Go MCP SDK + `wazero`.
- **Email & Waitlist:** **Resend** (`RESEND_API_KEY`, direct `fetch` with `AbortSignal.timeout` and `Idempotency-Key`; never Loops.so).
- **Licensing:** 100% Free Self-Hosted under `Apache-2.0`; monetize strictly via managed TydBase Cloud (`app.tydbase.com`).

## Design System (Sharp Blivius Craft)
- Follow **Hallmark** (`~/.claude/skills/hallmark` + `sloplint.mjs`), **Impeccable**, and **Unslop**.
- Match TydBase's sharp geometric wordmark and Blivius HQ craft (`blivius.com`, `dispach.blivius.com`): **Schibsted Grotesk** + **JetBrains Mono**, sharp architectural corners (`0px` plates, `2px` controls), segmented hairline nav rails, crisp OKLCH tokens, and zero generic rounded SaaS slop.
