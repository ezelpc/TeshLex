#!/bin/bash
# scripts/nginx-setup.sh
# Configura Nginx en EC2 como reverse proxy para TeshLex
# Ejecutar como: sudo bash nginx-setup.sh tu-dominio.ddns.net tu@email.com

set -euo pipefail

DOMAIN="${1:?Uso: $0 <dominio> <email>}"
EMAIL="${2:?Uso: $0 <dominio> <email>}"

# ── Configuración Nginx ────────────────────────────────────────────────────────
cat > /etc/nginx/sites-available/teshlex << NGINXEOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=general:10m rate=60r/m;
limit_req_zone \$binary_remote_addr zone=api:10m     rate=30r/m;
limit_conn_zone \$binary_remote_addr zone=conn:10m;

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};

    # TLS (gestionado por certbot)
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.mercadopago.com;" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    server_tokens off;

    # Rate limiting general
    limit_req zone=general burst=20 nodelay;
    limit_conn conn 20;

    # ── Frontend (Vike SPA en puerto 5000 del k3s NodePort) ──────────────
    location / {
        limit_req zone=general burst=30 nodelay;
        proxy_pass         http://127.0.0.1:30500;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # ── Backend API (NestJS en puerto 3000 del k3s NodePort) ─────────────
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass         http://127.0.0.1:30300;
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        client_max_body_size 10m;
    }

    # Bloquear archivos sensibles
    location ~ /\. {
        deny all;
        return 404;
    }
    location ~* \.(env|log|sql|bak|conf)$ {
        deny all;
        return 404;
    }
}
NGINXEOF

# Activar configuración
ln -sf /etc/nginx/sites-available/teshlex /etc/nginx/sites-enabled/teshlex
rm -f /etc/nginx/sites-enabled/default

# Verificar sintaxis
nginx -t

# Obtener certificado SSL (certbot)
echo "⏳ Obteniendo certificado Let's Encrypt para ${DOMAIN}..."
certbot --nginx \
  -d "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}" \
  --redirect

# Recargar Nginx con TLS
systemctl reload nginx

echo "✅ Nginx configurado con HTTPS para ${DOMAIN}"
echo "   Frontend: https://${DOMAIN}/"
echo "   Backend:  https://${DOMAIN}/api/"

# Verificar renovación automática
certbot renew --dry-run && echo "✅ Auto-renovación SSL configurada correctamente"
