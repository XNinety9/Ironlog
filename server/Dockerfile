# syntax=docker/dockerfile:1
# Image de l'API de synchronisation. Contexte de build : la racine du dépôt (pour lire la version).
# Aucune dépendance npm : SQLite est intégré à Node (node:sqlite).

FROM cgr.dev/chainguard/node:latest
WORKDIR /app
COPY server/package.json server/db.js server/validate.js server/app.js server/index.js ./
COPY package.json /tmp/root-package.json
# Version de l'app, lue depuis le package.json racine (même numéro que le front et le tag de release).
RUN ["node", "-e", "const v = require('/tmp/root-package.json').version; require('fs').writeFileSync('version.json', JSON.stringify({ version: v }))"]

ENV PORT=3000 DATA_DIR=/data NODE_ENV=production
# La base SQLite vit dans ce volume, hors du conteneur.
VOLUME ["/data"]
USER 65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["index.js"]
