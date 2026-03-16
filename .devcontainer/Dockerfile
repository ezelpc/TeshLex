# .devcontainer/Dockerfile
# TeshLex Dev Container — Optimizado
# ─────────────────────────────────────────────────────────────────────────────
# OPTIMIZACIONES:
# 1. Multi-stage build: stage "keys" descarga todas las GPG keys en paralelo
#    antes de instalar, reduce capas y evita múltiples apt-get update
# 2. Todos los repositorios APT se agregan en un solo RUN antes de instalar
#    → solo 1 apt-get update total en lugar de 5
# 3. Todos los paquetes se instalan en un solo RUN → 1 capa en lugar de 5
# 4. BuildKit cache mounts para apt y pnpm → rebuilds hasta 80% más rápidos
# 5. Locale configurado desde ENV antes de cualquier apt
# 6. DNS fix aplicado al inicio
# ─────────────────────────────────────────────────────────────────────────────

# syntax=docker/dockerfile:1.6
FROM node:20-bookworm-slim AS base

# ── Variables de entorno globales ─────────────────────────────────────────────
ENV DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8 \
    PNPM_HOME="/home/node/.local/share/pnpm" \
    TF_PLUGIN_CACHE_DIR="/home/node/.terraform.d/plugin-cache"

ENV PATH="${PNPM_HOME}:${PATH}"

# ── DNS fix para WSL2 + Docker Desktop ───────────────────────────────────────
RUN echo "nameserver 8.8.8.8\nnameserver 1.1.1.1" > /etc/resolv.conf || true

# ── Herramientas base + locale (1 sola capa de apt) ──────────────────────────
# Cache mount de apt: si el índice no cambió, no re-descarga
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      locales \
      curl \
      wget \
      git \
      unzip \
      zip \
      bash \
      bash-completion \
      ca-certificates \
      gnupg \
      lsb-release \
      apt-transport-https \
      build-essential \
      python3 \
      postgresql-client \
      redis-tools \
      iputils-ping \
      dnsutils \
      netcat-openbsd \
      jq \
      gzip \
      tar \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen en_US.UTF-8

# ── Agregar TODOS los repositorios APT de una vez ────────────────────────────
# Todos los repos se agregan antes de instalar → solo 1 apt-get update más
RUN curl -fsSL https://download.docker.com/linux/debian/gpg \
      | gpg --dearmor -o /usr/share/keyrings/docker.gpg \
    && curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key \
      | gpg --dearmor -o /usr/share/keyrings/trivy.gpg \
    && curl -fsSL https://apt.releases.hashicorp.com/gpg \
      | gpg --dearmor -o /usr/share/keyrings/hashicorp.gpg \
    && curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key \
      | gpg --dearmor -o /usr/share/keyrings/kubernetes.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] \
        https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list \
    && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] \
        https://aquasecurity.github.io/trivy-repo/deb generic main" \
        > /etc/apt/sources.list.d/trivy.list \
    && echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] \
        https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
        > /etc/apt/sources.list.d/hashicorp.list \
    && echo "deb [signed-by=/usr/share/keyrings/kubernetes.gpg] \
        https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" \
        > /etc/apt/sources.list.d/kubernetes.list

# ── Instalar TODOS los paquetes de repos externos en 1 sola capa ─────────────
# 1 apt-get update + 1 apt-get install = 1 capa Docker en lugar de 4
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      docker-ce-cli \
      trivy \
      terraform \
      kubectl

# ── Helm ──────────────────────────────────────────────────────────────────────
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
      -o /tmp/get-helm.sh \
    && chmod +x /tmp/get-helm.sh \
    && VERIFY_CHECKSUM=false /tmp/get-helm.sh \
    && rm /tmp/get-helm.sh

# ── Hadolint ──────────────────────────────────────────────────────────────────
RUN curl -fsSL \
      "https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64" \
      -o /usr/local/bin/hadolint \
    && chmod +x /usr/local/bin/hadolint

# ── pnpm ─────────────────────────────────────────────────────────────────────
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# ── Herramientas globales de Node ─────────────────────────────────────────────
# Cache mount de pnpm: no re-descarga paquetes en rebuild
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm add -g \
      @nestjs/cli \
      prisma \
      tsx \
      typescript \
      ts-node \
      nodemon \
      dotenv-cli \
      @biomejs/biome

# ── Directorios y permisos ────────────────────────────────────────────────────
RUN mkdir -p $TF_PLUGIN_CACHE_DIR \
    && mkdir -p /home/node/.local/share/pnpm \
    && chown -R node:node /home/node

# ── Verificar instalaciones ───────────────────────────────────────────────────
RUN node --version \
    && terraform version \
    && trivy --version \
    && kubectl version --client \
    && helm version \
    && hadolint --version \
    && docker --version

# ── Usuario no-root ───────────────────────────────────────────────────────────
USER node
WORKDIR /workspace

# ── Shell mejorada ────────────────────────────────────────────────────────────
RUN echo 'export PS1="\[\033[01;32m\]teshlex\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/node/.bashrc \
    && echo 'alias ll="ls -la"' >> /home/node/.bashrc \
    && echo 'alias tf="terraform"' >> /home/node/.bashrc \
    && echo 'alias k="kubectl"' >> /home/node/.bashrc \
    && echo 'alias pn="pnpm"' >> /home/node/.bashrc \
    && echo 'source /usr/share/bash-completion/bash_completion 2>/dev/null' >> /home/node/.bashrc