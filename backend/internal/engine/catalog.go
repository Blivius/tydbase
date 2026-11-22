package engine

// Paradigm identifies one of TydBase's four unified database paradigms.
type Paradigm string

const (
	ParadigmSQL      Paradigm = "sql"
	ParadigmDocument Paradigm = "document"
	ParadigmKV       Paradigm = "kv"
	ParadigmVector   Paradigm = "vector"
)

// Descriptor describes a supported TydBase engine driver and its capabilities.
type Descriptor struct {
	ID              string   `json:"id" doc:"Stable engine identifier (e.g. postgres, mongodb, redis)."`
	Name            string   `json:"name" doc:"Human-readable database engine name."`
	Paradigm        Paradigm `json:"paradigm" enum:"sql,document,kv,vector" doc:"Primary data paradigm."`
	DefaultPort     int      `json:"defaultPort" doc:"Standard TCP port (0 for embedded/file engines)."`
	SupportsRelay   bool     `json:"supportsRelay" doc:"Whether private VPC/localhost relay tunneling is supported."`
	SupportsReadTx  bool     `json:"supportsReadTx" doc:"Whether read-only transactions are enforced natively."`
	SupportsVector  bool     `json:"supportsVector" doc:"Whether native vector similarity indexing is supported."`
	Status          string   `json:"status" enum:"tier1,planned" doc:"Driver implementation tier."`
}

var catalog = []Descriptor{
	{
		ID:             "postgres",
		Name:           "PostgreSQL (+ pgvector)",
		Paradigm:       ParadigmSQL,
		DefaultPort:    5432,
		SupportsRelay:  true,
		SupportsReadTx: true,
		SupportsVector: true,
		Status:         "tier1",
	},
	{
		ID:             "mysql",
		Name:           "MySQL",
		Paradigm:       ParadigmSQL,
		DefaultPort:    3306,
		SupportsRelay:  true,
		SupportsReadTx: true,
		SupportsVector: false,
		Status:         "tier1",
	},
	{
		ID:             "mariadb",
		Name:           "MariaDB",
		Paradigm:       ParadigmSQL,
		DefaultPort:    3306,
		SupportsRelay:  true,
		SupportsReadTx: true,
		SupportsVector: true,
		Status:         "tier1",
	},
	{
		ID:             "mssql",
		Name:           "Microsoft SQL Server",
		Paradigm:       ParadigmSQL,
		DefaultPort:    1433,
		SupportsRelay:  true,
		SupportsReadTx: true,
		SupportsVector: false,
		Status:         "tier1",
	},
	{
		ID:             "sqlite",
		Name:           "SQLite / LibSQL",
		Paradigm:       ParadigmSQL,
		DefaultPort:    0,
		SupportsRelay:  true,
		SupportsReadTx: true,
		SupportsVector: false,
		Status:         "tier1",
	},
	{
		ID:             "mongodb",
		Name:           "MongoDB",
		Paradigm:       ParadigmDocument,
		DefaultPort:    27017,
		SupportsRelay:  true,
		SupportsReadTx: false,
		SupportsVector: true,
		Status:         "tier1",
	},
	{
		ID:             "redis",
		Name:           "Redis / Valkey",
		Paradigm:       ParadigmKV,
		DefaultPort:    6379,
		SupportsRelay:  true,
		SupportsReadTx: false,
		SupportsVector: false,
		Status:         "tier1",
	},
	{
		ID:             "qdrant",
		Name:           "Qdrant Vector Engine",
		Paradigm:       ParadigmVector,
		DefaultPort:    6333,
		SupportsRelay:  true,
		SupportsReadTx: false,
		SupportsVector: true,
		Status:         "planned",
	},
}

// List returns a copy of all engine descriptors.
func List() []Descriptor {
	out := make([]Descriptor, len(catalog))
	copy(out, catalog)
	return out
}

// FindByID returns a descriptor matching id and a boolean indicating whether it exists.
func FindByID(id string) (Descriptor, bool) {
	for _, d := range catalog {
		if d.ID == id {
			return d, true
		}
	}
	return Descriptor{}, false
}
