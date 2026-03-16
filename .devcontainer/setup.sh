#!/usr/bin/env bash
# .devcontainer/setup.sh
# Script de inicialización que corre UNA vez al crear el contenedor (postCreateCommand)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[TESH SETUP]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

log "🚀 Iniciando setup de TeshLex Dev Container..."

# ── Frontend (Vite + React + TypeScript) ──────────────────────────────────────
if [ ! -f /workspace/frontend/package.json ]; then
  log "📦 Creando proyecto frontend con Vite + React + TypeScript..."
  rm -rf /workspace/frontend
  cd /workspace
  pnpm create vite@latest frontend --template react-ts -- --yes
  cd /workspace/frontend
  pnpm install
  # Instalar dependencias del stack TESH Frontend
  pnpm add \
    @tanstack/react-query \
    @tanstack/react-query-devtools \
    zustand \
    react-router-dom \
    axios
  pnpm add -D \
    tailwindcss \
    postcss \
    autoprefixer \
    @types/node
  pnpm exec tailwindcss init -p
  log "✅ Frontend creado correctamente."
else
  info "Frontend ya existe, instalando dependencias..."
  cd /workspace/frontend && pnpm install
fi

# ── Backend (NestJS + TypeScript) ─────────────────────────────────────────────
if [ ! -f /workspace/backend/package.json ]; then
  log "📦 Creando proyecto backend con NestJS..."
  rm -rf /workspace/backend
  cd /workspace
  # --skip-git porque ya estamos en un repo
  pnpm dlx @nestjs/cli new backend --package-manager pnpm --skip-git --strict
  cd /workspace/backend
  # Instalar dependencias del stack TESH Backend
  pnpm add \
    @nestjs/config \
    @nestjs/jwt \
    @nestjs/passport \
    @nestjs/swagger \
    @nestjs/throttler \
    @prisma/client \
    passport \
    passport-jwt \
    bcryptjs \
    helmet \
    compression \
    morgan \
    resend \
    mercadopago \
    uuid \
    zod
  pnpm add -D \
    prisma \
    @types/bcryptjs \
    @types/compression \
    @types/morgan \
    @types/passport-jwt \
    @types/uuid
  # Inicializar Prisma
  pnpm exec prisma init
  log "✅ Backend creado correctamente."
else
  info "Backend ya existe, instalando dependencias..."
  cd /workspace/backend && pnpm install
fi

# ── Infraestructura Terraform ──────────────────────────────────────────────────
if [ ! -f /workspace/infra/main.tf ]; then
  log "🏗️  Creando estructura de Terraform..."
  mkdir -p /workspace/infra/{modules/{vpc,compute,database},environments/{dev,staging,prod}}
  
  # main.tf raíz
  cat > /workspace/infra/main.tf << 'TFEOF'
# infra/main.tf — TeshLex Infrastructure
terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # Descomenta si usas GCP:
    # google = {
    #   source  = "hashicorp/google"
    #   version = "~> 5.0"
    # }
  }

  # Backend remoto para estado (descomenta en producción)
  # backend "s3" {
  #   bucket = "teshlex-tfstate"
  #   key    = "global/s3/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}
TFEOF

  # variables.tf
  cat > /workspace/infra/variables.tf << 'TFEOF'
variable "aws_region" {
  description = "Región de AWS para desplegar"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Entorno: dev, staging, prod"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "teshlex"
}
TFEOF

  # outputs.tf
  cat > /workspace/infra/outputs.tf << 'TFEOF'
# Outputs principales de la infraestructura
# Se irán agregando conforme se definan módulos
TFEOF

  log "✅ Estructura de Terraform creada."
else
  info "Infra Terraform ya existe."
fi

# ── CI/CD (GitHub Actions) ─────────────────────────────────────────────────────
if [ ! -d /workspace/.github/workflows ]; then
  log "⚙️  Creando workflows de GitHub Actions..."
  mkdir -p /workspace/.github/workflows
  
  cat > /workspace/.github/workflows/ci.yml << 'GHEOF'
name: CI — TeshLex

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  security-scan:
    name: 🔒 Escaneo de Seguridad (Trivy)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Escanear vulnerabilidades
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: HIGH,CRITICAL
          exit-code: 1

  lint-backend:
    name: 🧹 Lint Backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: backend/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test --passWithNoTests

  lint-frontend:
    name: 🧹 Lint Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: frontend/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  terraform-validate:
    name: 🏗️ Validar Terraform
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with: { terraform_version: 1.8.0 }
      - run: terraform init -backend=false
      - run: terraform fmt -check
      - run: terraform validate
GHEOF

  log "✅ GitHub Actions CI creado."
fi

# ── .gitignore raíz ────────────────────────────────────────────────────────────
if [ ! -f /workspace/.gitignore ]; then
  cat > /workspace/.gitignore << 'GIEOF'
# Node
node_modules/
dist/
build/
.next/
.nuxt/

# Env files
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Terraform
**/.terraform/
*.tfstate
*.tfstate.*
*.tfvars
!*.tfvars.example
.terraform.lock.hcl

# IDE
.vscode/settings.json
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Seguridad — nunca subir
*.pem
*.key
*.p12
*.pfx
trivy-report.json
GIEOF
  log "✅ .gitignore creado."
fi

# ── Resumen final ──────────────────────────────────────────────────────────────
echo ""
log "✅ Setup completo. Estructura del workspace:"
echo ""
echo "  /workspace"
echo "  ├── frontend/          → Vite + React + TypeScript"
echo "  ├── backend/           → NestJS + Prisma + PostgreSQL"
echo "  ├── infra/             → Terraform"
echo "  ├── .github/workflows/ → GitHub Actions CI/CD"
echo "  └── .devcontainer/     → Configuración del contenedor"
echo ""
log "🔑 Servicios disponibles:"
info "  Frontend:   http://localhost:5173"
info "  Backend:    http://localhost:3000/api"
info "  Swagger:    http://localhost:3000/api/docs"
info "  Adminer:    http://localhost:8080"
info "  Grafana:    http://localhost:3001  (admin / tesh_grafana_2025)"
info "  Prometheus: http://localhost:9090"
echo ""
log "📋 Próximos pasos:"
echo "  cd backend && pnpm run prisma:migrate && pnpm run prisma:seed"
echo "  cd frontend && pnpm dev"
echo "  cd infra    && terraform init"