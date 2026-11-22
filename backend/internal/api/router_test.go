package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tydbase/tydbase/backend/internal/api"
	"github.com/tydbase/tydbase/backend/internal/config"
)

func TestHealthEndpoint(t *testing.T) {
	router, _ := api.New(config.Config{
		Port:       "8080",
		Env:        "test",
		CORSOrigin: "http://localhost:3000",
		Version:    "0.1.0-test",
	})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", rec.Code, rec.Body.String())
	}

	var payload struct {
		Status    string   `json:"status"`
		Service   string   `json:"service"`
		Version   string   `json:"version"`
		Paradigms []string `json:"paradigms"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}
	if payload.Status != "ok" || payload.Service != "tydbase-api" || payload.Version != "0.1.0-test" {
		t.Fatalf("unexpected health payload: %+v", payload)
	}
	if len(payload.Paradigms) != 4 {
		t.Fatalf("expected 4 paradigms, got %d", len(payload.Paradigms))
	}
}

func TestEnginesEndpoints(t *testing.T) {
	router, _ := api.New(config.Load("0.1.0-test"))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/engines", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for /api/v1/engines, got %d", rec.Code)
	}

	var list struct {
		Total   int `json:"total"`
		Engines []struct {
			ID string `json:"id"`
		} `json:"engines"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatalf("failed to decode engines list: %v", err)
	}
	if list.Total < 7 || len(list.Engines) != list.Total {
		t.Fatalf("unexpected engines list count: total=%d len=%d", list.Total, len(list.Engines))
	}

	// Single engine hit
	hitReq := httptest.NewRequest(http.MethodGet, "/api/v1/engines/postgres", nil)
	hitRec := httptest.NewRecorder()
	router.ServeHTTP(hitRec, hitReq)
	if hitRec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for postgres engine, got %d", hitRec.Code)
	}

	// Unknown engine -> 404 RFC 9457 Problem Details
	missReq := httptest.NewRequest(http.MethodGet, "/api/v1/engines/does-not-exist", nil)
	missRec := httptest.NewRecorder()
	router.ServeHTTP(missRec, missReq)
	if missRec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 Not Found for unknown engine, got %d", missRec.Code)
	}
}

func TestOpenAPISpecEndpoint(t *testing.T) {
	router, _ := api.New(config.Load("0.1.0-test"))

	req := httptest.NewRequest(http.MethodGet, "/openapi.json", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 OK for /openapi.json, got %d", rec.Code)
	}

	var spec struct {
		OpenAPI string                 `json:"openapi"`
		Paths   map[string]interface{} `json:"paths"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &spec); err != nil {
		t.Fatalf("failed to parse openapi.json: %v", err)
	}
	if spec.OpenAPI == "" {
		t.Fatalf("expected openapi version in spec")
	}
	if _, ok := spec.Paths["/api/v1/health"]; !ok {
		t.Fatalf("expected /api/v1/health path in OpenAPI spec")
	}
	if _, ok := spec.Paths["/api/v1/engines"]; !ok {
		t.Fatalf("expected /api/v1/engines path in OpenAPI spec")
	}
}
