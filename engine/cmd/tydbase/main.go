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

	"github.com/tydbase/tydbase/engine/internal/app"
	"github.com/tydbase/tydbase/engine/internal/platform/config"
)

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
	case "openapi":
		return runOpenAPI(args[1:], stdout, stderr)
	case "server":
		return runServer(args[1:], stderr)
	case "start":
		_, err := fmt.Fprintln(stdout, "tydbase start (local-first workspace + embedded SQLite) ships in Phase 1.")
		return err
	case "agent":
		_, err := fmt.Fprintln(stdout, "tydbase agent (outbound WSS/mTLS VPC & localhost relay) ships in Phase 2.")
		return err
	case "mcp":
		_, err := fmt.Fprintln(stdout, "tydbase mcp (Streamable HTTP + local stdio governed MCP bridge) ships in Phase 3.")
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
	router, _ := app.New(cfg, mods)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

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

func printUsage(w io.Writer) {
	fmt.Fprintln(w, "TydBase — Open-source multiplayer database workspace & governed MCP control plane")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Usage:")
	fmt.Fprintln(w, "  tydbase <command> [flags]")
	fmt.Fprintln(w, "")
	fmt.Fprintln(w, "Commands:")
	fmt.Fprintln(w, "  server    Start the HTTP API (--port, --modules=all|"+strings.Join(app.ModuleNames(), ",")+")")
	fmt.Fprintln(w, "  openapi   Export the OpenAPI 3.1 JSON specification")
	fmt.Fprintln(w, "  version   Print CLI version and Go runtime")
	fmt.Fprintln(w, "  start     Launch local-first workspace (Phase 1)")
	fmt.Fprintln(w, "  agent     Run outbound private VPC / localhost relay (Phase 2)")
	fmt.Fprintln(w, "  mcp       Run local stdio MCP bridge or client installer (Phase 3)")
}
