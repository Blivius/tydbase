package api

import (
	"context"
	"net/http"
	"runtime"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/tydbase/tydbase/backend/internal/config"
	"github.com/tydbase/tydbase/backend/internal/engine"
)

type HealthOutput struct {
	Body struct {
		Status    string            `json:"status" example:"ok" doc:"Overall API liveness status."`
		Service   string            `json:"service" example:"tydbase-api" doc:"Service identifier."`
		Version   string            `json:"version" example:"0.1.0" doc:"Build version."`
		Env       string            `json:"env" example:"development" doc:"Runtime environment."`
		GoVersion string            `json:"goVersion" example:"go1.27.4" doc:"Go runtime version."`
		Paradigms []engine.Paradigm `json:"paradigms" doc:"Supported database paradigms."`
		Timestamp string            `json:"timestamp" doc:"UTC RFC3339 timestamp."`
	}
}

type EnginesOutput struct {
	Body struct {
		Engines []engine.Descriptor `json:"engines" doc:"Supported and planned database engines."`
		Total   int                 `json:"total" doc:"Total number of engines in catalog."`
	}
}

type EngineByIDInput struct {
	ID string `path:"id" doc:"Stable engine identifier (e.g. postgres, mongodb, redis)."`
}

type EngineByIDOutput struct {
	Body engine.Descriptor
}

// New constructs the Chi router and Huma v2 OpenAPI 3.1 API for TydBase.
func New(cfg config.Config) (chi.Router, huma.API) {
	router := chi.NewMux()
	router.Use(middleware.RequestID)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(30 * time.Second))
	router.Use(corsMiddleware(cfg.CORSOrigin))

	humaCfg := huma.DefaultConfig("TydBase API", cfg.Version)
	humaCfg.Info.Description = "Open-source multiplayer database workspace and governed MCP control plane API."
	humaCfg.Info.License = &huma.License{
		Name: "Apache-2.0",
		URL:  "https://www.apache.org/licenses/LICENSE-2.0",
	}

	api := humachi.New(router, humaCfg)

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
		resp.Body.Paradigms = []engine.Paradigm{
			engine.ParadigmSQL,
			engine.ParadigmDocument,
			engine.ParadigmKV,
			engine.ParadigmVector,
		}
		resp.Body.Timestamp = time.Now().UTC().Format(time.RFC3339)
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "list-engines",
		Method:      http.MethodGet,
		Path:        "/api/v1/engines",
		Summary:     "List supported database engines",
		Description: "Returns the unified 4-paradigm engine catalog (SQL, Document, Key-Value, Vector).",
		Tags:        []string{"Engines"},
	}, func(_ context.Context, _ *struct{}) (*EnginesOutput, error) {
		engines := engine.List()
		resp := &EnginesOutput{}
		resp.Body.Engines = engines
		resp.Body.Total = len(engines)
		return resp, nil
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-engine",
		Method:      http.MethodGet,
		Path:        "/api/v1/engines/{id}",
		Summary:     "Get a database engine descriptor",
		Description: "Returns capabilities and metadata for a single database engine by ID.",
		Tags:        []string{"Engines"},
	}, func(_ context.Context, input *EngineByIDInput) (*EngineByIDOutput, error) {
		desc, ok := engine.FindByID(input.ID)
		if !ok {
			return nil, huma.Error404NotFound("database engine not found")
		}
		return &EngineByIDOutput{Body: desc}, nil
	})

	return router, api
}

func corsMiddleware(origin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
			w.Header().Set("Vary", "Origin")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
