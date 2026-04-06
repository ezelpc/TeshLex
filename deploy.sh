#!/bin/bash
# =============================================================
# TeshLex — Deploy Script Completo
# Ejecutar desde una máquina con: AWS CLI, Docker, Terraform, SSH
# Uso: bash deploy.sh
# =============================================================
set -euo pipefail

# ─── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'
BLU='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

ok()   { echo -e "${GRN}✅ $*${NC}"; }
warn() { echo -e "${YLW}⚠️  $*${NC}"; }
err()  { echo -e "${RED}❌ $*${NC}"; exit 1; }
info() { echo -e "${BLU}ℹ️  $*${NC}"; }
step() { echo -e "\n${BOLD}══════════════════════════════════════════${NC}"; echo -e "${BOLD}▶ $*${NC}"; echo -e "${BOLD}══════════════════════════════════════════${NC}"; }

# =============================================================
# CONFIGURACIÓN — Edita estos valores antes de ejecutar
# =============================================================
DOCKERHUB_USER=""          # Tu usuario de Docker Hub
DOMAIN=""                  # Tu subdominio No-IP, ej: teshlex.ddns.net
EMAIL=""                   # Tu email (para certbot Let's Encrypt)
DATABASE_URL=""            # postgresql://user:pass@host:5432/dbname
RESEND_API_KEY=""          # re_XXXXXXXXXXXXXXXX (desde resend.com)
MP_ACCESS_TOKEN=""         # TEST-XXXX... (desde MercadoPago Developers)
MP_PUBLIC_KEY=""           # TEST-XXXX... (clave pública MP, para el frontend)
YOUR_EMAIL_FROM=""         # noreply@tesh.edu.mx
AWS_REGION="us-east-1"
SSH_KEY_PATH="$HOME/.ssh/teshlex-aws"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================
# VALIDAR CONFIGURACIÓN
# =============================================================
validate_config() {
  step "VALIDANDO CONFIGURACIÓN"
  local missing=()
  [[ -z "$DOCKERHUB_USER"  ]] && missing+=("DOCKERHUB_USER")
  [[ -z "$DOMAIN"          ]] && missing+=("DOMAIN")
  [[ -z "$EMAIL"           ]] && missing+=("EMAIL")
  [[ -z "$DATABASE_URL"    ]] && missing+=("DATABASE_URL")
  [[ -z "$RESEND_API_KEY"  ]] && missing+=("RESEND_API_KEY")
  [[ -z "$MP_ACCESS_TOKEN" ]] && missing+=("MP_ACCESS_TOKEN")
  [[ -z "$MP_PUBLIC_KEY"   ]] && missing+=("MP_PUBLIC_KEY")

  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Faltan variables requeridas en deploy.sh:\n  ${missing[*]}\n\nEdita las variables al inicio del script."
  fi
  ok "Configuración validada"
}

# =============================================================
# VERIFICAR HERRAMIENTAS
# =============================================================
check_tools() {
  step "VERIFICANDO HERRAMIENTAS"
  for tool in aws terraform docker ssh scp openssl curl; do
    if command -v "$tool" &>/dev/null; then
      ok "$tool — $(command -v $tool)"
    else
      err "$tool no está instalado. Instálalo primero."
    fi
  done

  # Verificar credenciales AWS
  if ! aws sts get-caller-identity &>/dev/null; then
    err "AWS no configurado. Ejecuta: aws configure"
  fi
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  ok "AWS Account: ${ACCOUNT_ID} (región: ${AWS_REGION})"
}

# =============================================================
# GENERAR SECRETS SEGUROS
# =============================================================
generate_secrets() {
  step "GENERANDO SECRETS JWT Y WEBHOOK"
  JWT_ACCESS_SECRET=$(openssl rand -hex 64)
  JWT_REFRESH_SECRET=$(openssl rand -hex 64)
  MP_WEBHOOK_SECRET=$(openssl rand -hex 32)
  ok "Secrets generados (guárdalos en un gestor de contraseñas)"
  info "JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:0:20}..."
  info "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:0:20}..."
  info "MP_WEBHOOK_SECRET=${MP_WEBHOOK_SECRET:0:20}..."
}

# =============================================================
# PASO 1 — SSH KEY
# =============================================================
setup_ssh_key() {
  step "PASO 1 — PAR DE LLAVES SSH"
  if [[ -f "${SSH_KEY_PATH}" ]]; then
    warn "Llave SSH ya existe: ${SSH_KEY_PATH}"
  else
    ssh-keygen -t ed25519 -C "teshlex-aws" -f "${SSH_KEY_PATH}" -N ""
    chmod 600 "${SSH_KEY_PATH}"
    ok "Llave SSH generada: ${SSH_KEY_PATH}"
  fi
  SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")
  info "Llave pública: ${SSH_PUB_KEY:0:50}..."
}

# =============================================================
# PASO 2 — TERRAFORM
# =============================================================
run_terraform() {
  step "PASO 2 — TERRAFORM (VPC + EC2 + EIP)"
  cd "${PROJECT_DIR}/infra"

  # Obtener IP pública local para restringir SSH
  MY_IP=$(curl -4s --max-time 5 ifconfig.me 2>/dev/null || echo "0.0.0.0")
  info "Tu IP pública: ${MY_IP} (se usará para restringir SSH)"

  # Actualizar variable ssh_allowed_cidr
  sed -i "s|default     = \"0.0.0.0/0\"|default     = \"${MY_IP}/32\"|" variables.tf

  terraform init -upgrade -reconfigure
  terraform plan -out=tfplan \
    -var="aws_region=${AWS_REGION}" \
    -var="ssh_public_key_path=${SSH_KEY_PATH}.pub"

  echo ""
  warn "Revisa el plan de arriba. ¿Continuar con terraform apply? (s/N)"
  read -r CONFIRM
  [[ "$CONFIRM" =~ ^[sS]$ ]] || err "Deploy cancelado por usuario"

  terraform apply tfplan
  
  SERVER_IP=$(terraform output -raw server_public_ip)
  ok "Infraestructura creada — IP: ${SERVER_IP}"
  echo "$SERVER_IP" > /tmp/teshlex_server_ip
  cd "${PROJECT_DIR}"
}

# =============================================================
# PASO 3 — ESPERAR USERDATA (k3s + Docker + Nginx)
# =============================================================
wait_for_server() {
  step "PASO 3 — ESPERANDO INICIALIZACIÓN DEL SERVIDOR (5 min)"
  SERVER_IP=$(cat /tmp/teshlex_server_ip)
  info "El servidor está instalando k3s, Docker, Nginx..."
  info "Puedes monitorear con:"
  info "  ssh -p 2222 -i ${SSH_KEY_PATH} devsecops@${SERVER_IP} 'sudo tail -f /var/log/userdata.log'"

  for i in $(seq 1 30); do
    echo -n "."
    sleep 10
    # Intentar SSH para ver si el servidor está listo
    if ssh -p 2222 -i "${SSH_KEY_PATH}" \
         -o StrictHostKeyChecking=no \
         -o ConnectTimeout=5 \
         devsecops@${SERVER_IP} \
         "test -f /var/log/userdata.log && grep -q 'COMPLETADO' /var/log/userdata.log" 2>/dev/null; then
      echo ""
      ok "Servidor inicializado correctamente"
      return 0
    fi
  done
  echo ""
  warn "Timeout esperando el servidor — verificar manualmente:"
  warn "ssh -p 2222 -i ${SSH_KEY_PATH} devsecops@${SERVER_IP} 'sudo tail -20 /var/log/userdata.log'"
}

# =============================================================
# PASO 4 — BUILD Y PUSH DOCKER
# =============================================================
build_and_push() {
  step "PASO 4 — BUILD + PUSH IMÁGENES DOCKER"
  cd "${PROJECT_DIR}"

  info "Login Docker Hub..."
  docker login -u "${DOCKERHUB_USER}" \
    || err "Docker login fallido — verifica tu usuario y token"

  # Backend
  info "Building backend..."
  docker build \
    --platform linux/amd64 \
    -t "${DOCKERHUB_USER}/teshlex-backend:latest" \
    ./backend/
  docker push "${DOCKERHUB_USER}/teshlex-backend:latest"
  ok "Backend publicado: ${DOCKERHUB_USER}/teshlex-backend:latest"

  # Frontend
  info "Building frontend..."
  docker build \
    --platform linux/amd64 \
    --build-arg VITE_API_URL="https://${DOMAIN}/api" \
    --build-arg VITE_MP_PUBLIC_KEY="${MP_PUBLIC_KEY}" \
    -t "${DOCKERHUB_USER}/teshlex-frontend:latest" \
    ./frontend/
  docker push "${DOCKERHUB_USER}/teshlex-frontend:latest"
  ok "Frontend publicado: ${DOCKERHUB_USER}/teshlex-frontend:latest"
}

# =============================================================
# PASO 5 — OBTENER KUBECONFIG
# =============================================================
get_kubeconfig() {
  step "PASO 5 — OBTENIENDO KUBECONFIG DE k3s"
  SERVER_IP=$(cat /tmp/teshlex_server_ip)

  ssh -p 2222 -i "${SSH_KEY_PATH}" \
    -o StrictHostKeyChecking=no \
    devsecops@${SERVER_IP} \
    "cat ~/.kube/config" > /tmp/teshlex-kubeconfig

  # Reemplazar localhost por IP del servidor para acceso remoto via tunnel
  sed -i "s|127.0.0.1:6443|${SERVER_IP}:6443|g" /tmp/teshlex-kubeconfig
  export KUBECONFIG=/tmp/teshlex-kubeconfig

  # Abrir puerto 6443 de k3s solo para el deploy (luego cerrar)
  warn "Abriendo puerto 6443 temporalmente en Security Group para kubectl..."
  SG_ID=$(cd infra && terraform output -raw security_group_id 2>/dev/null || \
    aws ec2 describe-security-groups \
      --filters "Name=tag:Name,Values=teshlex-web-sg" \
      --query 'SecurityGroups[0].GroupId' --output text)

  MY_IP=$(curl -4s --max-time 5 ifconfig.me)
  aws ec2 authorize-security-group-ingress \
    --region "${AWS_REGION}" \
    --group-id "${SG_ID}" \
    --protocol tcp --port 6443 \
    --cidr "${MY_IP}/32" 2>/dev/null || true

  # Esperar y verificar
  sleep 5
  kubectl get nodes && ok "kubectl conectado al clúster k3s"
}

# =============================================================
# PASO 6 — CREAR SECRETS EN KUBERNETES
# =============================================================
create_k8s_secrets() {
  step "PASO 6 — CREANDO KUBERNETES SECRETS"
  export KUBECONFIG=/tmp/teshlex-kubeconfig

  # Eliminar secret anterior si existe
  kubectl delete secret teshlex-backend-secrets --ignore-not-found

  kubectl create secret generic teshlex-backend-secrets \
    --from-literal=DATABASE_URL="${DATABASE_URL}" \
    --from-literal=JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET}" \
    --from-literal=JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}" \
    --from-literal=JWT_ACCESS_EXPIRES_IN="15m" \
    --from-literal=JWT_REFRESH_EXPIRES_IN="7d" \
    --from-literal=RESEND_API_KEY="${RESEND_API_KEY}" \
    --from-literal=EMAIL_FROM="${YOUR_EMAIL_FROM:-noreply@tesh.edu.mx}" \
    --from-literal=EMAIL_FROM_NAME="TESH — Cursos de Idiomas" \
    --from-literal=MERCADOPAGO_ACCESS_TOKEN="${MP_ACCESS_TOKEN}" \
    --from-literal=MERCADOPAGO_WEBHOOK_SECRET="${MP_WEBHOOK_SECRET}" \
    --from-literal=FRONTEND_URL="https://${DOMAIN}" \
    --from-literal=BACKEND_URL="https://${DOMAIN}" \
    --from-literal=CORS_ORIGINS="https://${DOMAIN}" \
    --from-literal=NODE_ENV="production" \
    --from-literal=PORT="3000"

  ok "Secrets creados en Kubernetes"
}

# =============================================================
# PASO 7 — DEPLOY EN KUBERNETES
# =============================================================
deploy_k8s() {
  step "PASO 7 — DESPLEGANDO EN KUBERNETES"
  export KUBECONFIG=/tmp/teshlex-kubeconfig
  cd "${PROJECT_DIR}"

  # Actualizar imágenes con el usuario docker hub correcto
  sed -i "s|DOCKERHUB_USER/teshlex-backend:latest|${DOCKERHUB_USER}/teshlex-backend:latest|g" k8s/deployment.yaml
  sed -i "s|DOCKERHUB_USER/teshlex-frontend:latest|${DOCKERHUB_USER}/teshlex-frontend:latest|g" k8s/deployment.yaml

  kubectl apply -f k8s/service.yaml
  kubectl apply -f k8s/deployment.yaml

  info "Esperando rollout del backend..."
  kubectl rollout status deployment/teshlex-backend  --timeout=300s
  info "Esperando rollout del frontend..."
  kubectl rollout status deployment/teshlex-frontend --timeout=300s

  kubectl get pods -l app=teshlex
  ok "Pods desplegados correctamente"
}

# =============================================================
# PASO 8 — NGINX + HTTPS
# =============================================================
setup_nginx() {
  step "PASO 8 — CONFIGURANDO NGINX + HTTPS (Let's Encrypt)"
  SERVER_IP=$(cat /tmp/teshlex_server_ip)

  warn "Asegúrate de que ${DOMAIN} ya apunta a ${SERVER_IP} en No-IP antes de continuar."
  warn "Comprobando DNS..."
  RESOLVED_IP=$(dig +short "${DOMAIN}" 2>/dev/null || nslookup "${DOMAIN}" 2>/dev/null | grep -oP '\d+\.\d+\.\d+\.\d+' | tail -1)
  if [[ "${RESOLVED_IP}" != "${SERVER_IP}" ]]; then
    warn "DNS no resuelve aún (${RESOLVED_IP} != ${SERVER_IP})"
    warn "Espera propagación y vuelve a ejecutar: bash deploy.sh --only-nginx"
    return 0
  fi

  scp -P 2222 -i "${SSH_KEY_PATH}" \
    -o StrictHostKeyChecking=no \
    scripts/nginx-setup.sh \
    devsecops@${SERVER_IP}:/tmp/nginx-setup.sh

  ssh -p 2222 -i "${SSH_KEY_PATH}" \
    -o StrictHostKeyChecking=no \
    devsecops@${SERVER_IP} \
    "sudo bash /tmp/nginx-setup.sh ${DOMAIN} ${EMAIL}"

  ok "Nginx + HTTPS configurado para ${DOMAIN}"
}

# =============================================================
# PASO 9 — CERRAR PUERTO k3s API
# =============================================================
close_k3s_port() {
  step "PASO 9 — CERRANDO PUERTO 6443 (API k3s)"
  MY_IP=$(curl -4s --max-time 5 ifconfig.me)
  SG_ID=$(cd infra && terraform output -raw security_group_id 2>/dev/null || \
    aws ec2 describe-security-groups \
      --filters "Name=tag:Name,Values=teshlex-web-sg" \
      --query 'SecurityGroups[0].GroupId' --output text)

  aws ec2 revoke-security-group-ingress \
    --region "${AWS_REGION}" \
    --group-id "${SG_ID}" \
    --protocol tcp --port 6443 \
    --cidr "${MY_IP}/32" 2>/dev/null || true

  ok "Puerto 6443 cerrado — API k3s no expuesto a internet"
}

# =============================================================
# PASO 10 — VALIDACIÓN FINAL
# =============================================================
validate() {
  step "PASO 10 — VALIDACIÓN FINAL"
  export KUBECONFIG=/tmp/teshlex-kubeconfig

  echo ""
  info "Pods corriendo:"
  kubectl get pods -l app=teshlex

  echo ""
  info "Probando HTTPS..."
  HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    --max-time 15 "https://${DOMAIN}/" || echo "000")
  [[ "$HTTP_CODE" == "200" ]] && ok "Frontend: HTTP ${HTTP_CODE}" \
    || warn "Frontend: HTTP ${HTTP_CODE} (puede necesitar más tiempo)"

  API_CODE=$(curl -sk -o /dev/null -w "%{http_code}" \
    --max-time 15 "https://${DOMAIN}/api/health" || echo "000")
  [[ "$API_CODE" == "200" ]] && ok "Backend API: HTTP ${API_CODE}" \
    || warn "Backend API: HTTP ${API_CODE}"

  echo ""
  info "Headers de seguridad:"
  curl -skI "https://${DOMAIN}/" \
    | grep -E "(Strict-Transport|X-Frame|X-Content|Content-Security)" || true

  echo ""
  info "Certificado SSL:"
  echo | openssl s_client -connect "${DOMAIN}:443" 2>/dev/null \
    | openssl x509 -noout -issuer -dates 2>/dev/null || true

  echo ""
  ok "════════════════════════════════════"
  ok " TeshLex desplegado en producción"
  ok " URL: https://${DOMAIN}"
  ok "════════════════════════════════════"
}

# =============================================================
# MAIN
# =============================================================
main() {
  echo -e "${BOLD}"
  echo "╔═══════════════════════════════════════╗"
  echo "║   TeshLex — Deploy AWS Free Tier      ║"
  echo "╚═══════════════════════════════════════╝"
  echo -e "${NC}"

  # Bandera para solo ejecutar un paso
  if [[ "${1:-}" == "--only-nginx" ]]; then
    SERVER_IP=$(cat /tmp/teshlex_server_ip 2>/dev/null || \
      err "No hay IP guardada. Ejecuta el deploy completo primero.")
    setup_nginx
    exit 0
  fi

  validate_config
  check_tools
  generate_secrets
  setup_ssh_key
  run_terraform
  wait_for_server
  build_and_push
  get_kubeconfig
  create_k8s_secrets
  deploy_k8s
  setup_nginx
  close_k3s_port
  validate
}

main "${@}"
