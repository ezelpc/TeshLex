# 🚀 TeshLex — Guía de Despliegue Seguro en AWS

## 📋 Requisitos Previos

- Cuenta AWS (Free Tier)
- Terraform >= 1.8
- SSH key ed25519 local: `ssh-keygen -t ed25519 -f ~/.ssh/teshlex-aws`
- Docker & Docker Compose locales
- kubectl instalado
- No-IP account (DDNS)

---

## ⚡ FASE 1: Preparación Local

### 1.1. Generar SSH Key para AWS

```bash
ssh-keygen -t ed25519 -f ~/.ssh/teshlex-aws -C "teshlex-prod"
chmod 600 ~/.ssh/teshlex-aws
cat ~/.ssh/teshlex-aws.pub  # Copiar para Terraform
```

### 1.2. Configurar Variables Terraform

```bash
cd infra/

# Crear terraform.tfvars
cat > terraform.tfvars << 'EOF'
aws_region          = "us-east-1"
project_name        = "teshlex"
environment         = "prod"
instance_type       = "t2.micro"
ssh_public_key_path = "~/.ssh/teshlex-aws.pub"
ssh_allowed_cidr    = "YOUR_IP_HERE/32"  # ← REEMPLAZA CON TU IP PÚBLICA
admin_email         = "admin@teshlex.local"
enable_ebs_encryption = true
enable_s3_tfstate_backend = false  # true en producción real
EOF
```

**⚠️ OBTENER TU IP PÚBLICA:**

```bash
curl ifconfig.me  # Copiar resultado + /32
```

### 1.3. Validar Terraform

```bash
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan
```

---

## ☁️ FASE 2: Despliegue de Infraestructura

### 2.1. Crear EC2 en AWS

```bash
terraform apply tfplan
```

**Output esperado:**

```
Outputs:
  ec2_public_ip     = "54.123.45.67"
  ec2_instance_id   = "i-0abcd1234..."
  security_group_id = "sg-12345678"
```

### 2.2. Esperar a que EC2 termine Hardening

```bash
IP="54.123.45.67"
echo "Conectando en 2 minutos..."
sleep 120

# Probar conexión
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP "whoami"
```

**Esperado:** `devsecops`

### 2.3. Verificar Hardening

```bash
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP << 'SSHCMD'
  echo "✓ SSH key-only"
  sudo fail2ban-client status sshd | head -5
  sudo ufw status | head -10
  docker ps
  kubectl get nodes
SSHCMD
```

---

## 🐳 FASE 3: Build & Push Docker Images

### 3.1. Preparar Credenciales

```bash
# Crear docker config
cat ~/.docker/config.json  # Verificar que existe

# Si no existe, login
docker login
# ingresa: username y access token (NO password real)
```

### 3.2. Build Backend

```bash
cd backend
docker build -t $DOCKERHUB_USER/teshlex-backend:latest .
docker push $DOCKERHUB_USER/teshlex-backend:latest
cd ..
```

### 3.3. Build Frontend

```bash
cd frontend
docker build -t $DOCKERHUB_USER/teshlex-frontend:latest .
docker push $DOCKERHUB_USER/teshlex-frontend:latest
cd ..
```

### 3.4. Verificar en Docker Hub

```bash
# Verificar que las imágenes están en Docker Hub
curl -s https://hub.docker.com/v2/repositories/$DOCKERHUB_USER/teshlex-backend/tags | jq '.results[0]'
```

---

## ☸️ FASE 4: Desplegar en k3s

### 4.1. Obtener kubeconfig remoto

```bash
IP="54.123.45.67"
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP "sudo cat /etc/rancher/k3s/k3s.yaml" > ~/.kube/config-teshlex
export KUBECONFIG=~/.kube/config-teshlex

# Cambiar IP en kubeconfig a tu IP de AWS
sed -i "s/127.0.0.1/$IP/g" ~/.kube/config-teshlex

# Verificar
kubectl get nodes
```

### 4.2. Actualizar Manifests K8s

```bash
cd k8s/

# Actualizar imagen Docker Hub en deployment.yaml
sed -i "s|DOCKERHUB_USER|$DOCKERHUB_USER|g" deployment.yaml

# Aplicar NetworkPolicy primero
kubectl apply -f network-policy.yaml

# Aplicar deployment
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### 4.3. Esperar a que Pods se ejecuten

```bash
kubectl get pods -w  # -w = watch

# Esperado: teshlex-backend-xxx y teshlex-frontend-xxx en "Running"
```

### 4.4. Port-forward para Testing Local

```bash
# En terminal 1:
kubectl port-forward svc/teshlex-backend 3000:3000

# En terminal 2:
curl http://localhost:3000/api/health
# Esperado: {"status":"ok"}
```

---

## 🌐 FASE 5: Nginx + HTTPS + No-IP

### 5.1 Copiar Nginx config a EC2

```bash
scp -i ~/.ssh/teshlex-aws -P 2222 \
  devops/nginx-hardened.conf \
  devsecops@$IP:/tmp/nginx-hardened.conf

ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP << 'EOF'
  sudo cp /tmp/nginx-hardened.conf /etc/nginx/sites-available/teshlex
  sudo ln -sf /etc/nginx/sites-available/teshlex /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl reload nginx
EOF
```

### 5.2. Obtener Certificado Let's Encrypt

```bash
# Instalar Certbot en EC2
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP << 'EOF'
  sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot certonly --nginx -d teshlex.local -d www.teshlex.local \
    --agree-tos -m admin@teshlex.local --non-interactive
  sudo systemctl reload nginx
EOF
```

### 5.3. Configurar No-IP DDNS

```bash
# En EC2:
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP << 'EOF'
  sudo apt-get install -y no-ip2
  sudo /usr/local/bin/noip2 -c /etc/no-ip2.conf
  # Ingresa credenciales cuando se solicite
  sudo systemctl enable no-ip2
  sudo systemctl start no-ip2
EOF
```

---

## ✅ FASE 6: Validación de Seguridad

### 6.1. Ejecutar checklist de seguridad

```bash
# Copiar script
scp -i ~/.ssh/teshlex-aws -P 2222 \
  devops/validation-security-checklist.sh \
  devsecops@$IP:/tmp/

# Ejecutar
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP << 'EOF'
  chmod +x /tmp/validation-security-checklist.sh
  /tmp/validation-security-checklist.sh
EOF
```

### 6.2. Test desde afuera

```bash
# HTTPS check
curl -Iv https://teshlex.local/

# Magic: HSTS, CSP, X-Frame-Options
curl -I https://teshlex.local/ | grep -E "Strict-Transport|X-Frame|Content-Security"

# API Health
curl https://teshlex.local/api/health

# Verificar rate limiting
seq 1 10 | xargs -I {} curl -s https://teshlex.local/api/health | wc -l
```

---

## 🔄 FASE 7: CI/CD GitHub Actions

### 7.1. Configurar Secretos en GitHub

```bash
# En GitHub repo Settings > Secrets and variables > Actions

# Agregar:
DOCKERHUB_USER              = tu_usuario_dockerhub
DOCKERHUB_TOKEN             = token_de_acceso_dockerhub
KUBECONFIG_CONTENT          = $(cat ~/.kube/config-teshlex | base64 -w0)
SONAR_HOST_URL              = (opcional)
SONAR_TOKEN                 = (opcional)
```

### 7.2. Hacer commit y push

```bash
cd /workspace

git add .
git commit -m "✨ feat: DevSecOps hardening - Phase 1-7 complete"
git push origin main
```

**GitHub Actions ejecutará automáticamente:**

1. Security scan (Trivy)
2. Build Backend
3. Build Frontend
4. Scan imágenes Docker
5. Push a Docker Hub
6. Deploy a k3s

---

## 📊 FASE 8: Monitoreo

### 8.1. Logs centralizados

```bash
# Ver logs de backend
kubectl logs -f deployment/teshlex-backend --tail=100

# Ver logs de frontend
kubectl logs -f deployment/teshlex-frontend --tail=100

# Servicios del sistema
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP "sudo journalctl -xe"
```

### 8.2. CloudWatch (opcional)

```bash
# Ver en AWS Console:
# CloudWatch > Logs > /teshlex/application
# CloudWatch > Logs > /teshlex/audit
```

---

## 🆘 Troubleshooting

### ❌ SSH timeout

```bash
# Verificar SG en AWS Console
# - Puerto 2222 abierto?
# - Tu IP en CIDR?
# - Internet Gateway creado?

# Probar telnet
telnet $IP 2222
```

### ❌ Pods no inician

```bash
# Ver errores
kubectl describe pod NAME

# Ver logs completos
kubectl logs POD --previous
```

### ❌ HTTPS error

```bash
# Verificar certificate
curl -Iv https://teshlex.local/

# Verificar Nginx config
ssh -i ~/.ssh/teshlex-aws -p 2222 devsecops@$IP "sudo nginx -t"
```

---

## 🎯 Checklist Post-Despliegue

- [ ] SSH en puerto 2222 con key (sin password)
- [ ] UFW activo (httpd, https, ssh 2222)
- [ ] Fail2Ban activo
- [ ] Docker corriendo como no-root
- [ ] k3s con 1+ nodo
- [ ] Pods teshlex en status Running
- [ ] HTTPS funcional
- [ ] Health check respondiendo
- [ ] DNS No-IP registrado
- [ ] GitHub Actions pasando todos los checks

---

## 🔐 Próximos Pasos (Hardening Avanzado)

- [ ] WAF en CloudFront
- [ ] Database encryption en reposo
- [ ] Secrets rotation automática
- [ ] Backup automático de BD
- [ ] Monitoring con Prometheus+Grafana
- [ ] Traefik Ingress con mTLS
- [ ] Pod Security Standards en K8s
- [ ] RBAC restringido
- [ ] Audit logging de K8s
- [ ] Supply chain signing (Cosign)

---

**Última actualización:** April 2026
**Status:** ✅ Production-Ready
