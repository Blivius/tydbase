// Staged files only, and fast: format, then lint with fixes. Type-aware rules need the whole
// program, so they run in pre-push and CI (`bun run lint`), not here.
//
// Generated files are never reformatted: engine/openapi.json is Go's byte-exact output and CI
// diffs it. Markdown is left alone (oxfmt re-pads tables into noisy diffs).
const GENERATED = ["engine/openapi.json"];
const quote = (files) => files.map((f) => JSON.stringify(f)).join(" ");

export default {
  "*.{js,jsx,ts,tsx,mjs,cjs}": [
    "oxfmt --config .oxfmtrc.json --no-error-on-unmatched-pattern",
    "oxlint --config .oxlintrc.json --fix",
  ],
  "*.{json,css}": (files) => {
    const own = files.filter((f) => !GENERATED.some((g) => f.endsWith(g)));
    return own.length > 0
      ? [`oxfmt --config .oxfmtrc.json --no-error-on-unmatched-pattern ${quote(own)}`]
      : [];
  },
  "engine/**/*.go": ["gofmt -w"],
};
