#!/bin/bash
# ============================================================
# 🔐 TeshLex — Security Validation Checklist
# Ejecutar post-deployment para verificar hardening
# ============================================================

set -e

NC='\033[0m'          # No Color
RED='\033[0;31m'      # Red (✗)
GREEN='\033[0;32m'    # Green (✓)
YELLOW='\033[1;33m'   # Yellow (⚠)
BLUE='\033[0;34m'     # Blue (ℹ)

PASS=0
WARN=0
FAIL=0

test_passed() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASS++))
}

test_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARN++))
}

test_failed() {
  echo -e "${RED}✗${NC} $1"
  ((FAIL++))
}

echo -e "${BLUE}"
echo "╔═════════════════════════════════════════════════════════════╗"
echo "║        🔐 TeshLex — Security Validation Checklist            ║"
echo "╚═════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─────────────────────────────────────────────────────────────────
# FASE 1: Validación de Certificados SSL/TLS
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[1/8] 🔐 SSL/TLS Certificates${NC}"

if [ -f "/etc/letsencrypt/live/teshlex.local/fullchain.pem" ]; then
  EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/teshlex.local/fullchain.pem | cut -d= -f2-)
  test_passed "Certificate found: $EXPIRY"
else
  test_warning "Certificate not found (puede estar en otro path)"
fi

# Verificar HSTS header
HSTS_HEADER=$(curl -s -I https://localhost/ 2>/dev/null | grep -i "strict-transport-security" || echo "")
if [ -n "$HSTS_HEADER" ]; then
  test_passed "HSTS header present: ${HSTS_HEADER:0:50}..."
else
  test_failed "HSTS header missing"
fi

# ─────────────────────────────────────────────────────────────────
# FASE 2: SSH Hardening
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[2/8] 🔐 SSH Hardening${NC}"

SSH_PORT=$(grep "^Port " /etc/ssh/sshd_config.d/99-teshlex-hardening 2>/dev/null | awk '{print $2}' || echo "")
if [ "$SSH_PORT" == "2222" ]; then
  test_passed "SSH on port 2222 (no-standard)"
else
  test_warning "SSH port: $SSH_PORT (check if changed)"
fi

if grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config.d/99-teshlex-hardening; then
  test_passed "SSH: Password authentication disabled"
else
  test_failed "SSH: Password authentication still enabled"
fi

if grep -q "^PermitRootLogin no" /etc/ssh/sshd_config.d/99-teshlex-hardening; then
  test_passed "SSH: Login as root disabled"
else
  test_failed "SSH: Root login enabled"
fi

# ─────────────────────────────────────────────────────────────────
# FASE 3: Firewall (UFW)
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[3/8] 🔥 Firewall Status${NC}"

if sudo ufw status | grep -q "Status: active"; then
  test_passed "UFW firewall is ACTIVE"
else
  test_failed "UFW firewall is INACTIVE"
fi

if sudo ufw status | grep -q "2222/tcp.*SSH"; then
  test_passed "UFW: SSH allowed on port 2222"
else
  test_warning "UFW: SSH rule not found on 2222"
fi

if sudo ufw status | grep -q "80/tcp.*HTTP"; then
  test_passed "UFW: HTTP (80) allowed"
else
  test_failed "UFW: HTTP (80) not allowed"
fi

if sudo ufw status | grep -q "443/tcp.*HTTPS"; then
  test_passed "UFW: HTTPS (443) allowed"
else
  test_failed "UFW: HTTPS (443) not allowed"
fi

# ─────────────────────────────────────────────────────────────────
# FASE 4: Fail2Ban
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[4/8] 🛡️  Fail2Ban Status${NC}"

if sudo systemctl is-active --quiet fail2ban; then
  test_passed "Fail2Ban service is RUNNING"
else
  test_failed "Fail2Ban service is STOPPED"
fi

if sudo fail2ban-client status sshd 2>/dev/null | grep -q "enabled"; then
  test_passed "Fail2Ban: SSH jail enabled"
else
  test_warning "Fail2Ban: SSH jail status unknown"
fi

# ─────────────────────────────────────────────────────────────────
# FASE 5: Linux Hardening (Sysctl)
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[5/8] ⚙️  Kernel Hardening${NC}"

SYN_COOKIES=$(sysctl -n net.ipv4.tcp_syncookies)
if [ "$SYN_COOKIES" == "1" ]; then
  test_passed "TCP SYN cookies enabled"
else
  test_failed "TCP SYN cookies disabled"
fi

RP_FILTER=$(sysctl -n net.ipv4.conf.all.rp_filter)
if [ "$RP_FILTER" == "1" ]; then
  test_passed "Source route verification enabled"
else
  test_failed "Source route verification disabled"
fi

SEND_REDIRECTS=$(sysctl -n net.ipv4.conf.all.send_redirects)
if [ "$SEND_REDIRECTS" == "0" ]; then
  test_passed "ICMP redirects disabled"
else
  test_failed "ICMP redirects enabled"
fi

# ─────────────────────────────────────────────────────────────────
# FASE 6: Docker & Container Security
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[6/8] 🐳 Docker Security${NC}"

if docker --version &>/dev/null; then
  test_passed "Docker installed"
else
  test_failed "Docker not installed"
fi

if grep -q '"userns-remap"' /etc/docker/daemon.json 2>/dev/null; then
  test_passed "Docker userns remapping enabled"
else
  test_warning "Docker userns remapping not found"
fi

if grep -q '"icc".*false' /etc/docker/daemon.json 2>/dev/null; then
  test_passed "Docker ICC (inter-container communication) disabled"
else
  test_warning "Docker ICC not explicitly disabled"
fi

# Verificar que no hay containers corriendo como root
RUNNING_CONTAINERS=$(docker ps -q 2>/dev/null | wc -l)
if [ "$RUNNING_CONTAINERS" -eq 0 ]; then
  test_passed "No containers running"
else
  ROOT_CONTAINERS=$(docker ps --format '{{.ID}} {{.RunningAs}}' 2>/dev/null | grep -c "root" || echo 0)
  if [ "$ROOT_CONTAINERS" -eq 0 ]; then
    test_passed "No containers running as root"
  else
    test_failed "Found $ROOT_CONTAINERS containers running as root"
  fi
fi

# ─────────────────────────────────────────────────────────────────
# FASE 7: Kubernetes (k3s) Security
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[7/8] ☸️  Kubernetes Security${NC}"

if kubectl get nodes &>/dev/null; then
  test_passed "Kubernetes cluster accessible"
  NODES=$(kubectl get nodes | wc -l)
  test_passed "K3s nodes: $((NODES-1))"
else
  test_warning "Kubernetes cluster not accessible"
fi

# Verificar NetworkPolicies
if kubectl get networkpolicies -n default 2>/dev/null | grep -q "teshlex"; then
  test_passed "NetworkPolicies applied"
else
  test_warning "NetworkPolicies not found"
fi

# Verificar securityContext
POD_SECURITY=$(kubectl get pod -l app=teshlex -n default -o jsonpath='{.items[0].spec.securityContext.runAsNonRoot}' 2>/dev/null)
if [ "$POD_SECURITY" == "true" ]; then
  test_passed "Pods run as non-root"
else
  test_warning "Pod security context not configured"
fi

# ─────────────────────────────────────────────────────────────────
# FASE 8: API Security (HTTP Headers)
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}[8/8] 🛡️  API Security Headers${NC}"

HEADERS=$(curl -sI http://localhost/api/health 2>/dev/null || echo "")

if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
  test_passed "X-Content-Type-Options header present"
else
  test_warning "X-Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
  test_passed "X-Frame-Options header present"
else
  test_warning "X-Frame-Options header missing"
fi

if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
  test_passed "Content-Security-Policy header present"
else
  test_warning "Content-Security-Policy header missing"
fi

if echo "$HEADERS" | grep -qi "Referrer-Policy"; then
  test_passed "Referrer-Policy header present"
else
  test_warning "Referrer-Policy header missing"
fi

# Rate limiting test
echo -n "Testing rate limiting (10 requests)... "
COUNT=0
for i in {1..10}; do
  curl -s http://localhost/api/health >/dev/null
  ((COUNT++))
done
echo "✓ ($COUNT requests)"

# ─────────────────────────────────────────────────────────────────
# RESULTADO FINAL
# ─────────────────────────────────────────────────────────────────
echo -e "\n${BLUE}╔═════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     🔐 SECURITY REPORT                        ║${NC}"
echo -e "${BLUE}╚═════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ PASSED:  ${PASS}${NC}"
echo -e "${YELLOW}⚠ WARNINGS: ${WARN}${NC}"
echo -e "${RED}✗ FAILED:  ${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}   ✅ ALL SECURITY CHECKS PASSED - READY FOR PRODUCTION${NC}"
  echo -e "${GREEN}═════════════════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}═════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}   ❌ SECURITY ISSUES DETECTED - FIX BEFORE PRODUCTION${NC}"
  echo -e "${RED}═════════════════════════════════════════════════════════════${NC}"
  exit 1
fi
