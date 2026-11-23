package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/blivius/tydbase/engine/internal/app"
	"github.com/blivius/tydbase/engine/internal/platform/config"
)

// version is stamped at build time: -ldflags "-X main.version=<git describe>".
// The default keeps `tydbase openapi` (and so the committed spec) stable.
var version = "0.1.0"

func main() {
	if err := run(os.Args[1:], os.Stdout, os.Stderr); err != nil {
		fmt.Fprintf(os.Stderr, "tydbase: %v\n", err)
		os.Exit(1)
	}
}

func run(args []string, stdout, stderr io.Writer) error {
	if len(args) == 0 {
		printUsage(stdout)
		return nil
	}

	switch args[0] {
	case "help", "-h", "--help":
		printUsage(stdout)
		return nil
	case "version":
		_, err := fmt.Fprintf(stdout, "tydbase %s (%s %s/%s)\n", version, runtime.Version(), runtime.GOOS, runtime.GOARCH)
		return err
	case "healthcheck":
		return runHealthcheck(args[1:], stderr)
	case "openapi":
		return runOpenAPI(args[1:], stdout, stderr)
	case "server":
		return runServer(args[1:], stderr)
	case "agent":
		_, err := fmt.Fprintln(stdout, "tydbase agent (outbound relay for private and localhost databases) ships in Phase 4.")
		return err
	case "mcp":
		_, err := fmt.Fprintln(stdout, "tydbase mcp (an MCP adapter over the same policy pipeline) ships in Phase 3.")
		return err
	default:
		printUsage(stderr)
		return fmt.Errorf("unknown command %q", args[0])
	}
}

func runOpenAPI(args []string, stdout, stderr io.Writer) error {
	fs := flag.NewFlagSet("openapi", flag.ContinueOnError)
	fs.SetOutput(stderr)
	outPath := fs.String("out", "", "Write OpenAPI 3.1 JSON spec to file path instead of stdout")
	if err := fs.Parse(args); err != nil {
		return err
	}

	_, humaAPI := app.New(config.Load(version), app.ModuleNames())
	data, err := json.MarshalIndent(humaAPI.OpenAPI(), "", "  ")
	if err != nil {
		return fmt.Errorf("marshal openapi spec: %w", err)
	}
	data = append(data, '\n')

	if *outPath != "" {
		if err := os.WriteFile(*outPath, data, 0o644); err != nil { //nolint:gosec // committed public spec, world-readable on purpose
			return fmt.Errorf("write openapi spec to %s: %w", *outPath, err)
		}
		return nil
	}

	_, err = stdout.Write(data)
	return err
}

func runServer(args []string, stderr io.Writer) error {
	cfg := config.Load(version)

	fs := flag.NewFlagSet("server", flag.ContinueOnError)
	fs.SetOutput(stderr)
	port := fs.String("port", cfg.Port, "HTTP listen port")
	modulesFlag := fs.String("modules", "all",
		"Modules to mount: all, or a comma-separated subset of "+strings.Join(app.ModuleNames(), ","))
	if err := fs.Parse(args); err != nil {
		return err
	}
	cfg.Port = *port
	mods, err := app.ParseModules(*modulesFlag)
	if err != nil {
		return err
	}

	logger := slog.New(slog.NewJSONHandler(stderr, nil))

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Fail fast: a server that can't read its metadata or decrypt its secrets must not go healthy.
	platform, err := app.OpenPlatform(ctx, cfg)
	if err != nil {
		return err
	}
	defer func() {
		if err := platform.Close(); err != nil {
			logger.Error("close metadata db", "err", err)
		}
	}()
	logger.Info("metadata store ready", "dataDir", cfg.DataDir)

	router, _ := app.New(cfg, mods)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("tydbase server listening", "port", cfg.Port, "env", cfg.Env, "version", cfg.Version, "modules", mods)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		logger.Info("shutting down tydbase server")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
}

// runHealthcheck exits non-zero unless the local server answers /api/v1/health with 200.
// It exists because the distroless image has no shell, curl or wget for a Docker HEALTHCHECK.
func runHealthcheck(args []string, stderr io.Writer) error {
	fs := flag.NewFlagSet("healthcheck", flag.ContinueOnError)
	fs.SetOutput(stderr)
	url := fs.String("url", "http://127.0.0.1:"+config.Load(version).Port+"/api/v1/health", "Health endpoint to probe")
	if err := fs.Parse(args); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, *url, nil)
	if err != nil {
		return fmt.Errorf("healthcheck: bad --url %q: %w", *url, err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("healthcheck: %s unreachable: %w (is `tydbase server` running on that port?)", *url, err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("healthcheck: %s returned %d, want 200", *url, resp.StatusCode)
	}
	return nil
}

func printUsage(w io.Writer) {
	fmt.Fprintln(w, "TydBase by Blivius: safe database access for your team's AI coding agents")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Usage:")
	fmt.Fprintln(w, "  tydbase <command> [flags]")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Commands:")
	fmt.Fprintln(w, "  server    Start the HTTP API (--port, --modules=all|"+strings.Join(app.ModuleNames(), ",")+")")
	fmt.Fprintln(w, "  openapi   Export the OpenAPI 3.1 JSON specification")
	fmt.Fprintln(w, "  version   Print CLI version and Go runtime")
	fmt.Fprintln(w, "  healthcheck  Exit 0 if the local server's /api/v1/health answers 200 (--url)")
	fmt.Fprintln(w, "  mcp       MCP adapter for AI clients (Phase 3)")
	fmt.Fprintln(w, "  agent     Outbound relay for private databases (Phase 4)")
}
