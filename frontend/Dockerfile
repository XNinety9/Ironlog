# syntax=docker/dockerfile:1
# Image du site. Contexte de build : la racine du dépôt (workspace npm + version de l'app).

# Étape 1 : build de l'app. Node n'est pas présent dans l'image finale.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/
RUN npm ci --workspace frontend --include-workspace-root
COPY frontend/ frontend/
RUN npm run build --workspace frontend

# Étape 2 : sonde de santé, binaire Go statique (l'image finale n'a ni shell ni wget).
FROM golang:1.27-alpine AS probe
WORKDIR /src
COPY frontend/docker/probe/ .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /probe .

# Étape 3 : image minimale Chainguard (~28 Mo, sans shell ni gestionnaire de paquets,
# quelques paquets seulement donc peu de vulnérabilités à remonter). Elle sert les fichiers statiques
# et transmet /api au conteneur ironlog-api.
FROM cgr.dev/chainguard/nginx:latest AS runtime
COPY frontend/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY --from=probe /probe /usr/local/bin/probe
# Utilisateur non-root de l'image (65532).
USER 65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["/usr/local/bin/probe", "http://127.0.0.1:8080/"]
