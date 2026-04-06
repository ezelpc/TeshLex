# ============================================================
# TeshLex Frontend — Dockerfile Multi-stage (Vike + Vite)
# ============================================================

# ── Stage 1: Build ────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# La variable de entorno se inyecta en build time para Vite
ARG VITE_API_URL=https://tu-dominio.ddns.net/api
ARG VITE_MP_PUBLIC_KEY=TEST-XXXXX
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MP_PUBLIC_KEY=$VITE_MP_PUBLIC_KEY

RUN pnpm build

# ── Stage 2: Nginx para servir estáticos ──────────────────
FROM nginx:alpine AS production

# No root
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

# Copiar el build de Vike/Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración Nginx segura para SPA
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

# Dar permisos al usuario de nginx
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/ 2>/dev/null || exit 1

EXPOSE 5000

CMD ["nginx", "-g", "daemon off;"]
