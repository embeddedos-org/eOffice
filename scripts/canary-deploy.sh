#!/bin/bash
# eOffice Canary Deployment Script
# Usage: ./scripts/canary-deploy.sh [start|promote|rollback|status]
set -e

export PATH="/home/spatchava/.nvm/versions/node/v20.20.2/bin:/usr/bin:/bin"
PROJECT_DIR="/home/spatchava/embeddedos-org/eOffice"
cd "$PROJECT_DIR"

# Load .env
set -a; source .env 2>/dev/null; set +a

case "${1:-status}" in

  start)
    echo "🚀 Starting canary deployment..."
    echo "   Stable: port 3001 (90% traffic)"
    echo "   Canary: port 3002 (10% traffic)"
    echo ""

    # Stop existing instances
    pm2 delete eoffice-stable eoffice-canary eoffice-api 2>/dev/null || true
    sleep 1

    # Start both instances
    pm2 start ecosystem.canary.config.js
    sleep 5

    echo ""
    pm2 list
    echo ""
    echo "✅ Canary deployment active!"
    echo ""
    echo "Monitor:"
    echo "  pm2 logs eoffice-canary --lines 20"
    echo "  pm2 monit"
    echo ""
    echo "Test canary directly:"
    echo "  curl -b 'canary=true' https://your-domain/api/health"
    echo ""
    echo "Promote when ready:"
    echo "  ./scripts/canary-deploy.sh promote"
    ;;

  promote)
    echo "🎉 Promoting canary to stable..."

    # Stop canary instance
    pm2 delete eoffice-canary 2>/dev/null || true

    # Restart stable on the canary code (it's the same codebase)
    pm2 restart eoffice-stable 2>/dev/null ||       pm2 start ecosystem.config.js --env production

    sleep 3
    pm2 list
    echo ""
    echo "✅ Canary promoted! v2.0.0 is now serving 100% of traffic."
    echo ""
    echo "Switch nginx back to normal config:"
    echo "  cp enterprise/nginx/nginx.conf /etc/nginx/nginx.conf"
    echo "  nginx -s reload"
    ;;

  rollback)
    echo "⚠️  Rolling back canary..."

    # Stop canary
    pm2 delete eoffice-canary 2>/dev/null || true

    # Ensure stable is running
    pm2 restart eoffice-stable 2>/dev/null || true

    sleep 3
    pm2 list
    echo ""
    echo "✅ Canary rolled back. Stable serving 100% of traffic."
    echo ""
    echo "Switch nginx back to normal config:"
    echo "  cp enterprise/nginx/nginx.conf /etc/nginx/nginx.conf"
    echo "  nginx -s reload"
    ;;

  status)
    echo "📊 Canary Deployment Status"
    echo "═══════════════════════════"
    echo ""
    pm2 list 2>/dev/null || echo "  PM2 not running"
    echo ""

    # Check stable health
    echo "Stable (port 3001):"
    STABLE=$(curl -sf --max-time 3 http://localhost:3001/api/health 2>/dev/null) &&       echo "  ✅ $(echo $STABLE | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"v{d.get("version","?")}, uptime {d.get("uptime",0):.0f}s, RSS {d.get("memory",{}).get("rss",0)}MB")' 2>/dev/null)" ||       echo "  ❌ Not reachable"

    # Check canary health
    echo "Canary (port 3002):"
    CANARY=$(curl -sf --max-time 3 http://localhost:3002/api/health 2>/dev/null) &&       echo "  ✅ $(echo $CANARY | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"v{d.get("version","?")}, uptime {d.get("uptime",0):.0f}s, RSS {d.get("memory",{}).get("rss",0)}MB")' 2>/dev/null)" ||       echo "  ❌ Not reachable (normal if canary not deployed)"
    ;;

  *)
    echo "Usage: $0 [start|promote|rollback|status]"
    echo ""
    echo "  start    — Start canary deployment (stable + canary)"
    echo "  promote  — Promote canary to stable (100% traffic)"
    echo "  rollback — Roll back canary, keep stable"
    echo "  status   — Show deployment status"
    exit 1
    ;;
esac
