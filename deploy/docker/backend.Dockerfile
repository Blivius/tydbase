# syntax=docker/dockerfile:1.7

FROM golang:1.27-alpine AS builder
WORKDIR /src/backend

RUN apk add --no-cache ca-certificates tzdata

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/tydbase ./cmd/tydbase

FROM gcr.io/distroless/static-debian12:nonroot AS runner
WORKDIR /app

COPY --from=builder /out/tydbase /usr/local/bin/tydbase

ENV TYDBASE_PORT=8080
ENV TYDBASE_ENV=production

EXPOSE 8080
USER nonroot:nonroot

ENTRYPOINT ["/usr/local/bin/tydbase"]
CMD ["server"]
