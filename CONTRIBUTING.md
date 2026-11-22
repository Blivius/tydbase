# Contributing

Thanks for looking. A few things make a change easy to review and merge.

## Before you start

- Read [`docs/00-DECISIONS.md`](docs/00-DECISIONS.md). Many decisions are deliberate "no"s. If your
  idea reverses one, open an issue first so we can discuss it before you write code.
- Check the current phase in [`docs/01-PLAN.md`](docs/01-PLAN.md). Work that belongs to a later phase
  will usually wait.
- Report security problems privately. See [`SECURITY.md`](SECURITY.md).

## Setup

You need Bun 1.4.4+, Node 26.13.1 (`.nvmrc`), Go (see `engine/go.mod`), go-task, Docker, and
golangci-lint v2.

```bash
bun install          # also installs the git hooks
task check           # lint, format check, typecheck, tests, govulncheck, build
```

## Making a change

- Keep one logical change per commit. Messages follow
  [Conventional Commits](https://www.conventionalcommits.org) (`feat(engine): ...`,
  `fix(site): ...`), and the `commit-msg` hook enforces it.
- If you change an API route, run `task sdk:gen` and commit `engine/openapi.json` and
  `packages/sdk/src/schema.d.ts` together. CI fails on drift.
- A module under `engine/internal/` imports only `internal/platform` and its own subtree, and
  `internal/app/boundaries_test.go` enforces that.
- Verify behaviour in Docker (`docker/`), not only with a dev server. For UI changes, check every
  state at desktop and 390px width with a clean console.
- New behaviour needs a test that fails without the change.

## Pull requests

Fill in the template: what changed, how you verified it, and anything a reviewer should look at
first. Small PRs get reviewed faster.

By contributing, you agree that your contributions are licensed under [Apache-2.0](LICENSE).
