# The app is compiled and tested off-host. The deployment context contains only
# package manifests and a runtime/ directory (server.js + .next), not source,
# secrets, or the builder's architecture-specific node_modules.
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY package.json package-lock.json ./
# Install the locked production dependencies for the actual VPS architecture.
# All native packages used here provide prebuilt artifacts; no install scripts
# or application compilation are needed on the shared VPS.
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force
COPY --chown=node:node runtime/ ./
RUN mkdir -p /app/.next/cache && chown node:node /app/.next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
