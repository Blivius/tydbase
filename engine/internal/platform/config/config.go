package config

import (
	"os"
	"path/filepath"
	"strings"
)

// Config holds runtime configuration for the TydBase engine server.
type Config struct {
	Port       string
	Env        string
	CORSOrigin string
	Version    string
	// DataDir holds tydbase.db and master.key. Empty only if TYDBASE_DATA_DIR is unset and the
	// OS has no user config dir; opening the platform then fails with a hint to set it.
	DataDir string
	// MasterKey is TYDBASE_MASTER_KEY (base64). Never log it; empty means use master.key.
	MasterKey string `json:"-"`
}

// Load reads server configuration from environment variables with safe defaults.
func Load(version string) Config {
	port := strings.TrimSpace(os.Getenv("TYDBASE_PORT"))
	if port == "" {
		port = strings.TrimSpace(os.Getenv("PORT"))
	}
	if port == "" {
		port = "8080"
	}

	env := strings.TrimSpace(os.Getenv("TYDBASE_ENV"))
	if env == "" {
		env = "development"
	}

	corsOrigin := strings.TrimSpace(os.Getenv("TYDBASE_CORS_ORIGIN"))
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}

	if version == "" {
		version = "0.1.0-dev"
	}

	dataDir := strings.TrimSpace(os.Getenv("TYDBASE_DATA_DIR"))
	if dataDir == "" {
		if dir, err := os.UserConfigDir(); err == nil {
			dataDir = filepath.Join(dir, "tydbase")
		}
	}

	return Config{
		Port:       port,
		Env:        env,
		CORSOrigin: corsOrigin,
		Version:    version,
		DataDir:    dataDir,
		MasterKey:  strings.TrimSpace(os.Getenv("TYDBASE_MASTER_KEY")),
	}
}
