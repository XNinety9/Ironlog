# syntax=docker/dockerfile:1
# Sync API image. Build context: the repository root (to read the app version).
# No npm dependencies: SQLite is built into Node (node:sqlite).

FROM cgr.dev/chainguard/node:latest
WORKDIR /app
COPY backend/package.json backend/db.js backend/validate.js backend/app.js backend/index.js ./
COPY package.json /tmp/root-package.json
# App version, read from the root package.json (same number as the front end and the release tag).
RUN ["node", "-e", "const v = require('/tmp/root-package.json').version; require('fs').writeFileSync('version.json', JSON.stringify({ version: v }))"]

ENV PORT=3000 DATA_DIR=/data NODE_ENV=production
# The SQLite database lives in this volume, outside the container.
VOLUME ["/data"]
USER 65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["index.js"]
