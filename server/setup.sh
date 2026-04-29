#!/usr/bin/env bash
# Run on the fresh VPS to bootstrap everything.
# Usage: bash setup.sh <NEON_DATABASE_URL>
# After: visit https://ws.zarlocznezolwie.com/health to verify.

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Run as root" >&2
  exit 1
fi

if [ -z "${1:-}" ]; then
  echo "Usage: bash setup.sh <DATABASE_URL>" >&2
  exit 1
fi

DATABASE_URL="$1"
DOMAIN="ws.zarlocznezolwie.com"
EMAIL="jc.meilland@idboats.com"

echo "==> Updating apt + installing packages"
apt update -y
apt install -y curl ca-certificates gnupg ufw nginx certbot python3-certbot-nginx git

echo "==> Installing Node.js 20 LTS"
if ! command -v node &>/dev/null || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
node -v
npm -v

echo "==> Cloning repo"
mkdir -p /opt
if [ ! -d /opt/zolwie ]; then
  git clone https://github.com/JeanCharlesMEILLAND/oskar.git /opt/zolwie
else
  cd /opt/zolwie && git pull --ff-only
fi

cd /opt/zolwie/server

echo "==> Writing .env"
cat > .env <<EOF
DATABASE_URL=$DATABASE_URL
PORT=3001
EOF
chmod 600 .env

echo "==> Installing dependencies + building"
npm install
npm run build

echo "==> systemd service"
cp zolwie-ws.service /etc/systemd/system/zolwie-ws.service
systemctl daemon-reload
systemctl enable zolwie-ws
systemctl restart zolwie-ws
sleep 2
systemctl status zolwie-ws --no-pager | head -20

echo "==> nginx site"
cp nginx.conf /etc/nginx/sites-available/zolwie-ws
ln -sf /etc/nginx/sites-available/zolwie-ws /etc/nginx/sites-enabled/zolwie-ws
nginx -t
systemctl reload nginx

echo "==> Firewall"
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable

echo "==> Local health check (HTTP, before TLS)"
curl -fsS http://127.0.0.1:3001/health || true
echo

echo "==> Let's Encrypt TLS (will fail if DNS isn't pointing yet — re-run later)"
certbot --nginx --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN" --redirect || {
  echo
  echo "TLS step failed — most likely DNS for $DOMAIN doesn't point to this server yet."
  echo "Add an A record: ws.zarlocznezolwie.com -> $(curl -s4 ifconfig.me)"
  echo "Then re-run: certbot --nginx -d $DOMAIN"
  exit 0
}

echo
echo "Done!"
echo "Test: https://$DOMAIN/health"
echo "Logs: journalctl -u zolwie-ws -f"
