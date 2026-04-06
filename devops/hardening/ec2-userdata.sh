#!/bin/bash
# 🔐 EC2 HARDENING SCRIPT — TeshLex
# Ejecutado como root en boot
# ⚠️ FAIL2BAN, UFW, SSH restrictivo, k3s + Docker seguro

set -e
set -o pipefail

log(){
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1"
}

error(){
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" >&2
  exit 1
}

log "═══════════════════════════════════════════════════════════════"
log "🔐 INICIANDO HARDENING DEL SISTEMA"
log "═══════════════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────
# 1️⃣ ACTUALIZAR SISTEMA
# ─────────────────────────────────────────────────────────────────
log "Actualizando sistema..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget gnupg2 apt-transport-https ca-certificates software-properties-common

# ─────────────────────────────────────────────────────────────────
# 2️⃣ SSH HARDENING
# ─────────────────────────────────────────────────────────────────
log "🔐 Configurando SSH restrictivo..."

# Crear usuario no-root
if ! id -u devsecops &>/dev/null; then
  useradd -m -s /bin/bash -G sudo devsecops
  log "Usuario 'devsecops' creado"
fi

# Generar SSH key autorizada (reemplazar con tu pub key)
mkdir -p /home/devsecops/.ssh
cat > /home/devsecops/.ssh/authorized_keys << 'EOF'
# ← REEMPLAZA CON TU PUBLIC KEY (ssh-keygen -t ed25519)
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
EOF
chmod 700 /home/devsecops/.ssh
chmod 600 /home/devsecops/.ssh/authorized_keys
chown devsecops:devsecops -R /home/devsecops/.ssh

# 🔐 SSH Config hardened
cat > /etc/ssh/sshd_config.d/99-teshlex-hardening << 'SSHEOFCONFIG'
# TeshLex SSH Hardening

# Puerto personalizado
Port 2222

# Protocolo
Protocol 2
AddressFamily inet

# Autenticación
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
MaxSessions 5
LoginGraceTime 30s

# Comportamiento
X11Forwarding no
AllowTcpForwarding yes
AllowAgentForwarding no
PermitUserEnvironment no
Compression delayed

# Keepalive
ClientAliveInterval 300
ClientAliveCountMax 2

# Logs
LogLevel VERBOSE
SyslogFacility AUTH

# Banner
Banner /etc/ssh/banner.txt

SSHEOFCONFIG

cat > /etc/ssh/banner.txt << 'BANNEREOFCONFIG'
╔════════════════════════════════════════════════════════════════════╗
║                   🔐 SISTEMA PROTEGIDO TESHLEX                     ║
║                    Acceso Restringido Autorizado                   ║
╚════════════════════════════════════════════════════════════════════╝
BANNEREOFCONFIG

# Validar y recargar SSH
sshd -t || error "SSH config inválida"
systemctl reload ssh
log "SSH reconfigurado en puerto 2222 (key-only)"

# ─────────────────────────────────────────────────────────────────
# 3️⃣ UFW FIREWALL — RESTRICTIVO
# ─────────────────────────────────────────────────────────────────
log "🔥 Configurando UFW (Uncomplicated Firewall)..."
apt-get install -y -qq ufw

ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp comment "SSH hardened"
ufw allow 80/tcp comment "HTTP (ACME Let's Encrypt)"
ufw allow 443/tcp comment "HTTPS"

# Verificar
ufw status | head -20

# ─────────────────────────────────────────────────────────────────
# 4️⃣ FAIL2BAN — Protección contra Brute Force
# ─────────────────────────────────────────────────────────────────
log "🛡️  Instalando Fail2Ban..."
apt-get install -y -qq fail2ban

cat > /etc/fail2ban/jail.local << 'FAIL2BANEOFCONFIG'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = root@localhost
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
findtime = 600
bantime = 3600

FAIL2BANEOFCONFIG

systemctl enable fail2ban
systemctl start fail2ban
log "Fail2Ban activado"

# ─────────────────────────────────────────────────────────────────
# 5️⃣ DOCKER — No Root + Seguridad
# ─────────────────────────────────────────────────────────────────
log "🐳 Instalando Docker seguro..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Agregar devsecops al grupo docker
usermod -aG docker devsecops

# 🔐 Docker daemon.json hardening
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'DOCKEREOFCONFIG'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "icc": false,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "userns-remap": "default",
  "seccomp-profile": "/etc/docker/seccomp.json",
  "disable-legacy-registry": true
}
DOCKEREOFCONFIG

systemctl restart docker
log "Docker instalado y configurado"

# ─────────────────────────────────────────────────────────────────
# 6️⃣ K3S — Minimal Kubernetes
# ─────────────────────────────────────────────────────────────────
log "☸️  Instalando k3s v${k3s_version}..."
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${k3s_version}" sh - || error "k3s installation failed"

# Esperar a que k3s esté listo
for i in {1..30}; do
  if kubectl get nodes &>/dev/null; then
    log "k3s está listo"
    break
  fi
  sleep 2
done

# 🔐 Configurar kubeconfig para devsecops
cp /etc/rancher/k3s/k3s.yaml /home/devsecops/.kube/config 2>/dev/null || true
chown -R devsecops:devsecops /home/devsecops/.kube

# ─────────────────────────────────────────────────────────────────
# 7️⃣ SYSCTL HARDENING — Kernel Tweaks
# ─────────────────────────────────────────────────────────────────
log "⚙️  Aplicando kernel hardening..."

cat > /etc/sysctl.d/99-teshlex-hardening.conf << 'SYSCTLEOFCONFIG'
# ─────────────────────────────────────────────────────
# Protección contra ataques de red básicos
# ─────────────────────────────────────────────────────

# Deshabilitar redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv6.conf.all.send_redirects = 0
net.ipv6.conf.default.send_redirects = 0

# Deshabilitar ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Habilitar verificación de fuente
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Habilitar SYN cookies
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_max_syn_backlog = 4096

# Deshabilitar ICMP echo
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Deshabilitar IPv6 si no se usa
net.ipv6.conf.all.disable_ipv6 = 0
net.ipv6.conf.all.forwarding = 0

SYSCTLEOFCONFIG

sysctl -p /etc/sysctl.d/99-teshlex-hardening.conf > /dev/null
log "Kernel hardening aplicado"

# ─────────────────────────────────────────────────────────────────
# 8️⃣ AUDITORIA — Activa desde el inicio
# ─────────────────────────────────────────────────────────────────
log "🔍 Instalando auditaje..."
apt-get install -y -qq auditd

cat > /etc/audit/rules.d/teshlex.rules << 'AUDITEOFRULES'
# Monitorear cambios de configuración
-w /etc/ssh/ -p wa -k sshd_config_changes
-w /etc/sudoers -p wa -k sudoers_changes
-w /var/log/ -p a -k log_changes

# Monitorear syscalls peligrosas
-a always,exit -F arch=b64 -S execve -k exec
AUDITEOFRULES

systemctl restart auditd
log "Auditoría habilitada"

# ─────────────────────────────────────────────────────────────────
# 9️⃣ CREAR DIRECTORIO DE APLICACIÓN
# ─────────────────────────────────────────────────────────────────
log "📁 Preparando directorios de aplicación..."

mkdir -p /opt/teshlex/{app,config,secrets}
chown -R devsecops:devsecops /opt/teshlex
chmod 750 /opt/teshlex

# Crear punto de montaje para docker
mkdir -p ${docker_dir}
chmod 750 ${docker_dir}

# ─────────────────────────────────────────────────────────────────
# 🔟 VERIFICACIÓN FINAL
# ─────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════════════════"
log "✅ HARDENING COMPLETADO"
log "═══════════════════════════════════════════════════════════════"
log ""
log "🔐 Estado de seguridad:"
log "   SSH Port: 2222 (key-only, sin root)"
log "   Firewall: UFW activo (restrictivo)"
log "   Anti-bruteforce: Fail2Ban activo"
log "   Kubernetes: k3s ${k3s_version} configurado"
log "   Usuario: devsecops (no-root)"
log ""
log "📌 Próximos pasos:"
log "   1. Reemplazar authorized_keys con tu public key"
log "   2. Conectar: ssh -i key -p 2222 devsecops@IP"
log "   3. Verificar: sudo systemctl status fail2ban"
log ""
