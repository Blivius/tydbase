// Package driver owns the database engine catalog and, from Phase 1, the Driver interface,
// the per-engine drivers, and the connection pool.
package driver

import (
	"context"
	"fmt"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
)

// EnginesOutput is the response for GET /api/v1/engines.
type EnginesOutput struct {
	Body struct {
		Engines []Descriptor `json:"engines" doc:"Supported and planned database engines."`
		Total   int          `json:"total" doc:"Total number of engines in catalog."`
	}
}

// EngineByIDInput is the path input for GET /api/v1/engines/{id}.
type EngineByIDInput struct {
	ID string `path:"id" doc:"Stable engine identifier (e.g. postgres, mongodb, redis)."`
}

// EngineByIDOutput is the response for GET /api/v1/engines/{id}.
type EngineByIDOutput struct {
	Body Descriptor
}

// Paradigms lists the four data paradigms in a stable order.
func Paradigms() []Paradigm {
	return []Paradigm{ParadigmSQL, ParadigmDocument, ParadigmKV, ParadigmVector}
}

// Register mounts the driver module's routes.
func Register(api huma.API) {
	huma.Register(api, huma.Operation{
		OperationID: "list-engines",
		Method:      http.MethodGet,
		Path:        "/api/v1/engines",
		Summary:     "List supported database engines",
		Description: "Returns the unified 4-paradigm engine catalog (SQL, Document, Key-Value, Vector).",
		Tags:        []string{"Engines"},
	}, func(_ context.Context, _ *struct{}) (*EnginesOutput, error) {
		engines := List()
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
		desc, ok := FindByID(input.ID)
		if !ok {
			return nil, huma.Error404NotFound(fmt.Sprintf(
				"unknown engine %q: list valid engine ids with GET /api/v1/engines", input.ID))
		}
		return &EngineByIDOutput{Body: desc}, nil
	})
}
