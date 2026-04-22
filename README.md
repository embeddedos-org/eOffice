# eOffice

[![CI](https://github.com/embeddedos-org/eOffice/actions/workflows/ci.yml/badge.svg)](https://github.com/embeddedos-org/eOffice/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)]()

AI-powered office suite with 11 apps and eBot AI assistant — built for EmbeddedOS.

**[Website](https://embeddedos-org.github.io)** · **[App Store](https://embeddedos-org.github.io/eApps/)** · **[GitHub](https://github.com/embeddedos-org/eOffice)**

## Quick Start

### Browser (No Install Required)

Open `browser/index.html` in any browser — works on Windows, macOS, Linux.

### Desktop App

```bash
cd desktop
npm install
npm start              # Development mode
npm run build:win      # Build Windows installer
npm run build:mac      # Build macOS .dmg
npm run build:linux    # Build Linux .AppImage/.deb
npm run build:all      # All platforms
```

### Full Development Stack (React + Node.js)

```bash
npm install
npm test               # Run 118 unit tests
npm run dev:server     # Backend on :3001
npm run dev:docs       # eDocs on :5173
npm run dev:notes      # eNotes on :5174
npm run dev            # Launcher on :5170
```

### Docker

```bash
docker-compose up --build
```

## Product Suite

| App | Function | eBot AI Role |
|-----|----------|-------------|
| **eDocs** | Word processing | Text suggestions, summarization, grammar/style check |
| **eSheets** | Spreadsheets | Formula help, data explanation, chart recommendations |
| **eSlides** | Presentations | Slide titles, talking points, alt-text generation |
| **eNotes** | Digital notebooks | Summarize notes, auto-tag, link related notes |
| **eMail** | Email & Calendar | Draft emails, smart replies, task extraction |
| **eDB** | Lightweight database | Query suggestions, schema recommendations |
| **eDrive** | Cloud storage | Semantic search, file tagging, duplicate detection |
| **eConnect** | Collaboration & chat | Meeting summaries, action-item extraction |
| **eForms** | Forms & surveys | Auto-generate questions, summarize responses |
| **eSway** | Interactive presentations | Generate slide decks from documents |
| **ePlanner** | Task & project management | AI-assisted task suggestions and prioritization |

> **eBot** is the central AI assistant powering intelligence across all apps.

## Architecture

```
┌────────────────────────┐
│      eOffice Apps      │
│  eDocs · eSheets       │
│  eSlides · eNotes      │
│  eMail · eDB · eDrive  │
│  eConnect · eForms     │
│  eSway · ePlanner      │
└─────────┬──────────────┘
          │ API / HTTP
          ▼
┌────────────────────────┐
│      eBot AI Layer     │
│  Text · Formulas       │
│  Summaries · Search    │
│  Task Extraction       │
└─────────┬──────────────┘
          │ Internal API
          ▼
┌────────────────────────┐
│    EAI Server Layer    │
│  LLM Models · Agents   │
│  Inference · Cache     │
└─────────┬──────────────┘
          │
          ▼
┌────────────────────────┐
│   Storage & DB Layer   │
│  Multi-tenant DB       │
│  Object/File Storage   │
│  Versioning & Logs     │
└────────────────────────┘
```

## eBot API

| Endpoint | Description | Input | Output |
|----------|-------------|-------|--------|
| `/v1/chat` | General AI assistance | Prompt + context | AI text response |
| `/v1/complete` | Auto-complete / suggestions | Partial text or formula | Completed text/formula |
| `/v1/summarize` | Summarize document or notes | Text input | Summary text |
| `/v1/task-extract` | Extract tasks | Email/text/meeting notes | List of tasks with metadata |
| `/v1/search` | Semantic search | Query text | Ranked results across docs/notes/files |

## Key Features

- **Centralized AI** — eBot provides a unified assistant API for all apps
- **Edge/cloud flexibility** — Models run locally (Ollama) or via cloud API (OpenAI)
- **Real-time collaboration** — CRDT-based document model with presence indicators
- **Privacy-focused** — Tenant isolation, PII redaction, opt-in AI per workspace
- **Extensible** — Plugin system for third-party panels, AI tools, and custom functions
- **Integrations** — OAuth/OIDC, Google Drive, OneDrive, Slack, Teams, webhooks

## License

MIT — see [LICENSE](LICENSE) for details.
