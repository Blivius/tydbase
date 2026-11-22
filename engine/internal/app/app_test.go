package app_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"github.com/tydbase/tydbase/engine/internal/app"
	"github.com/tydbase/tydbase/engine/internal/platform/config"
)

var testCfg = config.Config{Port: "8080", Env: "test", CORSOrigin: "http://localhost:3000", Version: "0.1.0-test"}

func get(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil))
	return rec
}

func TestHealth(t *testing.T) {
	h, _ := app.New(testCfg, app.ModuleNames())
	rec := get(t, h, "/api/v1/health")
	if rec.Code != http.StatusOK {
		t.Fatalf("health: got %d: %s", rec.Code, rec.Body)
	}
	var body struct {
		Status    string   `json:"status"`
		Version   string   `json:"version"`
		Paradigms []string `json:"paradigms"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Status != "ok" || body.Version != "0.1.0-test" ||
		!slices.Equal(body.Paradigms, []string{"sql", "document", "kv", "vector"}) {
		t.Fatalf("unexpected health payload: %+v", body)
	}
}

func TestEngines(t *testing.T) {
	h, _ := app.New(testCfg, app.ModuleNames())

	var list struct {
		Total   int               `json:"total"`
		Engines []json.RawMessage `json:"engines"`
	}
	rec := get(t, h, "/api/v1/engines")
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("engines: %d %v", rec.Code, err)
	}
	if list.Total < 7 || len(list.Engines) != list.Total {
		t.Fatalf("engines count: total=%d len=%d", list.Total, len(list.Engines))
	}

	if rec := get(t, h, "/api/v1/engines/postgres"); rec.Code != http.StatusOK {
		t.Fatalf("postgres: got %d", rec.Code)
	}

	miss := get(t, h, "/api/v1/engines/nope")
	if miss.Code != http.StatusNotFound || !strings.Contains(miss.Body.String(), "GET /api/v1/engines") {
		t.Fatalf("unknown engine should 404 and point at the list: %d %s", miss.Code, miss.Body)
	}
}

func TestOpenAPISpec(t *testing.T) {
	h, _ := app.New(testCfg, app.ModuleNames())
	var spec struct {
		OpenAPI string         `json:"openapi"`
		Paths   map[string]any `json:"paths"`
	}
	if err := json.Unmarshal(get(t, h, "/openapi.json").Body.Bytes(), &spec); err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{"/api/v1/health", "/api/v1/engines", "/api/v1/engines/{id}"} {
		if _, ok := spec.Paths[p]; !ok || spec.OpenAPI == "" {
			t.Fatalf("spec missing %s", p)
		}
	}
}

func TestParseModules(t *testing.T) {
	for _, in := range []string{"", "all", " all "} {
		got, err := app.ParseModules(in)
		if err != nil || !slices.Equal(got, app.ModuleNames()) {
			t.Fatalf("ParseModules(%q) = %v, %v", in, got, err)
		}
	}
	if got, err := app.ParseModules("driver, driver"); err != nil || !slices.Equal(got, []string{"driver"}) {
		t.Fatalf("dedupe: %v %v", got, err)
	}
	if _, err := app.ParseModules("driver,relay-typo"); err == nil || !strings.Contains(err.Error(), "driver") {
		t.Fatalf("unknown module must fail and list valid names, got %v", err)
	}
}

func TestModuleSelection(t *testing.T) {
	h, _ := app.New(testCfg, nil) // health only
	if rec := get(t, h, "/api/v1/engines"); rec.Code != http.StatusNotFound {
		t.Fatalf("driver not mounted, expected 404 for /api/v1/engines, got %d", rec.Code)
	}
	if rec := get(t, h, "/api/v1/health"); rec.Code != http.StatusOK {
		t.Fatalf("health is always mounted, got %d", rec.Code)
	}
}

func TestDocsServeThemedScalar(t *testing.T) {
	h, _ := app.New(testCfg, app.ModuleNames())
	rec := get(t, h, "/docs")
	body := rec.Body.String()
	if rec.Code != http.StatusOK || !strings.Contains(body, "@scalar/api-reference") {
		t.Fatalf("/docs should render Scalar, got %d", rec.Code)
	}
	if !strings.Contains(body, "--scalar-color-accent") || !strings.Contains(body, "forceDarkModeState") {
		t.Fatal("/docs should carry the TydBase Scalar theme (customCss + dark mode)")
	}
}
