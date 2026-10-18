# syntax=docker/dockerfile:1
# Web app image. Build context: the repository root (npm workspace + app version).

# Stage 1: build the app. Node is not present in the final image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --workspace frontend --include-workspace-root
COPY frontend/ frontend/
RUN npm run build --workspace frontend

# Stage 2: health probe, a static Go binary (the final image has no shell or wget).
FROM golang:1.27-alpine AS probe
WORKDIR /src
COPY frontend/docker/probe/ .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /probe .

# Stage 3: minimal Chainguard image (~28 MB, no shell or package manager,
# few packages, so few vulnerabilities to report). It serves the static files
# and forwards /api to the ironlog-api container.
FROM cgr.dev/chainguard/nginx:latest AS runtime
COPY frontend/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY --from=probe /probe /usr/local/bin/probe
# Non-root user of the image (65532).
USER 65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["/usr/local/bin/probe", "http://127.0.0.1:8080/"]
