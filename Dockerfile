# Build client — rebuilt 2026-03-30
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN echo "build-version: $(date +%s)" && npm run build

# Production server
FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=client-build /app/client/dist ./public

ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
