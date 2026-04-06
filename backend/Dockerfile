# ============================================================
# TeshLex Backend — Dockerfile Multi-stage (NestJS)
# ============================================================

# ── Stage 1: Dependencias ─────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
# --frozen-lockfile garantiza reproducibilidad
RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: Build ────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Prisma genera el cliente antes de compilar
RUN npx prisma generate
RUN pnpm build

# ── Stage 3: Producción (imagen mínima) ───────────────────
FROM node:20-alpine AS production

# 🔐 No ejecutar como root
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

WORKDIR /app

# 🔒 Crear directorio /tmp sin permisos especiales (emptyDir simulation)
RUN mkdir -p /tmp && chmod 1777 /tmp

# Copiar solo lo necesario
COPY --from=deps     --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder  --chown=appuser:appgroup /app/dist        ./dist
COPY --from=builder  --chown=appuser:appgroup /app/package.json ./package.json
# Prisma client generado
COPY --from=builder  --chown=appuser:appgroup /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder  --chown=appuser:appgroup /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000

USER appuser

# 🔒 Health check con retries
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null || exit 1

EXPOSE 3000

# 🔐 Ejecutar con seguridad estricta (solo stdout/stderr)
CMD ["node", "dist/main"]
