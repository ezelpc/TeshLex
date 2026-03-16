# TeshLex — Sistema de Gestión de Cursos de Idiomas

> Plataforma integral para la administración de cursos de lenguas extranjeras del **Tecnológico de Estudios Superiores de Huixquilucan (TESH)**. Gestión de alumnos, profesores, inscripciones, pagos y reportes académicos.

---

## Índice

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Inicio rápido](#inicio-rápido)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Servicios y puertos](#servicios-y-puertos)
- [Variables de entorno](#variables-de-entorno)
- [Comandos frecuentes](#comandos-frecuentes)
- [DevSecOps](#devsecops)
- [Infraestructura Terraform](#infraestructura-terraform)
- [CI/CD](#cicd)
- [Credenciales de desarrollo](#credenciales-de-desarrollo)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + TanStack Query + Zustand + Tailwind CSS |
| **Backend** | NestJS + TypeScript + Prisma ORM |
| **Base de datos** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Autenticación** | JWT + Refresh Tokens + RBAC (4 roles) |
| **Pagos** | Mercado Pago (MXN — OXXO, SPEI, tarjetas) |
| **Email** | Resend |
| **Infraestructura** | Terraform + AWS |
| **Contenedores** | Docker + Docker Compose |
| **Entorno dev** | VS Code Dev Containers |
| **Monitoreo** | Prometheus + Grafana + Loki + Promtail |
| **Seguridad** | Trivy + Hadolint + SonarQube + Snyk |
| **CI/CD** | GitHub Actions |
| **Orquestación** | kubectl + Helm |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Dev Container                         │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │   Frontend   │    │          Backend              │   │
│  │  Vite :5173  │───▶│      NestJS :3000            │   │
│  │  React + TS  │    │  Prisma │ JWT │ Swagger      │   │
│  └──────────────┘    └────────────┬─────────────────┘   │
│                                   │                     │
│              ┌────────────────────┼──────────────┐      │
│              │                    │              │      │
│       ┌──────▼──────┐    ┌───────▼──────┐  ┌────▼───┐  │
│       │ PostgreSQL  │    │    Redis     │  │  MP    │  │
│       │   :5432     │    │    :6379     │  │Webhook │  │
│       └─────────────┘    └─────────────┘  └────────┘  │
│                                                         │
│  ── Observabilidad ──────────────────────────────────   │
│  Prometheus :9090 → Grafana :3001 ← Loki :3100         │
│                          ↑                             │
│                       Promtail                         │
└─────────────────────────────────────────────────────────┘
```

### Roles del sistema

| Rol | Descripción |
|---|---|
| `STUDENT` | Alumno — ve historial, boletas y pagos |
| `TEACHER` | Profesor — registra calificaciones y asistencias |
| `ADMIN` | Administrador — gestión completa |
| `SUPERADMIN` | Acceso total incluyendo configuración del sistema |

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.x o superior
- [VS Code](https://code.visualstudio.com/) con la extensión [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- WSL2 (Windows) o macOS/Linux
- Git

> No se necesita Node.js, pnpm, Terraform ni ninguna otra herramienta instalada localmente. Todo corre dentro del contenedor.

---

## Inicio rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/teshlex.git
cd teshlex
```

### 2. Abrir en Dev Container

En VS Code: `Ctrl+Shift+P` → **"Dev Containers: Reopen in Container"**

El contenedor se construye automáticamente (~5 min la primera vez). El `setup.sh` crea la estructura del proyecto al terminar.

### 3. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales
```

### 4. Inicializar la base de datos

```bash
cd backend
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### 5. Arrancar los servicios

```bash
# Terminal 1 — Backend
cd backend && pnpm run start:dev

# Terminal 2 — Frontend
cd frontend && pnpm dev
```

### 6. Verificar

```bash
pg_isready -h postgres -U tesh_user -d tesh_db
curl http://localhost:3000/api
# Swagger: http://localhost:3000/api/docs
```

---

## Estructura del proyecto

```
TeshLex/
├── .devcontainer/
│   ├── devcontainer.json
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── setup.sh
│   ├── postgres/init.sql
│   ├── prometheus/prometheus.yml
│   ├── loki/loki-config.yml
│   └── promtail/promtail-config.yml
├── frontend/
│   └── src/
│       ├── lib/api.ts
│       └── pages/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── courses/
│   │   ├── enrollments/
│   │   ├── payments/
│   │   ├── reports/
│   │   └── notifications/
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── infra/
│   ├── main.tf
│   ├── variables.tf
│   └── modules/
└── .github/workflows/ci.yml
```

---

## Servicios y puertos

| Servicio | Puerto | URL |
|---|---|---|
| Frontend Vite | 5173 | http://localhost:5173 |
| Backend NestJS | 3000 | http://localhost:3000/api |
| Swagger | 3000 | http://localhost:3000/api/docs |
| Adminer | 8080 | http://localhost:8080 |
| Grafana | 3001 | http://localhost:3001 |
| Prometheus | 9090 | http://localhost:9090 |
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| Loki | 3100 | — |

---

## Variables de entorno

Copia `backend/.env.example` a `backend/.env` y completa:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_ACCESS_SECRET` | Secret para access tokens (64 chars mínimo) |
| `JWT_REFRESH_SECRET` | Secret diferente para refresh tokens |
| `MP_ACCESS_TOKEN` | Token de Mercado Pago |
| `MP_WEBHOOK_URL` | URL pública para webhooks de Mercado Pago |
| `RESEND_API_KEY` | API Key de Resend para emails |
| `FRONTEND_URL` | URL del frontend |

Generar secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Comandos frecuentes

### Backend

```bash
cd backend
pnpm run start:dev          # Desarrollo con hot-reload
pnpm prisma generate        # Generar cliente Prisma
pnpm prisma migrate dev     # Crear y aplicar migración
pnpm prisma migrate deploy  # Aplicar en producción
pnpm prisma db seed         # Poblar con datos de prueba
pnpm prisma studio          # UI visual de la BD (puerto 5555)
pnpm test                   # Tests unitarios
pnpm test:e2e               # Tests end-to-end
pnpm build                  # Build de producción
```

### Frontend

```bash
cd frontend
pnpm dev      # Desarrollo
pnpm build    # Build de producción
pnpm lint     # Linting
```

### Terraform

```bash
cd infra
terraform init          # Inicializar providers
terraform plan          # Ver plan de cambios
terraform apply         # Aplicar cambios
terraform fmt           # Formatear archivos
terraform validate      # Validar configuración
```

### Seguridad

```bash
trivy fs /workspace --severity HIGH,CRITICAL   # Escanear vulnerabilidades
hadolint .devcontainer/Dockerfile              # Lint del Dockerfile
cat /workspace/.devcontainer/trivy-report.json | jq '.Results[].Vulnerabilities | length'
```

---

## DevSecOps

### Herramientas en el contenedor

| Herramienta | Propósito |
|---|---|
| **Trivy** | Escaneo de vulnerabilidades en código y dependencias |
| **Hadolint** | Linter de Dockerfiles |
| **SonarQube** | Análisis estático de código |
| **Snyk** | Detección de vulnerabilidades en dependencias |
| **Terraform** | Infraestructura como código |
| **kubectl** | Gestión de Kubernetes |
| **Helm** | Gestión de paquetes Kubernetes |

### Flujo de seguridad

```
Push → Snyk (deps) → SonarQube (static) → Trivy (fs)
                                               ↓
                                     GitHub Actions CI
                               (bloquea PRs con HIGH/CRITICAL)
```

---

## Infraestructura Terraform

```bash
cd infra

# Local (sin backend remoto)
terraform init -backend=false
terraform plan

# Producción
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
terraform init && terraform apply
```

### Módulos

| Módulo | Descripción |
|---|---|
| `modules/vpc` | Red virtual privada |
| `modules/compute` | Instancias EC2 / ECS |
| `modules/database` | RDS PostgreSQL gestionado |

---

## CI/CD

Pipeline en `.github/workflows/ci.yml` — corre en cada push y PR:

```
┌─────────────────────────────────────────────┐
│   🔒 Trivy   │  🧹 Backend  │ 🏗️ Terraform  │
│   fs scan    │ lint + test  │  fmt + val    │
├──────────────┴──────────────┴───────────────┤
│              🧹 Frontend                     │
│            lint + build                      │
└─────────────────────────────────────────────┘
         ↓ Todo verde → merge permitido
```

---

## Credenciales de desarrollo

> ⚠️ Solo para entorno local. Nunca usar en producción.

| Servicio | Usuario | Contraseña |
|---|---|---|
| PostgreSQL | `tesh_user` | `tesh_password` |
| Redis | — | `tesh_redis_pass` |
| Grafana | `admin` | `tesh_grafana_2025` |
| API Superadmin | `superadmin@tesh.edu.mx` | `SuperAdmin2025!` |
| API Admin | `admin@tesh.edu.mx` | `Admin2025!` |
| API Profesor | `profesor@tesh.edu.mx` | `Profesor2025!` |
| API Alumno | `alumno@tesh.edu.mx` | `Alumno2025!` |

---

© 2025 Tecnológico de Estudios Superiores de Huixquilucan — ONERSTUDIOS
