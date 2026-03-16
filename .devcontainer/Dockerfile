# .devcontainer/Dockerfile
# Imagen base del contenedor de desarrollo TeshLex
# Incluye: Node.js 20, pnpm, NestJS CLI, Terraform, herramientas DevSecOps
# ─────────────────────────────────────────────────────────────────────────────
# CORRECCIONES v2:
# 1. Trivy via repo APT oficial → evita DNS failures en WSL2
# 2. Terraform via repo APT HashiCorp → sin wget de GitHub
# 3. kubectl via repo APT Kubernetes → sin wget directo
# 4. pnpm global sin comentarios inline (# inválidos en RUN multilínea)
# 5. DNS fix explícito para WSL2 + Docker Desktop
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# ── DNS fix para WSL2 + Docker Desktop ───────────────────────────────────────
RUN echo "nameserver 8.8.8.8\nnameserver 1.1.1.1" > /etc/resolv.conf || true

# ── Herramientas base ─────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
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
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
  && locale-gen en_US.UTF-8

# ── Docker CLI ────────────────────────────────────────────────────────────────
RUN curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends docker-ce-cli \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# ── Trivy via repositorio APT oficial ────────────────────────────────────────
# Usar repo APT evita el problema de DNS al descargar .deb directamente de GitHub
RUN curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key \
    | gpg --dearmor -o /usr/share/keyrings/trivy.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" \
    > /etc/apt/sources.list.d/trivy.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends trivy \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && trivy --version

# ── Terraform via repositorio APT HashiCorp ───────────────────────────────────
RUN curl -fsSL https://apt.releases.hashicorp.com/gpg \
    | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/hashicorp.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends terraform \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && terraform --version

# ── kubectl via repositorio APT Kubernetes ────────────────────────────────────
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key \
    | gpg --dearmor -o /usr/share/keyrings/kubernetes-apt-keyring.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/kubernetes-apt-keyring.gpg] \
    https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" \
    > /etc/apt/sources.list.d/kubernetes.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends kubectl \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && kubectl version --client

# ── Helm ──────────────────────────────────────────────────────────────────────
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
    -o /tmp/get-helm.sh \
  && chmod +x /tmp/get-helm.sh \
  && /tmp/get-helm.sh \
  && rm /tmp/get-helm.sh \
  && helm version

# ── Hadolint ──────────────────────────────────────────────────────────────────
RUN curl -fsSL \
    "https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64" \
    -o /usr/local/bin/hadolint \
  && chmod +x /usr/local/bin/hadolint \
  && hadolint --version

# ── pnpm ─────────────────────────────────────────────────────────────────────
ENV PNPM_HOME="/home/node/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# ── Herramientas globales de Node ─────────────────────────────────────────────
# Sin comentarios inline (#) — son inválidos en RUN multilínea con backslash
RUN pnpm add -g \
    @nestjs/cli \
    prisma \
    tsx \
    typescript \
    ts-node \
    nodemon \
    dotenv-cli \
    @biomejs/biome

# ── Cache de plugins de Terraform ─────────────────────────────────────────────
ENV TF_PLUGIN_CACHE_DIR="/home/node/.terraform.d/plugin-cache"
RUN mkdir -p $TF_PLUGIN_CACHE_DIR \
  && chown -R node:node /home/node/.terraform.d

# ── Usuario no-root ───────────────────────────────────────────────────────────
USER node
WORKDIR /workspace

# ── Shell mejorada ────────────────────────────────────────────────────────────
RUN echo 'export PS1="\[\033[01;32m\]teshlex\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/node/.bashrc \
  && echo 'alias ll="ls -la"' >> /home/node/.bashrc \
  && echo 'alias tf="terraform"' >> /home/node/.bashrc \
  && echo 'alias k="kubectl"' >> /home/node/.bashrc \
  && echo 'source /usr/share/bash-completion/bash_completion 2>/dev/null' >> /home/node/.bashrc