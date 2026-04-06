#!/bin/bash
# infra/userdata.sh — Hardening automático del servidor TeshLex
# Se ejecuta una sola vez al crear la instancia EC2
set -euxo pipefail
exec > /var/log/userdata.log 2>&1

export DEBIAN_FRONTEND=noninteractive

# ── 1. Actualizar sistema ──────────────────────────────────────────────────────
apt-get update -y
apt-get upgrade -y --no-install-recommends

# ── 2. Crear usuario operativo no-root ────────────────────────────────────────
useradd -m -s /bin/bash devsecops || true
usermod -aG sudo devsecops
echo "devsecops ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/devsecops
chmod 0440 /etc/sudoers.d/devsecops

# Copiar authorized_keys del usuario ubuntu al nuevo usuario
mkdir -p /home/devsecops/.ssh
cp /home/ubuntu/.ssh/authorized_keys /home/devsecops/.ssh/authorized_keys
chown -R devsecops:devsecops /home/devsecops/.ssh
chmod 700 /home/devsecops/.ssh
chmod 600 /home/devsecops/.ssh/authorized_keys

# ── 3. Hardening SSH ──────────────────────────────────────────────────────────
cat > /etc/ssh/sshd_config.d/99-hardening.conf << 'SSHEOF'
Port 2222
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
X11Forwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 10
AllowUsers devsecops
LoginGraceTime 30
SSHEOF

systemctl restart sshd

# ── 4. Firewall UFW ───────────────────────────────────────────────────────────
apt-get install -y ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp comment 'SSH hardened'
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# ── 5. Fail2Ban ───────────────────────────────────────────────────────────────
apt-get install -y fail2ban
cat > /etc/fail2ban/jail.local << 'F2BEOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 3

[sshd]
enabled  = true
port     = 2222
filter   = sshd
logpath  = /var/log/auth.log
maxretry = 3
F2BEOF

systemctl enable fail2ban
systemctl start fail2ban

# ── 6. Docker ─────────────────────────────────────────────────────────────────
curl -fsSL https://get.docker.com | sh
usermod -aG docker devsecops
systemctl enable docker

# ── 7. k3s (Kubernetes ligero — sin Traefik, usaremos Nginx externo) ──────────
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable traefik --write-kubeconfig-mode 644" sh -
systemctl enable k3s

# Configurar kubeconfig para el usuario devsecops
mkdir -p /home/devsecops/.kube
cp /etc/rancher/k3s/k3s.yaml /home/devsecops/.kube/config
chown -R devsecops:devsecops /home/devsecops/.kube
chmod 600 /home/devsecops/.kube/config

# ── 8. Nginx + Certbot ────────────────────────────────────────────────────────
apt-get install -y nginx certbot python3-certbot-nginx

# Deshabilitar configuración default
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx

# ── 9. kubectl ───────────────────────────────────────────────────────────────
KUBECTL_VER=$(curl -s https://dl.k8s.io/release/stable.txt)
curl -LO "https://dl.k8s.io/release/${KUBECTL_VER}/bin/linux/amd64/kubectl"
chmod +x kubectl
mv kubectl /usr/local/bin/kubectl

# ── 10. Seguridad adicional ───────────────────────────────────────────────────
# Deshabilitar core dumps
echo "* hard core 0" >> /etc/security/limits.conf
echo "fs.suid_dumpable = 0" >> /etc/sysctl.conf

# Habilitar protecciones de red
cat >> /etc/sysctl.conf << 'SYSCTLEOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
SYSCTLEOF
sysctl -p

echo "=== TeshLex UserData: COMPLETADO $(date) ===" >> /var/log/userdata.log
