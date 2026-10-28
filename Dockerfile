# ═══ Talento 360° Salud — imagen de producción ═══
# Etapas: deps → builder → tools (migraciones y carga inicial) → runner (aplicación)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

# Imagen de herramientas: aplica migraciones y la carga inicial (se ejecuta y termina).
FROM node:22-alpine AS tools
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src/db ./src/db
COPY src/lib ./src/lib
CMD ["npx", "tsx", "scripts/migrate.ts"]

# Imagen de la aplicación: solo el servidor compilado, sin código fuente ni dependencias de desarrollo.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=443 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 443
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:443/api/health || exit 1
CMD ["node", "server.js"]
