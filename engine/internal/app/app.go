// Package app is the composition root. It builds the shared platform, mounts the selected
// modules, and is the only package allowed to import more than one module.
//
// Module contract: each module under internal/<name> exposes a Register(huma.API) (plus a
// constructor taking its dependencies once it has any, and Start/Stop only if it owns
// goroutines). It imports nothing but internal/platform/... and its own subtree; see
// boundaries_test.go. Cross-module calls go through interfaces the consumer declares, and this
// package adapts between them.
package app

import (
	"context"
	"fmt"
	"net/http"
	"runtime"
	"slices"
	"strings"
	"time"

	"github.com/danielgtaylor/huma/v2"

	"github.com/blivius/tydbase/engine/internal/driver"
	"github.com/blivius/tydbase/engine/internal/platform/config"
	"github.com/blivius/tydbase/engine/internal/platform/httpx"
)

// modules maps a --modules name to its route registration, in mount order.
// Phases add entries here: workspace (P1), mcp (P2), identity (P3), approval (P5), relay (P6).
var modules = []struct {
	name     string
	register func(huma.API)
}{
	{"driver", driver.Register},
}

// ModuleNames returns every mountable module name, in mount order.
func ModuleNames() []string {
	names := make([]string, len(modules))
	for i, m := range modules {
		names[i] = m.name
	}
	return names
}

// ParseModules turns a --modules flag value ("all" or a comma-separated list) into module names.
func ParseModules(flag string) ([]string, error) {
	flag = strings.TrimSpace(flag)
	if flag == "" || flag == "all" {
		return ModuleNames(), nil
	}
	valid := ModuleNames()
	var picked []string
	for name := range strings.SplitSeq(flag, ",") {
		name = strings.TrimSpace(name)
		if !slices.Contains(valid, name) {
			return nil, fmt.Errorf("unknown module %q: use \"all\" or a comma-separated list of %s",
				name, strings.Join(valid, ", "))
		}
		if !slices.Contains(picked, name) {
			picked = append(picked, name)
		}
	}
	return picked, nil
}

// HealthOutput is the response for GET /api/v1/health.
type HealthOutput struct {
	Body struct {
		Status    string            `json:"status" example:"ok" doc:"Overall API liveness status."`
		Service   string            `json:"service" example:"tydbase-api" doc:"Service identifier."`
		Version   string            `json:"version" example:"0.1.0" doc:"Build version."`
		Env       string            `json:"env" example:"development" doc:"Runtime environment."`
		GoVersion string            `json:"goVersion" example:"go1.27.4" doc:"Go runtime version."`
		Paradigms []driver.Paradigm `json:"paradigms" doc:"Supported database paradigms."`
		Timestamp string            `json:"timestamp" doc:"UTC RFC3339 timestamp."`
	}
}

// New builds the HTTP handler and API with the health route plus the named modules mounted.
// Names must come from ParseModules.
func New(cfg config.Config, names []string) (http.Handler, huma.API) {
	router, api := httpx.New(cfg)

	huma.Register(api, huma.Operation{
		OperationID: "get-health",
		Method:      http.MethodGet,
		Path:        "/api/v1/health",
		Summary:     "Check API health",
		Description: "Returns service liveness, version, Go runtime, and supported database paradigms.",
		Tags:        []string{"System"},
	}, func(_ context.Context, _ *struct{}) (*HealthOutput, error) {
		resp := &HealthOutput{}
		resp.Body.Status = "ok"
		resp.Body.Service = "tydbase-api"
		resp.Body.Version = cfg.Version
		resp.Body.Env = cfg.Env
		resp.Body.GoVersion = runtime.Version()
		resp.Body.Paradigms = driver.Paradigms()
		resp.Body.Timestamp = time.Now().UTC().Format(time.RFC3339)
		return resp, nil
	})

	for _, m := range modules {
		if slices.Contains(names, m.name) {
			m.register(api)
		}
	}
	return router, api
}
