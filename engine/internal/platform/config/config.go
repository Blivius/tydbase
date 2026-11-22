package config

import (
	"os"
	"strings"
)

// Config holds runtime configuration for the TydBase engine server.
type Config struct {
	Port       string
	Env        string
	CORSOrigin string
	Version    string
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

	return Config{
		Port:       port,
		Env:        env,
		CORSOrigin: corsOrigin,
		Version:    version,
	}
}
