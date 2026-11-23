package app_test

import (
	"os/exec"
	"strings"
	"testing"
)

const internalPrefix = "github.com/blivius/tydbase/engine/internal/"

// owner returns the top-level unit under internal/ ("app", "platform", "driver", ...) or "" for
// packages outside internal/ (cmd/...).
func owner(pkg string) string {
	rest, ok := strings.CutPrefix(pkg, internalPrefix)
	if !ok {
		return ""
	}
	name, _, _ := strings.Cut(rest, "/")
	return name
}

// TestBoundaries enforces the modular-monolith rules that the compiler does not:
//   - a module imports only internal/platform/... and its own subtree;
//   - internal/platform imports no module;
//   - cmd/... imports only internal/app and internal/platform;
//   - internal/app may import anything (it is the composition root).
//
// Run with -count=1: the test cache does not notice import changes in other packages.
func TestBoundaries(t *testing.T) {
	out, err := exec.CommandContext(t.Context(), "go", "list",
		"-f", `{{.ImportPath}}|{{join .Imports ","}}`, "../../...").CombinedOutput()
	if err != nil {
		t.Fatalf("go list failed: %v\n%s", err, out)
	}

	for line := range strings.SplitSeq(strings.TrimSpace(string(out)), "\n") {
		pkg, imports, _ := strings.Cut(line, "|")
		from := owner(pkg)
		if from == "app" {
			continue
		}
		for imp := range strings.SplitSeq(imports, ",") {
			to := owner(imp)
			if to == "" || to == from || to == "platform" {
				continue
			}
			if from == "" && to == "app" { // cmd/... → app is the intended entry point
				continue
			}
			t.Errorf("%s imports %s: modules may import only internal/platform and their own subtree; "+
				"declare an interface in the consumer and wire it in internal/app", pkg, imp)
		}
	}
}
