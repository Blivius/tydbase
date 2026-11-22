package driver

import (
	"slices"
	"testing"
)

func TestCatalogIsConsistent(t *testing.T) {
	seen := map[string]bool{}
	for _, d := range List() {
		if d.ID == "" || d.Name == "" {
			t.Errorf("descriptor missing id or name: %+v", d)
		}
		if seen[d.ID] {
			t.Errorf("duplicate engine id %q", d.ID)
		}
		seen[d.ID] = true

		if !slices.Contains(Paradigms(), d.Paradigm) {
			t.Errorf("%s: paradigm %q is not one of %v", d.ID, d.Paradigm, Paradigms())
		}
		if d.Status != "tier1" && d.Status != "planned" {
			t.Errorf("%s: status %q must be tier1 or planned (the OpenAPI enum)", d.ID, d.Status)
		}
		if d.DefaultPort < 0 || d.DefaultPort > 65535 {
			t.Errorf("%s: port %d out of range", d.ID, d.DefaultPort)
		}
		if d.Paradigm == ParadigmVector && !d.SupportsVector {
			t.Errorf("%s: a vector-paradigm engine must support vectors", d.ID)
		}

		got, ok := FindByID(d.ID)
		if !ok || got != d {
			t.Errorf("FindByID(%q) = %+v, %v; want the listed descriptor", d.ID, got, ok)
		}
	}
	if _, ok := FindByID("nope"); ok {
		t.Error("FindByID must miss unknown ids")
	}
}

func TestListReturnsACopy(t *testing.T) {
	List()[0].Name = "mutated"
	if List()[0].Name == "mutated" {
		t.Fatal("List must not expose the package catalog for mutation")
	}
}
