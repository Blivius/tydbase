## What this changes

<!-- One or two sentences, and the issue it closes: "Closes #123". -->

## How it was verified

<!-- The commands you ran and what they printed. For behaviour, the test that fails without the change. For UI, the states you checked in the browser. -->

- [ ] `task check` (lint, format, typecheck, tests, govulncheck, build)
- [ ] Ran it in Docker (`docker/`)
- [ ] UI: checked every state at desktop and 390px width, console clean
- [ ] A test for new behaviour, which fails with the change reverted

## Contracts

- [ ] No API route changed, or `engine/openapi.json` and `packages/sdk/src/schema.d.ts` are regenerated (`task sdk:gen`)
- [ ] No decision in `docs/00-DECISIONS.md` is reversed, or the doc is updated in this PR
- [ ] Every new error says what went wrong and what to do next
