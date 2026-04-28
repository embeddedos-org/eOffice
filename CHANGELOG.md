# Changelog

## [2.0.0] - 2026-04-27

### Security & Bug Fixes
- **CRITICAL**: Fixed eBot auth bypass — all 12 apps now use `apiClient` with JWT tokens instead of raw `fetch`
- **CRITICAL**: Enforced `JWT_SECRET` as required in production mode (throws on startup if missing)
- Fixed eDocs server sync bug — documents are now synced individually via PUT instead of sending entire array
- Added `LoginScreen` authentication wrapper to all 12 apps (was only on eDocs)
- Made CORS origins fully configurable via `CORS_ORIGINS` environment variable

### Storage
- Added SQLite storage backend via `better-sqlite3` (default, replaces JSON files)
- Auto-migration from existing JSON file storage to SQLite on first run
- Added `STORAGE_BACKEND` env var toggle (`sqlite` or `file`)
- Added full-text search support via SQLite

### AI
- Multi-provider AI with fallback chain: OpenAI → Anthropic → Ollama → EAI → Rule-based
- Added Anthropic Claude provider (direct HTTP, no SDK dependency)
- Added Ollama provider for local LLM support
- Added retry logic with exponential backoff for transient AI errors
- Wired RAG search service to `/api/ebot/search` route (was a stub)
- Added `/api/ebot/index` endpoint for document indexing
- Enhanced `/api/ebot/status` to show all provider availability

### New Features
- **eDocs**: Comments panel with threaded replies, resolve/unresolve
- **eDocs**: Document comments API (`/api/documents/:id/comments`)
- **eConnect**: Message reactions component with emoji picker
- **eNotes**: TopBar, StatusBar, and Drawing Canvas components
- **eSheets**: Real-time collaboration hook with cell-level locking
- **eSlides**: Real-time collaboration hook with slide-level awareness
- **Cross-App**: Notification center with bell icon, unread count, toast notifications
- **Cross-App**: Notifications API (`/api/notifications`)

### PWA & Mobile
- Rewrote service worker with network-first API strategy and offline queue
- Enhanced PWA manifest with all icon sizes, shortcuts, share target
- Added shared responsive CSS with mobile breakpoints and print styles

### Production Infrastructure
- Fixed Dockerfile multi-stage build for all 12 apps
- Added `.dockerignore` for optimized Docker builds
- Fixed `docker-compose.yml` with required secrets, data volumes, health checks
- Added GitHub Actions CI/CD pipeline (lint, test, E2E, Docker build)
- Enhanced health endpoint with version, uptime, memory stats
- Added readiness probe endpoint (`/api/ready`)

### Testing
- Added Playwright E2E test infrastructure with multi-browser support
- Added auth flow E2E tests (register, login, invalid credentials)
- Added eDocs, eMail, eConnect E2E tests
- Added cross-app integration tests (health, auth, eBot status)

### Documentation
- Added `.env.example` with all configurable environment variables
- Updated README with quick start, AI provider config, storage info
- Updated CHANGELOG with v2.0.0 release notes



All notable changes to the eOffice Suite project will be documented in this file.

## [1.0.0] — 2026-04-03

### Phase 4 — Advanced Features
- **Cross-app eBot AI:** All 11 apps have eBot AI integration with app-specific actions
- **Desktop app:** Full Electron app with all 11 apps accessible from the menu
- **Docker deployment:** Multi-stage Dockerfile builds all 12 apps (11 + launcher)
- **Dev scripts:** `npm run dev:*` scripts for all 11 apps + server
- **CI/CD:** GitHub Actions workflow with lint, typecheck, test, build across 3 OS × 2 Node versions

### Phase 3 — Extended Suite & Integrations
- **eConnect:** Collaboration & messaging — channels, message threads, eBot chat summarize
- **eDrive:** Cloud storage — file browser, preview, upload, folders, eBot semantic search
- **eDB:** Database manager — table viewer, row editing, SQL query editor, eBot query suggestions
- **eForms:** Forms & surveys — form builder (7 field types), preview, validation, eBot question generation
- **eSway:** Interactive presentations — quiz/poll/Q&A slides, live responses, eBot quiz generation
- **ePlanner:** Task management — kanban board (todo/in-progress/done), drag-to-move, eBot task extraction
- **Server routes:** Full CRUD APIs for all 11 apps at `/api/*`
- **Auth middleware:** JWT-based authentication with role-based authorization
- **Audit middleware:** Request logging for all API calls
- **Extensions:** Chrome/Firefox extension (Manifest V3) + VS Code extension

### Phase 2 — Core Suite
- **eSheets:** Spreadsheet with formula engine (SUM, AVG, COUNT, MIN, MAX, IF, CONCATENATE), multi-sheet, cell formatting, CSV import/export, eBot formula suggestions
- **eSlides:** Presentations — slide deck editor, element CRUD, themes, speaker notes, full-screen present mode, eBot content generation & talking points
- **eMail:** Email client — inbox/sent/drafts/starred/trash folders, compose/reply/forward, read/star, eBot smart replies & task extraction
- **Server APIs:** Spreadsheet batch cell update, presentation slide CRUD, email messages/calendar

### Phase 1 — MVP
- **eDocs:** Word processor — contentEditable editor, formatting toolbar (bold/italic/underline/heading/list), auto-save, export, print, eBot summarize/rewrite/grammar/translate
- **eNotes:** Digital notebook — two-panel layout, note CRUD, tags, search, pin, import/export JSON, eBot summarize/auto-tag/extract-tasks/find-related
- **@eoffice/core:** 12 data models, 45 types, 7 utilities, 6 constants, app registry
- **@eoffice/ebot-client:** EBotClient (9 endpoints) + EBotOffice (12 AI methods)
- **@eoffice/server:** Express.js backend with 14 route modules on port 3001
- **Suite Launcher:** App grid with category filters, search, dark/light theme
- **Browser apps:** 12 standalone HTML files (zero-dependency, offline-capable)
- **118 unit tests** across core, ebot-client, and server packages

### Tech Stack

- UI: React 18 + TypeScript 5 + Vite 5
- Backend: Node.js + Express
- AI: eBot client → EAI Server (C)
- Desktop: Electron 28
- Build: npm workspaces monorepo
- CI: GitHub Actions (3 OS × 2 Node versions)
- Docker: Multi-stage Alpine build

## [0.1.0] — 2026-04-03

### Added

- Initial project scaffold with monorepo structure
- Phase 1 MVP: eDocs + eNotes
- 9 stub apps for future phases
