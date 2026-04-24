<p align="center">
  <img src="desktop/icon.svg" width="120" alt="eOffice Logo"/>
</p>

<h1 align="center">eOffice Suite</h1>

<p align="center">
  <strong>AI-Powered Office Productivity Suite with eBot LLM Integration</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version"/>
  <img src="https://img.shields.io/badge/apps-12-green" alt="Apps"/>
  <img src="https://img.shields.io/badge/AI_actions-33+-purple" alt="AI"/>
  <img src="https://img.shields.io/badge/tests-75+_passing-brightgreen" alt="Tests"/>
  <img src="https://img.shields.io/badge/platforms-6-orange" alt="Platforms"/>
  <img src="https://img.shields.io/badge/security-hardened-red" alt="Security"/>
  <img src="https://img.shields.io/badge/license-MIT-lightgrey" alt="License"/>
</p>

---

## 📦 What is eOffice?

eOffice is a complete open-source office productivity suite — like Microsoft 365 — with built-in **AI/LLM intelligence** powered by **eBot**. It runs on Windows, macOS, Linux, browsers, Chrome Extension, and as a PWA.

### 12 Applications

| App | Description | MS 365 Equivalent | AI Features |
|-----|-------------|-------------------|-------------|
| 📝 **eDocs** | Word processor with rich text editing | Word | Spell check, grammar fix, rewrite, translate, summarize |
| 📊 **eSheets** | Spreadsheet with formulas and charts | Excel | Formula suggestions, data analysis, explain formula |
| 📽️ **eSlides** | Presentation builder with themes | PowerPoint | Generate slides, talking points, improve slide |
| 📒 **eNotes** | Notebooks with markdown and sections | OneNote | Summarize notes, extract tasks, link related notes |
| ✉️ **eMail** | Full IMAP/SMTP email client | Outlook | Spell check, rewrite tone, smart compose |
| 🗄️ **eDB** | Visual database with SQL query editor | Access | Generate SQL, explain queries |
| ☁️ **eDrive** | Cloud file storage and sharing | OneDrive | Search files, summarize documents |
| 💬 **eConnect** | Team messaging with video calls | Teams | Summarize threads, draft messages |
| 📋 **eForms** | Form builder with responses | Forms | Generate quiz questions |
| 🎨 **eSway** | Interactive presentations | Sway | Generate quizzes, suggest polls |
| 📅 **ePlanner** | Kanban board with task management | Planner | Extract tasks, prioritize backlog |
| 🚀 **Launcher** | App launcher and dashboard | Start Menu | — |

---

## 🔒 Security Features

eOffice v1.0.0 has been production-hardened with comprehensive security:

### Authentication & Authorization
- **HMAC-SHA256 JWT** — Cryptographically signed tokens with 1-hour expiration
- **scrypt password hashing** — Node.js built-in crypto with unique per-user salts and timing-safe comparison
- **Password strength enforcement** — Minimum 8 characters with at least 1 number
- **Route-level authentication** — All API routes require valid JWT except `/api/auth/*` and `/api/health`
- **Data ownership** — Every stored item has an `ownerId` field; users can only access their own data

### Rate Limiting
- Global: 100 requests/minute
- Login: 5 attempts per 15 minutes (brute-force protection)
- Registration: 3 accounts per hour
- Email sending: 20 per hour
- eBot AI: 30 requests per minute

### Input Validation & Sanitization
- All request bodies sanitized — strips `<script>`, event handlers, `javascript:` URLs
- Prototype pollution protection — `__proto__`, `constructor`, `prototype` keys blocked
- Explicit field extraction (`pickFields()`) on all PUT endpoints — no spread from `req.body`
- String length limits on all fields (title: 500 chars, content: 1MB)
- UUID format validation on all `:id` parameters
- Email format validation on all email inputs

### WebSocket Security
- Token-based authentication required for WebSocket connections
- Message size limits (64KB max)
- Room limits (50 rooms max, 20 users per room)

### Frontend Security
- All `dangerouslySetInnerHTML` wrapped with `sanitizeHtml()`
- Markdown link rendering validates URL scheme (only `http://`, `https://`, `mailto:`)
- No `prompt()` or `alert()` calls — all replaced with proper modal dialogs
- Configurable API URL via `VITE_API_URL` environment variable

### Desktop (Electron) Security
- `sandbox: true` enabled on all webPreferences
- Content Security Policy via `session.defaultSession.webRequest`
- URL validation on `open-external` — only `https:` and `mailto:` allowed
- App ID validated against whitelist before loading
- Navigation restricted to app directory and specific localhost port
- DevTools hidden in production builds

### Additional Security
- Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, CSP, Referrer-Policy
- Audit logging to file (`~/.eoffice/logs/audit.log`) with request ID correlation
- Graceful shutdown handling (SIGTERM/SIGINT)
- Health endpoint returns only `{ status: 'ok' }` — no version/uptime leakage
- `crypto.randomUUID()` for all ID generation — no `Math.random()`

---

## 💾 Data Persistence

All data is stored persistently in `~/.eoffice/data/` as JSON files, organized by type:

```
~/.eoffice/
├── data/
│   ├── documents/
│   ├── notes/
│   ├── spreadsheets/
│   ├── presentations/
│   ├── drive/
│   ├── boards/
│   ├── forms/
│   ├── databases/
│   ├── channels/
│   ├── sway/
│   ├── contacts/
│   ├── signatures/
│   ├── events/
│   └── users/
└── logs/
    └── audit.log
```

Data survives server restarts. The `FileStore` class includes path traversal protection.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **pnpm** 8+ (package manager)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/embeddedos-org/eOffice.git
cd eOffice

# Install dependencies
pnpm install

# Start the server
cd packages/server && pnpm dev

# Start any app (e.g., eMail)
cd apps/email && pnpm dev
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (auto-generated) | Secret key for JWT signing. **Set in production!** |
| `PORT` | `3001` | Server port |
| `CORS_ORIGINS` | `http://localhost:5170,...` | Allowed CORS origins |
| `VITE_API_URL` | `http://localhost:3001` | API URL for frontend apps |
| `EAI_BASE_URL` | `http://192.168.1.100:8420` | eBot AI server URL |

### Desktop App

```bash
cd desktop
npm install
npm start
```

### Docker

```bash
docker-compose up
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run core model tests
cd packages/core && pnpm test

# Run server security tests
cd packages/server && pnpm test
```

### Test Coverage
- **Core models**: Document, Note, Spreadsheet, Presentation, Email, Connect, Database, Drive, Forms, Planner, Sway, Version
- **Security**: JWT creation/verification/tampering/expiration, password hashing, input validation, XSS sanitization, path traversal, prototype pollution
- **Utilities**: generateId, formatDate, sanitizeHtml, sanitizeString, validateId

---

## 📁 Project Structure

```
eOffice/
├── apps/                   # 12 React frontend apps
│   ├── email/              # eMail (IMAP/SMTP client)
│   ├── edocs/              # eDocs (Word processor)
│   ├── enotes/             # eNotes (Notebooks)
│   ├── esheets/            # eSheets (Spreadsheets)
│   ├── eslides/            # eSlides (Presentations)
│   ├── edb/                # eDB (Database manager)
│   ├── edrive/             # eDrive (File storage)
│   ├── econnect/           # eConnect (Messaging + Video)
│   ├── eforms/             # eForms (Form builder)
│   ├── esway/              # eSway (Interactive presentations)
│   ├── eplanner/           # ePlanner (Kanban/Tasks)
│   ├── launcher/           # App launcher
│   └── shared/             # Shared config and components
├── packages/
│   ├── core/               # Shared types, models, utilities
│   ├── ebot-client/        # eBot AI client library
│   └── server/             # Express.js REST API server
│       ├── src/
│       │   ├── middleware/  # Auth, sanitize, rate-limit, validate, audit
│       │   ├── routes/      # 14 REST API route files
│       │   ├── services/    # Email, collaboration, signaling
│       │   └── storage/     # FileStore persistence
├── desktop/                # Electron desktop app
├── browser/                # Static HTML fallbacks
├── web/                    # PWA manifest and service worker
├── extensions/             # Browser and IDE extensions
└── enterprise/             # Docker, Helm, enterprise docs
```

---

## 🔌 API Overview

All routes (except auth and health) require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/health` | Health check |
| CRUD | `/api/documents` | Document management |
| CRUD | `/api/notes` | Notes management |
| CRUD | `/api/spreadsheets` | Spreadsheet management |
| CRUD | `/api/presentations` | Presentation management |
| CRUD | `/api/drive` | File storage |
| CRUD | `/api/tasks/boards` | Task boards + tasks |
| CRUD | `/api/forms` | Forms + submissions |
| CRUD | `/api/databases/tables` | Database tables + rows |
| CRUD | `/api/connect/channels` | Channels + messages |
| CRUD | `/api/sway` | Interactive presentations |
| CRUD | `/api/email/*` | Email accounts, folders, messages |
| POST | `/api/ebot/chat` | AI chat |
| POST | `/api/ebot/summarize` | AI summarization |
| WS | `/ws/collab` | Real-time collaboration |
| WS | `/ws/signal` | WebRTC video signaling |

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Express.js, TypeScript, Node.js |
| Desktop | Electron |
| AI | eBot (local LLM server) |
| Auth | HMAC-SHA256 JWT, scrypt |
| Storage | File-based JSON (FileStore) |
| WebSocket | ws library |
| Email | IMAP (imapflow), SMTP (nodemailer) |
| Testing | Vitest |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

© 2026 EmbeddedOS Project
