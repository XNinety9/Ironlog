# syntax=docker/dockerfile:1

# Étape 1 : build de l'app. Node n'est pas présent dans l'image finale.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Étape 2 : image minimale Chainguard (~28 Mo, sans shell ni gestionnaire de paquets,
# quelques paquets seulement donc peu de vulnérabilités à remonter). Elle sert uniquement les fichiers statiques.
FROM cgr.dev/chainguard/nginx:latest AS runtime
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Utilisateur non-root de l'image (65532). Pas de HEALTHCHECK : l'image n'a pas de wget,
# la vérification de santé se fait depuis l'extérieur (orchestrateur ou reverse proxy).
USER 65532
EXPOSE 8080
