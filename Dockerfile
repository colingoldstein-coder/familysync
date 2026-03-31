# Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client/ ./
RUN npm run build

# Production server
FROM node:20-alpine
WORKDIR /app

# Copy package files explicitly to ensure cache invalidation on dependency changes
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server/ ./
COPY --from=client-build /app/client/dist ./public

ENV PORT=3001

EXPOSE 3001

CMD ["sh", "-c", "npx knex migrate:latest --env production && node server.js"]
