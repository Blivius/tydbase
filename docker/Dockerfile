# syntax=docker/dockerfile:1.7
# TydBase engine: one static Go binary on distroless. The web stage (bun → apps/web → go:embed)
# joins in P1 · M4 when apps/web exists.
#
# Targets: (default) production image · `dev` = air hot reload, used by compose.dev.yml with
# engine/ bind-mounted. BuildKit only builds the stages the chosen target needs.

FROM golang:1.27-alpine AS dev
RUN go install github.com/air-verse/air@v1.67.4
WORKDIR /src/engine
ENV TYDBASE_PORT=8080
CMD ["air", "-c", ".air.toml"]

FROM golang:1.27-alpine AS build
WORKDIR /src/engine
COPY engine/go.mod engine/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY engine/ ./
ARG VERSION=0.1.0
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" \
    -o /out/tydbase ./cmd/tydbase

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/tydbase /usr/local/bin/tydbase
ENV TYDBASE_PORT=8080 TYDBASE_ENV=production
EXPOSE 8080
USER nonroot:nonroot
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 CMD ["/usr/local/bin/tydbase", "healthcheck"]
ENTRYPOINT ["/usr/local/bin/tydbase"]
CMD ["server"]
