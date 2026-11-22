// Package httpx builds the shared HTTP stack: the Chi router, its middleware, and the Huma API
// that every module registers its operations on.
package httpx

import (
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humachi"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/tydbase/tydbase/engine/internal/platform/config"
)

// New returns the router and the Huma API for TydBase.
func New(cfg config.Config) (chi.Router, huma.API) {
	router := chi.NewMux()
	router.Use(middleware.RequestID)
	router.Use(middleware.Recoverer)
	// ponytail: global deadline until P1 · M3 moves to per-route deadlines (SSE/streaming needs that).
	router.Use(middleware.Timeout(30 * time.Second))
	// ponytail: single-origin CORS until P1 · M4 embeds the SPA same-origin and this goes away.
	router.Use(cors(cfg.CORSOrigin))

	humaCfg := huma.DefaultConfig("TydBase API", cfg.Version)
	humaCfg.Info.Description = "Open-source multiplayer database workspace and governed MCP control plane API."
	humaCfg.Info.License = &huma.License{
		Name: "Apache-2.0",
		URL:  "https://www.apache.org/licenses/LICENSE-2.0",
	}

	return router, humachi.New(router, humaCfg)
}

func cors(origin string) func(http.Handler) http.Handler {
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
