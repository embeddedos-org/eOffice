# eOffice v2.0.0 — Deployment Runbook

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker Compose)](#quick-start-docker-compose)
3. [Environment Configuration](#environment-configuration)
4. [TLS/HTTPS Setup](#tlshttps-setup)
5. [Database Management](#database-management)
6. [AI Provider Setup](#ai-provider-setup)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Backup & Recovery](#backup--recovery)
9. [Scaling & Performance](#scaling--performance)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Docker | 24.0+ | 27.0+ |
| Docker Compose | v2.20+ | v2.30+ |
| RAM | 1 GB | 4 GB |
| Disk | 2 GB | 20 GB |
| CPU | 1 core | 4 cores |
| OS | Linux (any), macOS, Windows+WSL2 | Ubuntu 22.04+ |

```bash
# Verify prerequisites
docker --version       # Docker 24.0+
docker compose version # v2.20+
openssl version        # For generating secrets
```

---

## Quick Start (Docker Compose)

### Step 1: Pull Images
```bash
docker pull ghcr.io/embeddedos-org/eoffice:v2.0.0-staging
docker pull ghcr.io/embeddedos-org/eoffice-nginx:v2.0.0-staging
```

### Step 2: Create Environment File
```bash
# Generate a secure JWT secret
export JWT_SECRET=$(openssl rand -hex 64)

# Create .env file
cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
PORT=3001
STORAGE_BACKEND=sqlite
LOG_LEVEL=info
CORS_ORIGINS=https://your-domain.com
EOF
```

### Step 3: Start Services
```bash
docker compose up -d
```

### Step 4: Verify
```bash
# Check health
curl http://localhost:3001/api/health

# Check readiness
curl http://localhost:3001/api/ready

# Expected response:
# {"status":"ok","version":"2.0.0","uptime":...}
```

### Step 5: Create First Admin User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@company.com","password":"SecurePass123!"}'
```

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | **REQUIRED in production.** JWT signing key. Min 64 chars. | `openssl rand -hex 64` |

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` for production |
| `PORT` | `3001` | API server port |
| `CORS_ORIGINS` | `localhost:5170-5183` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` | `trace\|debug\|info\|warn\|error\|fatal` |

### Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_BACKEND` | `sqlite` | `sqlite` or `file` |
| `EOFFICE_DB_PATH` | `~/.eoffice/eoffice.db` | SQLite database file path |

### AI Providers (configure at least one for AI features)

| Variable | Provider | Model |
|----------|----------|-------|
| `OPENAI_API_KEY` | OpenAI | gpt-4o-mini |
| `OPENAI_MODEL` | OpenAI | Override model |
| `ANTHROPIC_API_KEY` | Anthropic | claude-3-haiku |
| `ANTHROPIC_MODEL` | Anthropic | Override model |
| `OLLAMA_URL` | Ollama (local) | llama3.2 |
| `OLLAMA_MODEL` | Ollama | Override model |
| `EAI_BASE_URL` | EAI hardware | Custom |

### Backup Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `EOFFICE_BACKUP_DIR` | `~/.eoffice/backups` | Backup storage directory |
| `EOFFICE_MAX_BACKUPS` | `7` | Max backups to retain |
| `EOFFICE_BACKUP_INTERVAL_HOURS` | `24` | Auto-backup interval |

### Clustering

| Variable | Default | Description |
|----------|---------|-------------|
| `CLUSTER_WORKERS` | CPU count | Number of worker processes |

---

## TLS/HTTPS Setup

### Option A: Self-Signed Certificate (Development/Testing)
```bash
cd enterprise/nginx/ssl
bash ../generate-self-signed-cert.sh
# Generates: eoffice.crt + eoffice.key
```

### Option B: Let's Encrypt (Production)
```bash
# Install certbot
apt install certbot

# Generate certificate
certbot certonly --standalone -d eoffice.your-domain.com

# Copy certs
cp /etc/letsencrypt/live/eoffice.your-domain.com/fullchain.pem enterprise/nginx/ssl/eoffice.crt
cp /etc/letsencrypt/live/eoffice.your-domain.com/privkey.pem enterprise/nginx/ssl/eoffice.key

# Set up auto-renewal cron
echo "0 3 * * * certbot renew --quiet && docker compose restart nginx" | crontab -
```

### Option C: Corporate CA Certificate
```bash
# Place your CA-signed cert and key:
cp your-cert.pem enterprise/nginx/ssl/eoffice.crt
cp your-key.pem enterprise/nginx/ssl/eoffice.key
```

After placing certificates, restart nginx:
```bash
docker compose restart nginx
```

Verify HTTPS:
```bash
curl -k https://localhost/api/health
```

---

## Database Management

### SQLite Location
- **Docker**: `/data/.eoffice/eoffice.db` (mapped to `eoffice-data` volume)
- **Native**: `~/.eoffice/eoffice.db`

### Migration from JSON Files
On first startup with `STORAGE_BACKEND=sqlite`, existing JSON files in `~/.eoffice/data/` are automatically migrated to SQLite. No manual action needed.

### Database Inspection
```bash
# Enter the container
docker compose exec eoffice sh

# Inspect database
sqlite3 /data/.eoffice/eoffice.db

# List tables
.tables

# Count documents
SELECT COUNT(*) FROM documents;

# Check database size
.dbinfo
```

### Manual Backup
```bash
# Via API (requires admin token)
curl -X POST http://localhost:3001/api/admin/backups \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Via docker cp
docker compose exec eoffice sqlite3 /data/.eoffice/eoffice.db ".backup '/tmp/backup.db'"
docker cp $(docker compose ps -q eoffice):/tmp/backup.db ./eoffice-backup-$(date +%Y%m%d).db
```

---

## AI Provider Setup

The system uses a fallback chain: **OpenAI → Anthropic → Ollama → EAI → Rule-based**

### OpenAI (Recommended for best results)
```bash
# Add to .env
OPENAI_API_KEY=sk-...your-key...
```

### Anthropic Claude
```bash
ANTHROPIC_API_KEY=sk-ant-...your-key...
```

### Ollama (Free, Local, Private)
```bash
# Install Ollama on the host
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2

# Add to .env
OLLAMA_URL=http://host.docker.internal:11434
```

### Verify AI Status
```bash
# Register and get token first, then:
curl http://localhost:3001/api/ebot/status \
  -H "Authorization: Bearer $TOKEN"

# Response shows which providers are available:
# {"status":"ok","providers":[{"name":"openai","available":true},...]}
```

---

## Monitoring & Health Checks

### Health Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/health` | No | Liveness probe — server is running |
| `GET /api/ready` | No | Readiness probe — dependencies ready |
| `GET /api/ebot/status` | Yes | AI provider status |

### Health Check Response
```json
{
  "status": "ok",
  "version": "2.0.0",
  "uptime": 3600,
  "timestamp": "2026-04-28T12:00:00.000Z",
  "memory": {
    "rss": 85,
    "heapUsed": 42
  }
}
```

### Docker Health Check
Docker Compose includes a built-in health check (every 30s, 5s timeout, 3 retries):
```bash
docker compose ps   # Shows health status
docker inspect --format='{{.State.Health.Status}}' $(docker compose ps -q eoffice)
```

### Log Monitoring
```bash
# Stream live logs
docker compose logs -f eoffice

# Last 100 lines
docker compose logs --tail=100 eoffice

# Filter errors only
docker compose logs eoffice 2>&1 | grep -i error

# PM2 logs (if using PM2 instead of Docker)
pm2 logs eoffice-api --lines 50
```

### Log Format (Production)
```json
{"level":"info","time":"2026-04-28T12:00:00.000Z","msg":"Request completed","requestId":"m1abc-1","method":"GET","url":"/api/health","status":200,"duration":2,"ip":"172.18.0.1"}
```

### Key Metrics to Monitor

| Metric | Where | Alert Threshold |
|--------|-------|----------------|
| Response time | Request logs (`duration` field) | > 5000ms |
| Memory RSS | `/api/health` → `memory.rss` | > 450 MB |
| Error rate | Logs with `level: "error"` | > 5/min |
| Uptime | `/api/health` → `uptime` | Reset = crash restart |
| Disk usage | `df -h` on data volume | > 80% |
| Backup age | `/api/admin/backups` | > 48 hours |
| AI provider | `/api/ebot/status` | All providers unavailable |

### External Monitoring (Recommended)
```bash
# Simple uptime check with curl (add to cron)
*/5 * * * * curl -sf http://localhost:3001/api/health > /dev/null || echo "eOffice DOWN" | mail -s "ALERT" ops@company.com

# Or use UptimeRobot, Healthchecks.io, or Prometheus
```

---

## Backup & Recovery

### Automatic Backups
In production (`NODE_ENV=production`), backups run automatically:
- **Frequency**: Every 24 hours (configurable via `EOFFICE_BACKUP_INTERVAL_HOURS`)
- **Retention**: 7 most recent (configurable via `EOFFICE_MAX_BACKUPS`)
- **Location**: `~/.eoffice/backups/` or `EOFFICE_BACKUP_DIR`
- **Method**: SQLite `.backup` command (safe during writes)

### Manual Backup via API
```bash
# Create backup
curl -X POST http://localhost:3001/api/admin/backups \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List backups
curl http://localhost:3001/api/admin/backups \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Restore from Backup
```bash
# Via API (requires server restart after)
curl -X POST http://localhost:3001/api/admin/backups/restore \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backupName":"eoffice-backup-2026-04-28T12-00-00-000Z.db"}'

# Restart to use restored database
docker compose restart eoffice
```

### Off-Site Backup
```bash
# Copy latest backup to S3 (daily cron)
0 4 * * * docker cp $(docker compose ps -q eoffice):/data/.eoffice/backups/ /tmp/eoffice-backups && \
  aws s3 sync /tmp/eoffice-backups s3://your-bucket/eoffice-backups/ --delete
```

---

## Scaling & Performance

### Single Server (< 50 users)
Default Docker Compose setup is sufficient. SQLite handles reads well and WAL mode handles concurrent writes.

### Medium Scale (50-200 users)
```bash
# Use PM2 cluster mode (multiple Node.js processes)
# Note: SQLite with WAL mode supports multiple readers but single writer
pm2 start ecosystem.config.js --env production
```

### Performance Tuning
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=1024"

# Enable SQLite WAL mode (already default)
# Increase SQLite cache size in sqlite-store.ts if needed

# Nginx: tune worker_connections in nginx.conf
# Default: 1024 connections per worker
```

---

## Troubleshooting

### Server Won't Start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FATAL: JWT_SECRET required` | Missing JWT_SECRET in production | Set `JWT_SECRET` env var |
| `EADDRINUSE: port 3001` | Port already in use | `fuser -k 3001/tcp` or change `PORT` |
| `better-sqlite3` build error | Missing native dependencies | `apt install build-essential python3` |
| Container exits immediately | Check logs | `docker compose logs eoffice` |

### Common Issues

**"Authentication expired" on all requests**
```bash
# JWT_SECRET changed between restarts — all tokens are invalidated
# Users must re-login. Use a persistent JWT_SECRET.
```

**AI features return "rule-based" responses**
```bash
# No AI provider configured. Set at least one:
OPENAI_API_KEY=sk-...
# or
OLLAMA_URL=http://localhost:11434
```

**Database locked errors**
```bash
# Too many concurrent writers. SQLite WAL mode helps but has limits.
# Consider reducing CLUSTER_WORKERS to 1 for write-heavy workloads.
```

**Nginx 502 Bad Gateway**
```bash
# API server not running or not reachable
docker compose ps          # Check eoffice is healthy
docker compose logs eoffice # Check for crash
docker compose restart eoffice
```

### Debug Mode
```bash
# Enable verbose logging
LOG_LEVEL=debug docker compose up eoffice
```

---

## Rollback Procedure

### Step 1: Identify the Problem
```bash
docker compose logs --tail=50 eoffice
curl http://localhost:3001/api/health
```

### Step 2: Roll Back Docker Image
```bash
# Pull previous version
docker pull ghcr.io/embeddedos-org/eoffice:previous-sha

# Update docker-compose.yml image tag, then:
docker compose up -d eoffice
```

### Step 3: Roll Back Database (if needed)
```bash
# List available backups
curl http://localhost:3001/api/admin/backups -H "Authorization: Bearer $TOKEN"

# Restore
curl -X POST http://localhost:3001/api/admin/backups/restore \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"backupName":"eoffice-backup-TIMESTAMP.db"}'

docker compose restart eoffice
```

### Step 4: Verify
```bash
curl http://localhost:3001/api/health
# Confirm version and uptime
```

---

## Quick Reference

```bash
# Start
docker compose up -d

# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker compose logs -f eoffice

# Update to latest
docker compose pull && docker compose up -d

# Create backup
curl -X POST localhost:3001/api/admin/backups -H "Authorization: Bearer $TOKEN"

# Health check
curl localhost:3001/api/health

# PM2 status (native deploy)
pm2 list
pm2 logs eoffice-api
pm2 reload eoffice-api  # zero-downtime restart
```
