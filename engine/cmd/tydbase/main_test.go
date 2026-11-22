package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func TestCLIVersion(t *testing.T) {
	var stdout, stderr bytes.Buffer
	if err := run([]string{"version"}, &stdout, &stderr); err != nil {
		t.Fatalf("version command failed: %v", err)
	}
	if !strings.Contains(stdout.String(), "tydbase ") {
		t.Fatalf("unexpected version output: %q", stdout.String())
	}
}

func TestCLIOpenAPIExport(t *testing.T) {
	var stdout, stderr bytes.Buffer
	outFile := filepath.Join(t.TempDir(), "openapi.json")

	if err := run([]string{"openapi", "--out", outFile}, &stdout, &stderr); err != nil {
		t.Fatalf("openapi --out failed: %v", err)
	}

	stdout.Reset()
	if err := run([]string{"openapi"}, &stdout, &stderr); err != nil {
		t.Fatalf("openapi stdout failed: %v", err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &parsed); err != nil {
		t.Fatalf("openapi output is not valid JSON: %v", err)
	}
	if _, ok := parsed["openapi"]; !ok {
		t.Fatalf("missing openapi field in exported spec")
	}
}

func TestCLIUnknownCommand(t *testing.T) {
	var stdout, stderr bytes.Buffer
	if err := run([]string{"nope"}, &stdout, &stderr); err == nil {
		t.Fatalf("expected error for unknown command")
	}
}

func TestCLIHealthcheck(t *testing.T) {
	ok := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {}))
	defer ok.Close()
	down := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer down.Close()

	var stdout, stderr bytes.Buffer
	if err := run([]string{"healthcheck", "--url", ok.URL}, &stdout, &stderr); err != nil {
		t.Fatalf("healthy server: %v", err)
	}
	if err := run([]string{"healthcheck", "--url", down.URL}, &stdout, &stderr); err == nil {
		t.Fatal("503 must fail the healthcheck")
	}
	if err := run([]string{"healthcheck", "--url", "http://127.0.0.1:1/api/v1/health"}, &stdout, &stderr); err == nil {
		t.Fatal("unreachable server must fail the healthcheck")
	}
}
