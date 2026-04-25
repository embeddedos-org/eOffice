---
title: "eOffice — Official Reference Guide"
author: "Srikanth Patchava & EmbeddedOS Contributors"
date: "April 2026"
version: "v1.0.0"
bibliography: references.bib
csl: ieee.csl
titlepage: true
titlepage-background: "cover.png"
---

<!-- ═══════════════════════════════════════════════════════════════════ -->
<!--  eOffice Suite — AI-Powered Office Productivity: Product Reference -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

---

# eOffice Suite — AI-Powered Office Productivity

## Product Reference

**Authors:** Srikanth Patchava & EmbeddedOS Contributors

**Edition:** First Edition — April 2026

**License:** MIT

**Repository:** EmbeddedOS / eOffice

---

> *"The best office suite is one that understands what you are trying to say
> before you finish typing it."*

---

## Table of Contents

- [Preface](#preface)
- [Chapter 1 — Introduction to eOffice](#chapter-1--introduction-to-eoffice)
- [Chapter 2 — Architecture Overview](#chapter-2--architecture-overview)
- [Chapter 3 — The 12 Applications](#chapter-3--the-12-applications)
- [Chapter 4 — eBot [@ellis1989] AI Integration](#chapter-4--ebot-ai-integration)
- [Chapter 5 — Security Architecture](#chapter-5--security-architecture)
- [Chapter 6 — Data Persistence Layer](#chapter-6--data-persistence-layer)
- [Chapter 7 — Real-Time Collaboration](#chapter-7--real-time-collaboration)
- [Chapter 8 — Email System](#chapter-8--email-system)
- [Chapter 9 — Desktop Application (Electron)](#chapter-9--desktop-application-electron)
- [Chapter 10 — REST API Reference](#chapter-10--rest-api-reference)
- [Chapter 11 — Plugin and Extension System](#chapter-11--plugin-and-extension-system)
- [Chapter 12 — Deployment](#chapter-12--deployment)
- [Chapter 13 — Testing and Quality](#chapter-13--testing-and-quality)
- [Appendix A — Environment Variables Reference](#appendix-a--environment-variables-reference)
- [Appendix B — API Endpoint Quick Reference](#appendix-b--api-endpoint-quick-reference)
- [Appendix C — Troubleshooting](#appendix-c--troubleshooting)
- [Glossary](#glossary)

---

# Preface

eOffice was born from a simple observation: modern knowledge workers spend their
entire day inside office productivity software, yet the dominant commercial suites
remain closed-source, cloud-dependent, and increasingly expensive. The
EmbeddedOS project set out to change that.

This book is the authoritative technical reference for the eOffice Suite. It is
intended for developers who want to contribute to the project, system
administrators who need to deploy eOffice in enterprise environments, and
technical evaluators who want to understand the architecture before adopting it.

**What this book covers:**

- Complete architectural overview of the full-stack monorepo
- Detailed descriptions of all 12 applications and their AI capabilities
- Security architecture from JWT authentication to Electron hardening
- Data persistence, real-time collaboration, and email internals
- REST API reference with request/response examples
- Deployment guides for Docker, Kubernetes (Helm), and bare-metal
- Testing strategy, CI/CD pipelines, and quality assurance

**What this book assumes:**

- Familiarity with TypeScript, React, and Node.js
- Basic understanding of REST APIs and WebSocket protocols
- General knowledge of authentication and authorization concepts

We hope this reference empowers you to build, extend, and deploy eOffice with
confidence.

— *Srikanth Patchava & EmbeddedOS Contributors, April 2026*

---

# Chapter 1 — Introduction to eOffice

## 1.1 Vision

eOffice is a complete, open-source office productivity suite designed to be a
credible alternative to Microsoft 365 and Google Workspace. Unlike those
commercial offerings, eOffice is:

- **Open Source (MIT):** Every line of code is auditable and modifiable.
- **AI-Native:** Built-in LLM intelligence via eBot is not an afterthought —
  it is woven into every application from day one.
- **Platform-Universal:** Runs on Windows, macOS, Linux, web browsers, as a
  Chrome Extension, and as a Progressive Web App (PWA).
- **Privacy-First:** Data can remain entirely on-premise; the local LLM option
  means AI features work without sending data to external services.

## 1.2 Comparison to Microsoft 365

| Microsoft 365 App | eOffice Equivalent | Key Differentiator               |
|--------------------|--------------------|----------------------------------|
| Word               | **eDocs**          | AI rewrite, translate, summarize |
| Excel              | **eSheets**        | AI formula suggestions           |
| PowerPoint         | **eSlides**        | AI slide generation              |
| OneNote            | **eNotes**         | AI task extraction               |
| Outlook            | **eMail**          | AI smart compose                 |
| Access             | **eDB**            | AI SQL generation                |
| OneDrive           | **eDrive**         | AI document summarization        |
| Teams              | **eConnect**       | AI thread summarization          |
| Forms              | **eForms**         | AI quiz generation               |
| Sway               | **eSway**          | AI poll suggestions              |
| Planner            | **ePlanner**       | AI backlog prioritization        |
| Start / Launcher   | **Launcher**       | Unified app dashboard            |

## 1.3 Platform Support Matrix

| Platform          | Technology       | Status  |
|-------------------|------------------|---------|
| Windows           | Electron         | Stable  |
| macOS             | Electron         | Stable  |
| Linux             | Electron         | Stable  |
| Web Browser       | React SPA        | Stable  |
| Chrome Extension  | Extension API    | Stable  |
| PWA               | Service Workers  | Stable  |

## 1.4 Design Principles

1. **Simplicity over complexity.** Every feature should be discoverable without
   reading a manual.
2. **Offline-first.** Core editing works without a network connection. Sync
   happens when connectivity returns.
3. **AI as assistant, not author.** eBot suggests, rewrites, and analyzes — but
   the human always has final say.
4. **Security by default.** Every endpoint is authenticated, every input is
   sanitized, every header is hardened.
5. **Zero vendor lock-in.** Data is stored in plain JSON. Export everything at
   any time.

## 1.5 License

eOffice is released under the MIT License. You are free to use, modify, and
distribute the software for any purpose, including commercial use.

---

# Chapter 2 — Architecture Overview

## 2.1 High-Level Architecture

eOffice follows a modern full-stack architecture with a React frontend, an
Express.js backend, and optional Electron and PWA shells.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                              │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Electron │ │ Browser  │ │   PWA    │ │ Chrome Extension │   │
│  │ Desktop  │ │   SPA    │ │  Shell   │ │                  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
│       │             │            │                 │             │
│       └─────────────┴────────────┴─────────────────┘             │
│                          │                                       │
│              ┌───────────┴───────────┐                           │
│              │   React 18 + Vite     │                           │
│              │   12 Application UIs  │                           │
│              └───────────┬───────────┘                           │
└──────────────────────────┼──────────────────────────────────────┘
                           │  HTTPS / WSS
┌──────────────────────────┼──────────────────────────────────────┐
│                     SERVER TIER                                  │
│              ┌───────────┴───────────┐                           │
│              │   Express.js + TS     │                           │
│              │   REST API + WS       │                           │
│              └───────────┬───────────┘                           │
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         │                │                │                      │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌─────┴──────┐              │
│  │  FileStore  │  │   eBot AI   │  │  WebSocket │              │
│  │  JSON Data  │  │  Local LLM  │  │  Collab/RTC│              │
│  └─────────────┘  └─────────────┘  └────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Monorepo Structure

The project uses a monorepo layout managed with standard npm workspaces:

```
eOffice/
├── apps/                       # 12 React frontend applications
│   ├── edocs/                  # Word processor
│   ├── esheets/                # Spreadsheet
│   ├── eslides/                # Presentation builder
│   ├── enotes/                 # Notebook manager
│   ├── email/                  # Email client
│   ├── edb/                    # Database manager
│   ├── edrive/                 # Cloud storage
│   ├── econnect/               # Team messaging
│   ├── eforms/                 # Form builder
│   ├── esway/                  # Interactive presentations
│   ├── eplanner/               # Task / Kanban board
│   └── launcher/               # App launcher dashboard
├── packages/
│   ├── core/                   # Shared models, utils, types
│   ├── ebot-client/            # AI client SDK
│   └── server/                 # Express.js backend
├── desktop/                    # Electron shell
├── browser/                    # Browser entry point
├── web/                        # PWA shell + service worker
├── extensions/                 # Chrome / IDE extensions
├── enterprise/
│   ├── docker/                 # Docker Compose files
│   └── helm/                   # Kubernetes Helm charts
├── docs/                       # Documentation and this book
├── package.json                # Root workspace config
├── tsconfig.json               # Shared TypeScript config
└── vite.config.ts              # Shared Vite config
```

## 2.3 Technology Stack

| Layer        | Technology                     | Version  |
|--------------|--------------------------------|----------|
| UI Framework | React                          | 18.x     |
| Language     | TypeScript                     | 5.x      |
| Bundler      | Vite                           | 5.x      |
| Backend      | Express.js                     | 4.x      |
| Runtime      | Node.js                        | 20 LTS   |
| Desktop      | Electron                       | 30.x     |
| AI Engine    | eBot (local LLM)               | 1.x      |
| Auth         | HMAC-SHA256 JWT / scrypt       | —        |
| Storage      | File-based JSON (FileStore)    | —        |
| WebSocket    | ws library                     | 8.x      |
| Email        | imapflow / nodemailer          | —        |
| Testing      | Vitest                         | 1.x      |

## 2.4 Request Flow

A typical authenticated request flows through the system as follows:

```
  Client                    Server                    Storage
    │                         │                          │
    │  POST /api/docs         │                          │
    │  Authorization: Bearer  │                          │
    │ ───────────────────────>│                          │
    │                         │                          │
    │                    ┌────┴────┐                     │
    │                    │  Auth   │                     │
    │                    │Midware  │                     │
    │                    └────┬────┘                     │
    │                         │                          │
    │                    ┌────┴────┐                     │
    │                    │  Rate   │                     │
    │                    │ Limiter │                     │
    │                    └────┬────┘                     │
    │                         │                          │
    │                    ┌────┴────┐                     │
    │                    │  Input  │                     │
    │                    │Sanitize │                     │
    │                    └────┬────┘                     │
    │                         │                          │
    │                    ┌────┴────┐    ┌──────────┐     │
    │                    │  Route  │───>│FileStore │     │
    │                    │ Handler │    │ JSON R/W │     │
    │                    └────┬────┘    └──────────┘     │
    │                         │                          │
    │  200 OK { doc }         │                          │
    │ <───────────────────────│                          │
    │                         │                          │
```

## 2.5 Module Dependency Graph

```
  ┌─────────────────────────────────────────────────────┐
  │                   apps/* (12 apps)                   │
  │  eDocs │ eSheets │ eSlides │ eNotes │ eMail │ ...   │
  └──────────────────┬──────────────────────────────────┘
                     │ imports
          ┌──────────┴──────────┐
          │                     │
   ┌──────┴──────┐      ┌──────┴──────┐
   │  @eoffice/  │      │  @eoffice/  │
   │    core     │      │ ebot-client │
   └──────┬──────┘      └──────┬──────┘
          │                     │
          └──────────┬──────────┘
                     │ consumed by
          ┌──────────┴──────────┐
          │   @eoffice/server   │
          └─────────────────────┘
```

## 2.6 Build Pipeline

The build process uses Vite for both the frontend bundles and the server:

```
Source (TypeScript)
       │
       ├── tsc ──────────> Type checking (no emit)
       │
       ├── Vite build ───> Frontend bundles (apps/*)
       │                    └── dist/client/
       │
       └── tsc + esbuild ─> Server bundle
                             └── dist/server/
```

---

# Chapter 3 — The 12 Applications

## 3.1 eDocs — Word Processor

**Microsoft Equivalent:** Word

eDocs is a full-featured word processor with rich text editing capabilities.
It supports document creation, formatting, templates, and export.

### Features

- Rich text editing with toolbar (bold, italic, underline, headings, lists)
- Document templates (letter, report, resume, memo)
- Export to PDF [@iso32000], DOCX, and plain text
- Version history with diff view
- Real-time collaborative editing via WebSocket
- Find and replace with regex support
- Word count and reading time estimation
- Table insertion and formatting

### AI Capabilities

| AI Action      | Description                                        |
|----------------|----------------------------------------------------|
| Spell Check    | Detect and correct spelling errors in-context       |
| Grammar Fix    | Fix grammatical issues while preserving meaning     |
| Rewrite        | Rewrite selected text in a different style or tone  |
| Translate      | Translate content to/from 20+ languages             |
| Summarize      | Generate a concise summary of long documents        |

### Data Model

```typescript
interface Document {
  id: string;
  title: string;
  content: string;          // HTML or Markdown content
  format: "html" | "md";
  author: string;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  tags: string[];
  version: number;
}
```

### API Endpoints

| Method | Path                  | Description            |
|--------|-----------------------|------------------------|
| GET    | `/api/documents`      | List all documents     |
| GET    | `/api/documents/:id`  | Get a single document  |
| POST   | `/api/documents`      | Create a new document  |
| PUT    | `/api/documents/:id`  | Update a document      |
| DELETE | `/api/documents/:id`  | Delete a document      |

### Keyboard Shortcuts

| Shortcut         | Action              |
|------------------|---------------------|
| Ctrl+B           | Bold                |
| Ctrl+I           | Italic              |
| Ctrl+U           | Underline           |
| Ctrl+S           | Save document       |
| Ctrl+Shift+S     | Save as template    |
| Ctrl+Z           | Undo                |
| Ctrl+Y           | Redo                |
| Ctrl+F           | Find                |
| Ctrl+H           | Find and replace    |
| Ctrl+Shift+A     | Ask eBot AI         |

---

## 3.2 eSheets — Spreadsheet

**Microsoft Equivalent:** Excel

eSheets provides a spreadsheet interface with support for formulas, charts,
and data analysis.

### Features

- Cell-based grid with formatting (font, color, borders, alignment)
- 100+ built-in formulas (SUM, VLOOKUP, IF, COUNTIF, etc.)
- Chart generation (bar, line, pie, scatter, area, radar)
- CSV/XLSX import and export
- Conditional formatting rules
- Named ranges and cell references
- Multi-sheet workbooks with sheet tabs
- Freeze panes (rows and columns)

### AI Capabilities

| AI Action          | Description                                    |
|--------------------|------------------------------------------------|
| Formula Suggestion | Suggest formulas based on data patterns        |
| Data Analysis      | Identify trends, outliers, and correlations     |
| Explain Formula    | Explain what a complex formula does in English  |

### Data Model

```typescript
interface Spreadsheet {
  id: string;
  title: string;
  sheets: Sheet[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

interface Sheet {
  name: string;
  cells: Record<string, Cell>;  // key = "A1", "B2", etc.
  charts: Chart[];
  frozenRows: number;
  frozenCols: number;
}

interface Cell {
  value: string | number | boolean | null;
  formula?: string;
  format?: CellFormat;
}

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  numberFormat?: string;    // e.g., "#,##0.00", "0%", "yyyy-mm-dd"
  horizontalAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
}
```

### Supported Formula Categories

| Category      | Example Formulas                                |
|---------------|------------------------------------------------|
| Math          | SUM, AVERAGE, MIN, MAX, ROUND, ABS              |
| Text          | CONCAT, LEFT, RIGHT, MID, LEN, TRIM             |
| Lookup        | VLOOKUP, HLOOKUP, INDEX, MATCH                  |
| Logical       | IF, AND, OR, NOT, IFERROR                        |
| Statistical   | COUNT, COUNTA, COUNTIF, SUMIF                    |
| Date/Time     | NOW, TODAY, YEAR, MONTH, DAY                     |
| Financial     | PMT, FV, PV, RATE, NPV                          |

---

## 3.3 eSlides — Presentation Builder

**Microsoft Equivalent:** PowerPoint

eSlides enables creation of slide presentations with themes, transitions,
and speaker notes.

### Features

- Slide canvas with drag-and-drop elements (text, images, shapes)
- 10+ built-in themes with customizable color palettes
- Slide transitions and element animations
- Speaker notes per slide
- Presenter view with timer and next-slide preview
- Export to PDF and PPTX
- Slide master templates for consistent branding
- Embedded video and audio support

### AI Capabilities

| AI Action        | Description                                      |
|------------------|--------------------------------------------------|
| Generate Slides  | Create a full deck from a topic or outline        |
| Talking Points   | Generate speaker notes for each slide             |
| Improve Slide    | Suggest layout and content improvements           |

### Data Model

```typescript
interface Presentation {
  id: string;
  title: string;
  theme: string;
  slides: Slide[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

interface Slide {
  id: string;
  layout: "title" | "content" | "two-column" | "blank" | "image";
  elements: SlideElement[];
  notes: string;
  transition?: "fade" | "slide" | "zoom" | "none";
}

interface SlideElement {
  type: "text" | "image" | "shape" | "chart" | "video";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style?: Record<string, string>;
}
```

---

## 3.4 eNotes — Notebooks

**Microsoft Equivalent:** OneNote

eNotes organizes information into notebooks, sections, and pages with
full Markdown support.

### Features

- Hierarchical organization: Notebooks > Sections > Pages
- Full Markdown rendering with live preview
- Code blocks with syntax highlighting (50+ languages)
- Image and file attachments
- Quick capture via global keyboard shortcut
- Tags and search across all notebooks
- Checkbox task lists with progress tracking

### AI Capabilities

| AI Action          | Description                                    |
|--------------------|------------------------------------------------|
| Summarize Notes    | Condense long notes into key points            |
| Extract Tasks      | Pull action items from meeting notes           |
| Link Related Notes | Find and suggest connections between notes     |

### Data Model

```typescript
interface Notebook {
  id: string;
  title: string;
  sections: Section[];
  author: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  title: string;
  pages: Page[];
  color: string;
}

interface Page {
  id: string;
  title: string;
  content: string;          // Markdown
  tags: string[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
}
```

---

## 3.5 eMail — Email Client

**Microsoft Equivalent:** Outlook

eMail is a full-featured IMAP/SMTP email client with support for multiple
accounts, folders, and attachments.

### Features

- Multiple IMAP/SMTP account support
- Folder management (Inbox, Sent, Drafts, Trash, custom folders)
- Rich text compose with attachments (up to 25 MB per attachment)
- Contact management and address book
- Email search with filters (from, to, subject, date, has:attachment)
- Conversation threading with collapse/expand
- Keyboard navigation (j/k for next/previous)
- Signature management (per-account signatures)

### AI Capabilities

| AI Action      | Description                                        |
|----------------|----------------------------------------------------|
| Spell Check    | Check spelling in compose window                   |
| Rewrite Tone   | Rewrite email in formal, casual, or friendly tone  |
| Smart Compose  | Auto-complete sentences as you type                 |

> Full details on the email system are covered in **Chapter 8**.

---

## 3.6 eDB — Visual Database

**Microsoft Equivalent:** Access

eDB provides a visual interface for managing databases with a built-in SQL
query editor.

### Features

- Visual table designer with column types and constraints
- SQL query editor with syntax highlighting and auto-complete
- Query result grid with sorting, filtering, and pagination
- Table relationships visualization (ERD view)
- Data import from CSV and JSON
- Export query results to CSV
- Query history with favorites
- Multiple simultaneous database connections

### AI Capabilities

| AI Action      | Description                                        |
|----------------|----------------------------------------------------|
| Generate SQL   | Generate SQL queries from natural language          |
| Explain Query  | Explain what a SQL query does in plain English      |

### Example AI Interaction

```
User:    "Show me all customers who ordered more than 5 times last month"
eBot AI: SELECT c.name, COUNT(o.id) as order_count
         FROM customers c
         JOIN orders o ON c.id = o.customer_id
         WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
         GROUP BY c.id, c.name
         HAVING COUNT(o.id) > 5
         ORDER BY order_count DESC;
```

### Supported Column Types

| Type       | Description                  | Example               |
|------------|------------------------------|-----------------------|
| TEXT       | Variable-length string       | Names, descriptions   |
| INTEGER    | Whole number                 | IDs, counts           |
| REAL       | Floating-point number        | Prices, measurements  |
| BOOLEAN    | True/false                   | Flags, toggles        |
| DATE       | Date value                   | Birthdays, deadlines  |
| DATETIME   | Date and time                | Timestamps            |
| BLOB       | Binary data                  | Files, images         |

---

## 3.7 eDrive — Cloud File Storage

**Microsoft Equivalent:** OneDrive

eDrive provides cloud file storage with sharing, version history, and
organizational features.

### Features

- File upload and download with progress indicators
- Folder hierarchy with drag-and-drop organization
- File sharing with link generation and permissions (view, edit, admin)
- Version history per file (up to 30 versions)
- Storage quota management with usage dashboard
- Thumbnail previews for images and documents
- Recycle bin with 30-day retention
- Batch operations (move, copy, delete)

### AI Capabilities

| AI Action           | Description                                   |
|---------------------|-----------------------------------------------|
| Search Files        | Natural-language file search across all files  |
| Summarize Documents | Generate summaries of uploaded documents       |

---

## 3.8 eConnect — Team Messaging

**Microsoft Equivalent:** Teams

eConnect enables team communication with channels, direct messages, and
video calling.

### Features

- Team channels (public and private)
- Direct messages and group chats
- WebRTC video and audio calls (up to 25 participants)
- Screen sharing during calls
- File sharing within conversations
- Message threading and reactions (emoji)
- Presence indicators (online, away, busy, offline)
- Message pinning and bookmarking
- @mentions with notifications

### AI Capabilities

| AI Action         | Description                                     |
|-------------------|-------------------------------------------------|
| Summarize Threads | Condense long conversation threads              |
| Draft Messages    | Draft reply suggestions based on context         |

### WebSocket Events

```typescript
// Client -> Server
{ type: "channel:join", channelId: string }
{ type: "channel:leave", channelId: string }
{ type: "message:send", channelId: string, content: string }
{ type: "message:react", messageId: string, emoji: string }
{ type: "typing:start", channelId: string }
{ type: "typing:stop", channelId: string }

// Server -> Client
{ type: "message:new", message: Message }
{ type: "message:updated", message: Message }
{ type: "user:presence", userId: string, status: PresenceStatus }
{ type: "typing:indicator", userId: string, channelId: string }
{ type: "call:incoming", callId: string, from: string }
```

---

## 3.9 eForms — Form Builder

**Microsoft Equivalent:** Microsoft Forms

eForms enables creation of forms, surveys, and quizzes with response
collection and analysis.

### Features

- Drag-and-drop form builder
- Question types: text, multiple choice, checkbox, dropdown, rating, date, file upload
- Form branching logic (conditional questions based on previous answers)
- Response collection with real-time analytics and charts
- Export responses to CSV
- Shareable form links with optional password protection
- Response validation rules (required, min/max length, pattern)

### AI Capabilities

| AI Action              | Description                              |
|------------------------|------------------------------------------|
| Generate Quiz Questions| Auto-generate questions from a topic     |

### Data Model

```typescript
interface Form {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  settings: FormSettings;
  author: string;
  createdAt: string;
  updatedAt: string;
}

interface Question {
  id: string;
  type: "text" | "multipleChoice" | "checkbox" | "dropdown" | "rating" | "date" | "file";
  text: string;
  required: boolean;
  options?: string[];
  validation?: ValidationRule;
  branchLogic?: BranchRule;
}

interface FormSettings {
  acceptResponses: boolean;
  requireLogin: boolean;
  showProgressBar: boolean;
  shuffleQuestions: boolean;
  confirmationMessage: string;
}
```

---

## 3.10 eSway — Interactive Presentations

**Microsoft Equivalent:** Sway

eSway creates interactive, scrollable presentations with embedded media
and audience engagement features.

### Features

- Scrollable card-based layout
- Embedded images, videos, and audio
- Interactive polls and quizzes within presentations
- Audience engagement analytics (views, time spent, quiz scores)
- Responsive design for all screen sizes
- Public sharing via link
- Embed code for websites
- Animation on scroll

### AI Capabilities

| AI Action       | Description                                       |
|-----------------|---------------------------------------------------|
| Generate Quizzes| Create interactive quizzes from content            |
| Suggest Polls   | Suggest audience engagement polls                  |

---

## 3.11 ePlanner — Task Management

**Microsoft Equivalent:** Planner

ePlanner provides Kanban-style task management with boards, lists, and
cards.

### Features

- Kanban boards with customizable columns
- Task cards with title, description, assignee, due date, labels
- Drag-and-drop between columns
- Task filtering by assignee, label, due date, priority
- Board templates (Agile Sprint, Project Tracker, Personal, Bug Tracker)
- Calendar view of tasks with due date visualization
- Checklist sub-items within tasks
- Time tracking per task

### AI Capabilities

| AI Action            | Description                                  |
|----------------------|----------------------------------------------|
| Extract Tasks        | Extract tasks from meeting notes or text     |
| Prioritize Backlog   | Suggest priority ordering for backlog items  |

### Data Model

```typescript
interface Board {
  id: string;
  title: string;
  columns: Column[];
  members: string[];
  labels: Label[];
  createdAt: string;
  updatedAt: string;
}

interface Column {
  id: string;
  title: string;   // e.g., "To Do", "In Progress", "Done"
  taskIds: string[];
  wipLimit?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  labels: string[];
  priority: "low" | "medium" | "high" | "critical";
  checklist: ChecklistItem[];
  timeSpent: number;      // minutes
  comments: Comment[];
}

interface Label {
  id: string;
  name: string;
  color: string;
}
```

---

## 3.12 Launcher — App Dashboard

The Launcher is the unified entry point for all eOffice applications. It
provides:

- Grid of all 12 applications with icons and descriptions
- Recent documents across all apps (last 20 items)
- Quick search across the entire suite (Ctrl+K)
- User profile and settings access
- Notification center with unread badge
- System health indicators (server status, storage usage)
- Theme toggle (light/dark mode)
- Pinned/favorited apps for quick access

---

# Chapter 4 — eBot AI Integration

## 4.1 Overview

eBot is the AI engine that powers all intelligent features across the eOffice
suite. It operates as a local LLM by default, ensuring that sensitive data
never leaves the user machine. Optional cloud providers can be configured
for enhanced capabilities.

## 4.2 Architecture

```
  ┌──────────────────────────┐
  │      eOffice App UI      │
  │  (eDocs, eSheets, etc.)  │
  └────────────┬─────────────┘
               │ AI request
  ┌────────────┴─────────────┐
  │   @eoffice/ebot-client   │
  │   Client SDK             │
  └────────────┬─────────────┘
               │ HTTP POST
  ┌────────────┴─────────────┐
  │   /api/ebot/* endpoints  │
  │   Express.js middleware  │
  └────────────┬─────────────┘
               │
  ┌────────────┴─────────────┐
  │   eBot Provider Manager  │
  │                          │
  │  ┌─────────┐ ┌────────┐  │
  │  │ Local   │ │ Cloud  │  │
  │  │ LLM     │ │ APIs   │  │
  │  └─────────┘ └────────┘  │
  └──────────────────────────┘
```

## 4.3 The 33+ AI Actions

eBot provides over 33 AI-powered actions across the 12 applications:

| #  | Application | Action              | Description                            |
|----|-------------|---------------------|----------------------------------------|
| 1  | eDocs       | Spell Check         | Context-aware spelling correction       |
| 2  | eDocs       | Grammar Fix         | Grammar improvement suggestions         |
| 3  | eDocs       | Rewrite             | Rewrite in different style/tone         |
| 4  | eDocs       | Translate           | Multi-language translation              |
| 5  | eDocs       | Summarize           | Document summarization                  |
| 6  | eSheets     | Formula Suggestion  | Context-aware formula suggestions       |
| 7  | eSheets     | Data Analysis       | Trend and pattern identification        |
| 8  | eSheets     | Explain Formula     | Formula explanation in plain English    |
| 9  | eSlides     | Generate Slides     | Full deck generation from outline       |
| 10 | eSlides     | Talking Points      | Speaker note generation                 |
| 11 | eSlides     | Improve Slide       | Layout and content suggestions          |
| 12 | eNotes      | Summarize Notes     | Note condensation                       |
| 13 | eNotes      | Extract Tasks       | Action item extraction                  |
| 14 | eNotes      | Link Related Notes  | Cross-note connection discovery         |
| 15 | eMail       | Spell Check         | Email spelling correction               |
| 16 | eMail       | Rewrite Tone        | Tone adjustment (formal, casual, etc.)  |
| 17 | eMail       | Smart Compose       | Auto-complete sentence suggestions      |
| 18 | eDB         | Generate SQL        | Natural language to SQL                 |
| 19 | eDB         | Explain Query       | SQL explanation in plain English        |
| 20 | eDrive      | Search Files        | NLP-powered file search                 |
| 21 | eDrive      | Summarize Documents | Uploaded document summarization         |
| 22 | eConnect    | Summarize Threads   | Thread condensation                     |
| 23 | eConnect    | Draft Messages      | Contextual reply drafting               |
| 24 | eForms      | Generate Questions  | Quiz question auto-generation           |
| 25 | eSway       | Generate Quizzes    | Interactive quiz creation               |
| 26 | eSway       | Suggest Polls       | Audience engagement suggestions         |
| 27 | ePlanner    | Extract Tasks       | Task extraction from text               |
| 28 | ePlanner    | Prioritize Backlog  | Priority ordering suggestions           |
| 29 | General     | Chat                | Free-form conversational AI             |
| 30 | General     | Summarize Text      | General text summarization              |
| 31 | General     | Explain             | Explanation of any content              |
| 32 | General     | Brainstorm          | Idea generation and exploration         |
| 33 | General     | Code Generate       | Code snippet generation                 |

## 4.4 eBot Client SDK

The @eoffice/ebot-client package provides a typed TypeScript SDK for
interacting with eBot from any application.

```typescript
import { EBotClient } from "@eoffice/ebot-client";

const ebot = new EBotClient({
  baseUrl: "/api/ebot",
  token: authToken,
});

// Chat
const response = await ebot.chat({
  messages: [
    { role: "user", content: "Summarize this document..." }
  ],
  context: { app: "edocs", documentId: "doc-123" },
});

// Summarize
const summary = await ebot.summarize({
  text: longDocumentText,
  maxLength: 200,
});

// Generate SQL
const sql = await ebot.generateSQL({
  naturalLanguage: "Show all orders from last week",
  schema: tableSchema,
});

// Generate Slides
const deck = await ebot.generateSlides({
  topic: "Q2 Sales Report",
  slideCount: 10,
  style: "professional",
});

// Extract Tasks from text
const tasks = await ebot.extractTasks({
  text: meetingNotesText,
  format: "checklist",
});
```

## 4.5 Provider Management

eBot supports multiple AI providers with automatic fallback:

```typescript
interface EBotProviderConfig {
  providers: Array<{
    name: string;          // "local" | "openai" | "anthropic" | "ollama"
    enabled: boolean;
    priority: number;      // Lower = higher priority
    apiKey?: string;       // Required for cloud providers
    endpoint?: string;     // Custom endpoint URL
    model?: string;        // Model identifier
    maxTokens?: number;    // Max response tokens
    temperature?: number;  // 0.0 - 1.0
  }>;
  fallbackEnabled: boolean;
  timeout: number;         // Request timeout in ms
  retryCount: number;      // Number of retries on failure
  retryDelay: number;      // Delay between retries in ms
}
```

### Provider Priority and Fallback

When a request fails with the primary provider, eBot automatically tries
the next provider in priority order:

```
Request ──> Local LLM (priority 1)
              │ fail
              └──> OpenAI (priority 2)
                     │ fail
                     └──> Anthropic (priority 3)
                            │ fail
                            └──> Error returned to client
```

## 4.6 Rate Limiting for AI

eBot AI endpoints are rate-limited to prevent abuse:

| Endpoint              | Limit        | Window   |
|-----------------------|-------------|----------|
| /api/ebot/chat        | 30 requests | 1 minute |
| /api/ebot/summarize   | 30 requests | 1 minute |
| /api/ebot/*           | 30 requests | 1 minute |


---

# Chapter 5 — Security Architecture

## 5.1 Overview

Security is a foundational concern in eOffice. The suite implements
defense-in-depth with multiple overlapping security controls.

```
  ┌───────────────────────────────────────────────────┐
  │                 SECURITY LAYERS                    │
  │                                                   │
  │  ┌─────────────────────────────────────────────┐  │
  │  │  Layer 1: Transport Security (HTTPS/TLS)    │  │
  │  │  ┌─────────────────────────────────────────┐│  │
  │  │  │  Layer 2: Security Headers              ││  │
  │  │  │  ┌─────────────────────────────────────┐││  │
  │  │  │  │  Layer 3: Rate Limiting             │││  │
  │  │  │  │  ┌─────────────────────────────────┐│││  │
  │  │  │  │  │  Layer 4: Authentication (JWT)  ││││  │
  │  │  │  │  │  ┌─────────────────────────────┐│││││  │
  │  │  │  │  │  │  Layer 5: Input Sanitization│││││  │
  │  │  │  │  │  │  ┌─────────────────────────┐││││││  │
  │  │  │  │  │  │  │ Layer 6: Audit Logging  │││││││  │
  │  │  │  │  │  │  └─────────────────────────┘││││││  │
  │  │  │  │  │  └─────────────────────────────┘│││││  │
  │  │  │  │  └─────────────────────────────────┘││││  │
  │  │  │  └─────────────────────────────────────┘│││  │
  │  │  └─────────────────────────────────────────┘││  │
  │  └─────────────────────────────────────────────┘│  │
  └───────────────────────────────────────────────────┘
```

## 5.2 Authentication — JWT

eOffice uses HMAC-SHA256 JSON Web Tokens (JWT) for stateless authentication.

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid-here",
    "username": "john.doe",
    "iat": 1714000000,
    "exp": 1714003600
  }
}
```

### Token Lifecycle

| Phase        | Detail                                          |
|--------------|-------------------------------------------------|
| Creation     | Issued on successful login                      |
| Expiration   | 1 hour after issuance                           |
| Refresh      | Client requests new token before expiry          |
| Revocation   | Server maintains deny-list for forced logout     |
| Verification | Every request validates signature and expiration |

### Implementation

```typescript
import crypto from 'crypto';

function createToken(payload: JWTPayload, secret: string): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string, secret: string): JWTPayload {
  const [header, body, signature] = token.split('.');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expected) {
    throw new AuthError('Invalid token signature');
  }
  const payload = JSON.parse(base64urlDecode(body));
  if (Date.now() / 1000 > payload.exp) {
    throw new AuthError('Token expired');
  }
  return payload;
}
```

## 5.3 Password Hashing — scrypt

Passwords are hashed using the scrypt key derivation function with unique
per-user salts.

```typescript
import crypto from 'crypto';

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32);
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const hash = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
  return crypto.timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}
```

## 5.4 Rate Limiting

Rate limiting protects against brute-force attacks and abuse.

| Endpoint Category | Limit         | Window    | Scope    |
|-------------------|---------------|-----------|----------|
| Global            | 100 requests  | 1 minute  | Per IP   |
| Login             | 5 attempts    | 15 minutes| Per IP   |
| Registration      | 3 attempts    | 1 hour    | Per IP   |
| Email Send        | 20 messages   | 1 hour    | Per user |
| eBot AI           | 30 requests   | 1 minute  | Per user |

### Implementation

```typescript
import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                    // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5,                      // 5 login attempts
  message: { error: 'Too many login attempts' },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 3,                      // 3 registration attempts
  message: { error: 'Too many registration attempts' },
});

app.use(globalLimiter);
app.post('/api/auth/login', loginLimiter, loginHandler);
app.post('/api/auth/register', registrationLimiter, registerHandler);
```

## 5.5 Input Validation and Sanitization

All user input is validated and sanitized before processing.

### XSS Protection

```typescript
function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

### Prototype Pollution Protection

```typescript
function safeExtract(
  obj: unknown,
  allowedFields: string[]
): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return {};
  const result: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (
      field === '__proto__' ||
      field === 'constructor' ||
      field === 'prototype'
    ) {
      continue;  // Block prototype pollution vectors
    }
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      result[field] = (obj as Record<string, unknown>)[field];
    }
  }
  return result;
}
```

### Field-Level Validation

```typescript
interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'url';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

function validateField(value: unknown, rule: ValidationRule): boolean {
  if (rule.required && (value === undefined || value === null || value === '')) {
    return false;
  }
  if (value === undefined || value === null) return true;
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') return false;
      if (rule.minLength && value.length < rule.minLength) return false;
      if (rule.maxLength && value.length > rule.maxLength) return false;
      if (rule.pattern && !rule.pattern.test(value)) return false;
      return true;
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'number':
      if (typeof value !== 'number' || isNaN(value)) return false;
      if (rule.min !== undefined && value < rule.min) return false;
      if (rule.max !== undefined && value > rule.max) return false;
      return true;
    default:
      return typeof value === rule.type;
  }
}
```

## 5.6 Security Headers

The following HTTP security headers are set on all responses:

| Header                    | Value                                          |
|---------------------------|------------------------------------------------|
| X-Content-Type-Options    | `nosniff`                                      |
| X-Frame-Options           | `DENY`                                         |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains`          |
| Content-Security-Policy   | `default-src 'self'; script-src 'self'`        |
| Referrer-Policy           | `strict-origin-when-cross-origin`              |
| X-XSS-Protection          | `0` (CSP is preferred)                         |

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  next();
});
```

## 5.7 WebSocket Security

WebSocket connections are secured with:

- **Token Authentication:** JWT token required on connection handshake
- **Message Size Limit:** Maximum 64 KB per message
- **Room Limit:** Maximum 50 rooms per connection
- **Origin Validation:** Only allowed origins can connect
- **Heartbeat:** Connections without pong response are terminated

```typescript
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://' + req.headers.host);
  const token = url.searchParams.get('token');

  if (!token || !verifyToken(token, JWT_SECRET)) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  let roomCount = 0;

  ws.on('message', (data) => {
    if (data.length > 64 * 1024) {
      ws.close(4002, 'Message too large');
      return;
    }
    const msg = JSON.parse(data.toString());
    if (msg.type === 'join') {
      if (roomCount >= 50) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room limit reached' }));
        return;
      }
      roomCount++;
    }
    // Process message...
  });
});
```

## 5.8 Electron Security

The Electron desktop application implements strict security measures:

| Control                | Setting                                           |
|------------------------|---------------------------------------------------|
| Sandbox               | `sandbox: true` on all renderer processes          |
| Context Isolation      | `contextIsolation: true`                           |
| Node Integration       | `nodeIntegration: false`                           |
| CSP                   | Strict Content Security Policy                     |
| URL Validation         | Only `https:` and `eoffice:` protocols allowed     |
| Navigation Restriction | `will-navigate` blocked for external URLs          |
| Remote Module          | Disabled                                           |
| Web Security           | `webSecurity: true`                                |

```typescript
const mainWindow = new BrowserWindow({
  width: 1400,
  height: 900,
  webPreferences: {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    preload: path.join(__dirname, 'preload.js'),
  },
});

// Block navigation to external URLs
mainWindow.webContents.on('will-navigate', (event, url) => {
  const parsed = new URL(url);
  if (parsed.origin !== expectedOrigin) {
    event.preventDefault();
  }
});

// Block new window creation
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  if (isUrlAllowed(url)) {
    shell.openExternal(url);
  }
  return { action: 'deny' };
});
```

## 5.9 Audit Logging

All significant operations are logged with request ID correlation:

```typescript
interface AuditLogEntry {
  requestId: string;       // UUID v4
  timestamp: string;       // ISO 8601
  userId: string;
  action: string;          // e.g., 'document:create', 'auth:login'
  resource: string;        // e.g., '/api/documents/doc-123'
  method: string;          // HTTP method
  statusCode: number;
  ip: string;
  userAgent: string;
  duration: number;        // ms
  metadata?: Record<string, unknown>;
}
```

### Audited Actions

| Action Category   | Events Logged                                  |
|-------------------|-----------------------------------------------|
| Authentication    | Login, logout, register, token refresh         |
| Documents         | Create, update, delete, share                  |
| Files             | Upload, download, delete, share                |
| Email             | Send, delete                                   |
| AI                | All eBot requests (without content)            |
| Admin             | Settings changes, user management              |


---

# Chapter 6 — Data Persistence Layer

## 6.1 FileStore Architecture

eOffice uses a file-based JSON storage system called FileStore. This design
eliminates the need for a database server, making deployment simpler and
data fully portable.

### Storage Location

All data is stored under `~/.eoffice/data/` organized by type:

```
~/.eoffice/
├── data/
│   ├── documents/          # eDocs files
│   │   ├── doc-uuid-1.json
│   │   └── doc-uuid-2.json
│   ├── spreadsheets/       # eSheets files
│   ├── presentations/      # eSlides files
│   ├── notes/              # eNotes notebooks
│   ├── emails/             # eMail cached messages
│   ├── databases/          # eDB data
│   ├── drive/              # eDrive metadata
│   ├── channels/           # eConnect messages
│   ├── forms/              # eForms definitions
│   ├── sway/               # eSway presentations
│   ├── tasks/              # ePlanner boards
│   └── users/              # User accounts
├── config/
│   └── settings.json       # Global settings
├── uploads/                # Binary file uploads
└── logs/                   # Application logs
```

## 6.2 FileStore Implementation

```typescript
import fs from 'fs';
import os from 'os';
import path from 'path';

class FileStore<T extends { id: string }> {
  private basePath: string;

  constructor(collection: string) {
    this.basePath = path.join(
      os.homedir(), '.eoffice', 'data', collection
    );
    fs.mkdirSync(this.basePath, { recursive: true });
  }

  async getAll(): Promise<T[]> {
    const files = await fs.promises.readdir(this.basePath);
    const items: T[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.promises.readFile(
          path.join(this.basePath, file), 'utf-8'
        );
        items.push(JSON.parse(data));
      }
    }
    return items;
  }

  async getById(id: string): Promise<T | null> {
    const safeName = this.sanitizePath(id);
    const filePath = path.join(this.basePath, `${safeName}.json`);
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async save(item: T): Promise<T> {
    const safeName = this.sanitizePath(item.id);
    const filePath = path.join(this.basePath, `${safeName}.json`);
    await fs.promises.writeFile(
      filePath, JSON.stringify(item, null, 2), 'utf-8'
    );
    return item;
  }

  async delete(id: string): Promise<boolean> {
    const safeName = this.sanitizePath(id);
    const filePath = path.join(this.basePath, `${safeName}.json`);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.getAll();
    return all.filter(predicate);
  }

  private sanitizePath(input: string): string {
    const sanitized = input
      .replace(/\.\./g, '')
      .replace(/[/\\]/g, '')
      .replace(/[^a-zA-Z0-9\-_]/g, '');
    if (!sanitized || sanitized.length === 0) {
      throw new Error('Invalid identifier');
    }
    return sanitized;
  }
}

// Usage examples
const documentStore = new FileStore<Document>('documents');
const noteStore = new FileStore<Notebook>('notes');
const boardStore = new FileStore<Board>('tasks');
```

## 6.3 Path Traversal Protection

The FileStore sanitizes all identifiers to prevent path traversal attacks:

| Attack Vector              | Protection                             |
|----------------------------|----------------------------------------|
| `../../etc/passwd`         | `..` sequences are stripped            |
| `/absolute/path`           | Forward slashes are stripped           |
| `..\\windows\\system32`   | Backslashes are stripped               |
| `<script>alert(1)</script>`| Non-alphanumeric chars are stripped    |
| Empty string               | Throws an error                        |
| Null bytes                  | Non-alphanumeric chars are stripped    |

## 6.4 Data Format

Each entity is stored as a pretty-printed JSON file. Example document:

```json
{
  "id": "doc-a1b2c3d4",
  "title": "Quarterly Business Review",
  "content": "<h1>Q2 2026 Review</h1><p>Revenue grew 15%...</p>",
  "format": "html",
  "author": "john.doe",
  "tags": ["business", "quarterly", "review"],
  "version": 3,
  "createdAt": "2026-04-01T09:00:00Z",
  "updatedAt": "2026-04-25T14:30:00Z"
}
```

## 6.5 Backup and Migration

```bash
# Backup all eOffice data
tar -czf eoffice-backup-$(date +%Y%m%d).tar.gz ~/.eoffice/data/

# Restore from backup
tar -xzf eoffice-backup-20260425.tar.gz -C ~/

# List all documents
ls -la ~/.eoffice/data/documents/

# Count items per collection
for dir in ~/.eoffice/data/*/; do
  echo "$(basename $dir): $(ls $dir/*.json 2>/dev/null | wc -l) items"
done
```

---

# Chapter 7 — Real-Time Collaboration

## 7.1 Overview

eOffice supports real-time collaborative editing through WebSocket
connections. Multiple users can simultaneously edit documents, spreadsheets,
and other content types with live cursor tracking and conflict resolution.

## 7.2 WebSocket Architecture

```
  User A                   Server                    User B
    │                        │                          │
    │  ws://host/ws/collab   │   ws://host/ws/collab    │
    │ ──────────────────────>│<──────────────────────── │
    │                        │                          │
    │  join: doc-123         │   join: doc-123          │
    │ ──────────────────────>│<──────────────────────── │
    │                        │                          │
    │                   ┌────┴────┐                     │
    │                   │  Room:  │                     │
    │                   │doc-123  │                     │
    │                   └────┬────┘                     │
    │                        │                          │
    │  edit: insert "Hello"  │                          │
    │ ──────────────────────>│   broadcast: insert      │
    │                        │ ────────────────────────>│
    │                        │                          │
    │                        │   edit: insert "World"   │
    │   broadcast: insert    │<──────────────────────── │
    │ <──────────────────────│                          │
    │                        │                          │
```

## 7.3 Collaboration Protocol

### Message Types

```typescript
type CollabMessage =
  | { type: 'join'; documentId: string; userId: string }
  | { type: 'leave'; documentId: string; userId: string }
  | { type: 'edit'; documentId: string; operation: Operation }
  | { type: 'cursor'; documentId: string; position: CursorPosition }
  | { type: 'presence'; users: UserPresence[] }
  | { type: 'sync'; documentId: string; content: string; version: number }
  | { type: 'ack'; operationId: string; version: number }
  | { type: 'error'; message: string; code: string };

interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
  version: number;
}

interface CursorPosition {
  userId: string;
  line: number;
  column: number;
  selection?: { start: number; end: number };
}
```

## 7.4 CRDT [@shapiro2011] Concepts

While the current implementation uses operational transformation (OT) for
conflict resolution, the architecture is designed to support CRDT
(Conflict-free Replicated Data Types) in future versions.

### Operational Transformation

When two users make concurrent edits, the server transforms operations
to maintain consistency:

```
User A types "X" at position 5    User B types "Y" at position 3
          │                                  │
          └────────────┬─────────────────────┘
                       │
                  ┌────┴────┐
                  │Transform│
                  └────┬────┘
                       │
          ┌────────────┴─────────────────────┐
          │                                  │
  A receives: insert "Y" at 3      B receives: insert "X" at 6
  (position unchanged)             (position shifted +1)
```

### Transform Function

```typescript
function transformOperation(
  op1: Operation,
  op2: Operation
): Operation {
  if (op1.type === 'insert' && op2.type === 'insert') {
    if (op1.position <= op2.position) {
      return { ...op2, position: op2.position + (op1.content?.length ?? 0) };
    }
    return op2;
  }
  if (op1.type === 'delete' && op2.type === 'insert') {
    if (op1.position < op2.position) {
      return { ...op2, position: op2.position - (op1.length ?? 0) };
    }
    return op2;
  }
  return op2;
}
```

## 7.5 Presence System

The presence system tracks which users are active in each document:

```typescript
interface UserPresence {
  userId: string;
  username: string;
  color: string;       // Unique color for cursor/selection
  documentId: string;
  lastActive: number;  // Unix timestamp
  cursor?: CursorPosition;
}
```

### Presence Colors

Each connected user is assigned a unique color from a predefined palette:

| Index | Color    | Hex       |
|-------|----------|-----------|
| 0     | Blue     | `#3B82F6` |
| 1     | Green    | `#10B981` |
| 2     | Purple   | `#8B5CF6` |
| 3     | Orange   | `#F59E0B` |
| 4     | Pink     | `#EC4899` |
| 5     | Teal     | `#14B8A6` |
| 6     | Red      | `#EF4444` |
| 7     | Indigo   | `#6366F1` |

## 7.6 Conflict Resolution Strategy

| Scenario                  | Resolution                                  |
|---------------------------|---------------------------------------------|
| Concurrent inserts        | OT shifts positions; both preserved         |
| Concurrent deletes        | Overlapping ranges merged; no duplication    |
| Insert at delete position | Insert takes precedence                     |
| Conflicting formatting    | Last-write-wins with server timestamp       |


---

# Chapter 8 — Email System

## 8.1 Architecture

The eMail application connects to standard IMAP/SMTP servers using the
imapflow and nodemailer libraries.

```
  ┌──────────────────┐
  │   eMail UI       │
  │   (React)        │
  └────────┬─────────┘
           │ REST API
  ┌────────┴─────────┐
  │  Email Routes    │
  │  /api/email/*    │
  └────────┬─────────┘
           │
     ┌─────┴─────┐
     │           │
  ┌──┴───┐  ┌───┴──┐
  │ IMAP │  │ SMTP │
  │Client│  │Client│
  │(read)│  │(send)│
  └──┬───┘  └───┬──┘
     │          │
  ┌──┴──┐  ┌───┴──┐
  │IMAP │  │ SMTP │
  │Server│  │Server│
  └─────┘  └──────┘
```

## 8.2 Account Configuration

```typescript
interface EmailAccount {
  id: string;
  name: string;
  email: string;
  imap: {
    host: string;       // e.g., "imap.gmail.com"
    port: number;       // e.g., 993
    secure: boolean;    // true for TLS
    auth: {
      user: string;
      pass: string;     // Stored encrypted
    };
  };
  smtp: {
    host: string;       // e.g., "smtp.gmail.com"
    port: number;       // e.g., 587
    secure: boolean;    // false for STARTTLS
    auth: {
      user: string;
      pass: string;     // Stored encrypted
    };
  };
  signature?: string;
  default?: boolean;
}
```

### Common Provider Settings

| Provider       | IMAP Host            | IMAP Port | SMTP Host            | SMTP Port |
|----------------|----------------------|-----------|----------------------|-----------|
| Gmail          | imap.gmail.com       | 993       | smtp.gmail.com       | 587       |
| Outlook        | outlook.office365.com| 993       | smtp.office365.com   | 587       |
| Yahoo          | imap.mail.yahoo.com  | 993       | smtp.mail.yahoo.com  | 587       |
| Custom/Self    | (varies)             | 993       | (varies)             | 587       |

## 8.3 Folder Management

The email client synchronizes with server-side IMAP folders:

| Standard Folder | IMAP Name    | Icon     |
|-----------------|-------------|----------|
| Inbox           | INBOX        | Inbox    |
| Sent            | Sent         | Send     |
| Drafts          | Drafts       | FileEdit |
| Trash           | Trash        | Trash    |
| Spam            | Junk         | AlertOct |
| Archive         | Archive      | Archive  |

## 8.4 AI-Powered Compose

The compose window integrates eBot for intelligent writing assistance:

```typescript
// Smart Compose: Get auto-completion suggestions
const suggestion = await ebot.chat({
  messages: [
    {
      role: 'system',
      content: 'Complete the following email naturally. Return only the completion.'
    },
    {
      role: 'user',
      content: `Subject: ${subject}\n\n${currentDraft}`
    }
  ],
  context: { app: 'email', action: 'smart-compose' },
});

// Tone Rewrite: Change email tone
const rewritten = await ebot.chat({
  messages: [
    {
      role: 'system',
      content: `Rewrite this email in a ${tone} tone. Preserve the meaning.`
    },
    { role: 'user', content: emailBody }
  ],
  context: { app: 'email', action: 'rewrite-tone' },
});
```

## 8.5 Email API Endpoints

| Method | Path                         | Description              |
|--------|------------------------------|--------------------------|
| GET    | `/api/email/accounts`        | List email accounts      |
| POST   | `/api/email/accounts`        | Add email account        |
| PUT    | `/api/email/accounts/:id`    | Update email account     |
| DELETE | `/api/email/accounts/:id`    | Remove email account     |
| GET    | `/api/email/folders`         | List IMAP folders        |
| GET    | `/api/email/messages`        | List messages in folder  |
| GET    | `/api/email/messages/:id`    | Get message details      |
| POST   | `/api/email/send`            | Send an email            |
| POST   | `/api/email/draft`           | Save a draft             |
| POST   | `/api/email/reply/:id`       | Reply to an email        |
| POST   | `/api/email/forward/:id`     | Forward an email         |
| DELETE | `/api/email/messages/:id`    | Move message to trash    |

## 8.6 Email Rate Limiting

| Operation     | Limit        | Window   |
|---------------|-------------|----------|
| Send Email    | 20 messages | 1 hour   |
| Fetch Emails  | 60 requests | 1 minute |
| Account Ops   | 10 requests | 1 hour   |

---

# Chapter 9 — Desktop Application (Electron)

## 9.1 Overview

The Electron shell wraps the eOffice web application into a native desktop
application with system integration features.

## 9.2 Architecture

```
  ┌───────────────────────────────────────┐
  │           Electron Main Process       │
  │                                       │
  │  ┌─────────────┐  ┌───────────────┐   │
  │  │   Window     │  │  IPC Bridge   │   │
  │  │   Manager    │  │  (Preload)    │   │
  │  └──────┬──────┘  └───────┬───────┘   │
  │         │                 │           │
  │  ┌──────┴──────┐  ┌──────┴──────┐    │
  │  │  Auto       │  │  System     │    │
  │  │  Updater    │  │  Tray       │    │
  │  └─────────────┘  └─────────────┘    │
  │                                       │
  └──────────────────┬────────────────────┘
                     │ IPC
  ┌──────────────────┴────────────────────┐
  │         Renderer Process (Sandboxed)  │
  │                                       │
  │   ┌─────────────────────────────────┐ │
  │   │     React eOffice Application   │ │
  │   └─────────────────────────────────┘ │
  └───────────────────────────────────────┘
```

## 9.3 Security Hardening — Preload Script

The preload script provides a minimal, safe API surface to the renderer:

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations (sandboxed)
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: string) => ipcRenderer.invoke('dialog:saveFile', data),

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => process.platform,

  // Notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),

  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
});
```

### URL Validation

```typescript
function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['https:', 'http:'];
    if (parsed.protocol === 'eoffice:') return true;
    if (!allowedProtocols.includes(parsed.protocol)) return false;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```

## 9.4 Auto-Update

The desktop application supports automatic updates via electron-updater:

```typescript
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update:available', info.version);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow.webContents.send('update:ready', info.version);
});

autoUpdater.on('error', (err) => {
  log.error('Auto-update error:', err);
});

// Check for updates every 4 hours
setInterval(() => {
  autoUpdater.checkForUpdates();
}, 4 * 60 * 60 * 1000);
```

## 9.5 System Integration

| Feature          | Implementation                              |
|------------------|---------------------------------------------|
| System Tray      | Background operation with notification badge |
| File Association | `.edoc`, `.esheet`, `.eslide` file types     |
| Deep Linking     | `eoffice://` protocol handler               |
| Notifications    | Native OS notifications via Electron API     |
| Keyboard Shortcuts| Global shortcuts for quick capture          |
| Touch Bar        | macOS Touch Bar integration (Pro models)     |
| Jump List        | Windows taskbar jump list (recent files)     |

## 9.6 Build Targets

| Platform | Format      | Architecture | Build Command              |
|----------|-------------|-------------|----------------------------|
| Windows  | .exe NSIS   | x64, arm64  | `npm run build:desktop:win`|
| macOS    | .dmg        | x64, arm64  | `npm run build:desktop:mac`|
| Linux    | .AppImage   | x64         | `npm run build:desktop:linux`|
| Linux    | .deb        | x64         | `npm run build:desktop:linux`|
| Linux    | .rpm        | x64         | `npm run build:desktop:linux`|


---

# Chapter 10 — REST API Reference

## 10.1 Authentication

All API routes require an `Authorization` header with a valid Bearer token,
except for the authentication endpoints themselves.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john.doe",
  "email": "john@example.com",
  "password": "securePassword123"
}

Response: 201 Created
{
  "user": {
    "id": "uuid-v4-here",
    "username": "john.doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGci..."
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john.doe",
  "password": "securePassword123"
}

Response: 200 OK
{
  "user": {
    "id": "uuid-v4-here",
    "username": "john.doe"
  },
  "token": "eyJhbGci..."
}
```

## 10.2 Documents API (eDocs)

### List Documents

```http
GET /api/documents
Authorization: Bearer <token>

Response: 200 OK
{
  "documents": [
    {
      "id": "doc-uuid-1",
      "title": "Quarterly Report",
      "author": "john.doe",
      "createdAt": "2026-04-20T10:30:00Z",
      "updatedAt": "2026-04-24T14:15:00Z",
      "tags": ["report"],
      "version": 5
    }
  ]
}
```

### Create Document

```http
POST /api/documents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Document",
  "content": "<h1>Hello World</h1><p>This is my document.</p>",
  "format": "html",
  "tags": ["report", "q2"]
}

Response: 201 Created
{
  "id": "doc-uuid-new",
  "title": "New Document",
  "content": "<h1>Hello World</h1><p>This is my document.</p>",
  "format": "html",
  "author": "john.doe",
  "tags": ["report", "q2"],
  "createdAt": "2026-04-25T05:00:00Z",
  "updatedAt": "2026-04-25T05:00:00Z",
  "version": 1
}
```

## 10.3 Complete Endpoint Reference

### Spreadsheets (eSheets)

| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| GET    | `/api/spreadsheets`        | List spreadsheets        |
| GET    | `/api/spreadsheets/:id`    | Get spreadsheet          |
| POST   | `/api/spreadsheets`        | Create spreadsheet       |
| PUT    | `/api/spreadsheets/:id`    | Update spreadsheet       |
| DELETE | `/api/spreadsheets/:id`    | Delete spreadsheet       |

### Presentations (eSlides)

| Method | Path                        | Description               |
|--------|-----------------------------|---------------------------|
| GET    | `/api/presentations`        | List presentations        |
| GET    | `/api/presentations/:id`    | Get presentation          |
| POST   | `/api/presentations`        | Create presentation       |
| PUT    | `/api/presentations/:id`    | Update presentation       |
| DELETE | `/api/presentations/:id`    | Delete presentation       |

### Notes (eNotes)

| Method | Path                  | Description          |
|--------|-----------------------|----------------------|
| GET    | `/api/notes`          | List all notebooks   |
| GET    | `/api/notes/:id`      | Get notebook         |
| POST   | `/api/notes`          | Create notebook      |
| PUT    | `/api/notes/:id`      | Update notebook      |
| DELETE | `/api/notes/:id`      | Delete notebook      |

### Drive (eDrive)

| Method | Path                      | Description            |
|--------|---------------------------|------------------------|
| GET    | `/api/drive`              | List files             |
| GET    | `/api/drive/:id`          | Get file metadata      |
| POST   | `/api/drive/upload`       | Upload file            |
| GET    | `/api/drive/:id/download` | Download file          |
| DELETE | `/api/drive/:id`          | Delete file            |
| POST   | `/api/drive/:id/share`    | Create share link      |

### Tasks and Boards (ePlanner)

| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| GET    | `/api/boards`              | List boards              |
| GET    | `/api/boards/:id`          | Get board with tasks     |
| POST   | `/api/boards`              | Create board             |
| PUT    | `/api/boards/:id`          | Update board             |
| DELETE | `/api/boards/:id`          | Delete board             |
| POST   | `/api/tasks`               | Create task              |
| PUT    | `/api/tasks/:id`           | Update task              |
| DELETE | `/api/tasks/:id`           | Delete task              |
| PUT    | `/api/tasks/:id/move`      | Move task between columns|

### Forms (eForms)

| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| GET    | `/api/forms`               | List forms               |
| GET    | `/api/forms/:id`           | Get form definition      |
| POST   | `/api/forms`               | Create form              |
| PUT    | `/api/forms/:id`           | Update form              |
| DELETE | `/api/forms/:id`           | Delete form              |
| POST   | `/api/forms/:id/responses` | Submit form response     |
| GET    | `/api/forms/:id/responses` | Get all responses        |

### Database (eDB)

| Method | Path                           | Description           |
|--------|--------------------------------|-----------------------|
| GET    | `/api/databases`               | List databases        |
| GET    | `/api/databases/:id`           | Get database          |
| POST   | `/api/databases`               | Create database       |
| DELETE | `/api/databases/:id`           | Delete database       |
| GET    | `/api/databases/:id/tables`    | List tables           |
| POST   | `/api/databases/:id/tables`    | Create table          |
| POST   | `/api/databases/:id/query`     | Execute SQL query     |

### Connect (eConnect)

| Method | Path                           | Description           |
|--------|--------------------------------|-----------------------|
| GET    | `/api/channels`                | List channels         |
| GET    | `/api/channels/:id`            | Get channel           |
| POST   | `/api/channels`                | Create channel        |
| DELETE | `/api/channels/:id`            | Delete channel        |
| GET    | `/api/channels/:id/messages`   | Get channel messages  |
| POST   | `/api/channels/:id/messages`   | Send message          |

### Sway (eSway)

| Method | Path                  | Description          |
|--------|-----------------------|----------------------|
| GET    | `/api/sway`           | List presentations   |
| GET    | `/api/sway/:id`       | Get presentation     |
| POST   | `/api/sway`           | Create presentation  |
| PUT    | `/api/sway/:id`       | Update presentation  |
| DELETE | `/api/sway/:id`       | Delete presentation  |

## 10.4 eBot AI Endpoints

### Chat

```http
POST /api/ebot/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Summarize this document..." }
  ],
  "context": {
    "app": "edocs",
    "documentId": "doc-123"
  },
  "maxTokens": 500,
  "temperature": 0.7
}

Response: 200 OK
{
  "response": "Here is a summary of the document...",
  "usage": {
    "promptTokens": 150,
    "completionTokens": 80,
    "totalTokens": 230
  }
}
```

### Summarize

```http
POST /api/ebot/summarize
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Long text content to summarize...",
  "maxLength": 200
}

Response: 200 OK
{
  "summary": "Concise summary of the text...",
  "originalLength": 5000,
  "summaryLength": 180
}
```

## 10.5 WebSocket Endpoints

| Path            | Protocol | Description                           |
|-----------------|----------|---------------------------------------|
| `/ws/collab`    | WSS      | Real-time collaborative editing       |
| `/ws/signal`    | WSS      | WebRTC video/audio signaling          |

### Connection Example

```javascript
const ws = new WebSocket('wss://host/ws/collab?token=' + jwtToken);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'join',
    documentId: 'doc-123',
    userId: 'user-456'
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'edit':
      applyRemoteOperation(msg.operation);
      break;
    case 'cursor':
      updateRemoteCursor(msg.position);
      break;
    case 'presence':
      updatePresenceList(msg.users);
      break;
    case 'sync':
      replaceDocumentContent(msg.content, msg.version);
      break;
  }
};
```

## 10.6 Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "requestId": "req-uuid-here"
}
```

### Common Error Codes

| Code                  | Status | Description                          |
|-----------------------|--------|--------------------------------------|
| `UNAUTHORIZED`        | 401    | Missing or invalid token             |
| `FORBIDDEN`           | 403    | Insufficient permissions             |
| `NOT_FOUND`           | 404    | Resource not found                   |
| `VALIDATION_ERROR`    | 400    | Invalid request body                 |
| `RATE_LIMITED`        | 429    | Too many requests                    |
| `CONFLICT`            | 409    | Version conflict (stale update)      |
| `PAYLOAD_TOO_LARGE`   | 413    | Request body exceeds limit           |
| `INTERNAL_ERROR`      | 500    | Server error                         |


---

# Chapter 11 — Plugin and Extension System

## 11.1 Browser Extension

The eOffice Chrome Extension provides quick access to eOffice features
from any web page.

### Features

- Quick note capture from selected text
- Save web page to eDrive
- Quick compose email
- Search across eOffice from the browser toolbar
- Context menu integration

### Manifest Structure

```json
{
  "manifest_version": 3,
  "name": "eOffice Extension",
  "version": "1.0.0",
  "description": "Access eOffice from any web page",
  "permissions": [
    "activeTab",
    "storage",
    "contextMenus",
    "notifications"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/eoffice-16.png",
      "48": "icons/eoffice-48.png",
      "128": "icons/eoffice-128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ]
}
```

### Context Menu Actions

```typescript
// background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-enotes',
    title: 'Save to eNotes',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'save-to-edrive',
    title: 'Save page to eDrive',
    contexts: ['page'],
  });
  chrome.contextMenus.create({
    id: 'ask-ebot',
    title: 'Ask eBot about this',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'save-to-enotes':
      saveSelectionToNotes(info.selectionText);
      break;
    case 'save-to-edrive':
      savePageToDrive(tab?.url, tab?.title);
      break;
    case 'ask-ebot':
      askEBotAbout(info.selectionText);
      break;
  }
});
```

## 11.2 IDE Extensions

eOffice provides extensions for popular IDEs to integrate task management
and documentation directly into the development workflow.

### VS Code Extension Features

- View and manage ePlanner tasks from the sidebar
- Create eDocs documents from code comments
- Search eNotes from the command palette
- Link code to ePlanner tasks via comments
- Status bar integration showing active tasks

### VS Code Extension Commands

| Command                          | Description                    |
|----------------------------------|--------------------------------|
| `eoffice.tasks.list`            | Show task board in sidebar     |
| `eoffice.tasks.create`          | Create new task                |
| `eoffice.notes.search`          | Search notes from command bar  |
| `eoffice.docs.createFromFile`   | Create doc from current file   |
| `eoffice.ebot.ask`             | Ask eBot a question            |

## 11.3 Extension API

Third-party developers can create extensions using the eOffice Extension API:

```typescript
interface EOfficeExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  activate(context: ExtensionContext): void;
  deactivate(): void;
}

interface ExtensionContext {
  api: EOfficeAPI;
  storage: ExtensionStorage;
  subscriptions: Disposable[];
  logger: Logger;
}

interface EOfficeAPI {
  documents: DocumentsAPI;
  notes: NotesAPI;
  drive: DriveAPI;
  tasks: TasksAPI;
  ebot: EBotAPI;
  events: EventEmitter;
}

// Example extension
const myExtension: EOfficeExtension = {
  id: 'my-extension',
  name: 'My Custom Extension',
  version: '1.0.0',
  description: 'Adds custom functionality to eOffice',
  author: 'developer@example.com',
  permissions: ['documents:read', 'ebot:chat'],

  activate(context) {
    context.api.events.on('document:saved', async (doc) => {
      const summary = await context.api.ebot.summarize({ text: doc.content });
      context.logger.info('Document summarized: ' + summary.summaryLength + ' chars');
    });
  },

  deactivate() {
    // Cleanup
  },
};
```

---

# Chapter 12 — Deployment

## 12.1 Development Setup

```bash
# Clone the repository
git clone https://github.com/AuditAlly/eOffice.git
cd eOffice

# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev

# Start Electron desktop app in dev mode
npm run dev:desktop

# Open in browser
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## 12.2 Production Build

```bash
# Build all packages
npm run build

# Build desktop installers
npm run build:desktop      # All platforms
npm run build:desktop:win  # Windows (.exe)
npm run build:desktop:mac  # macOS (.dmg)
npm run build:desktop:linux # Linux (.AppImage, .deb)

# Build PWA
npm run build:pwa

# Build browser extension
npm run build:extension
```

## 12.3 Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN npm ci --production=false
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3001/health || exit 1

USER node
CMD ["node", "dist/server/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  eoffice:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - eoffice-data:/home/node/.eoffice/data
      - eoffice-uploads:/home/node/.eoffice/uploads
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - EBOT_PROVIDER=local
      - EBOT_MODEL=default
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./enterprise/docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - eoffice
    restart: unless-stopped

volumes:
  eoffice-data:
  eoffice-uploads:
```

### Nginx Configuration

```nginx
upstream eoffice_backend {
    server eoffice:3001;
}

server {
    listen 443 ssl http2;
    server_name office.example.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # WebSocket support
    location /ws/ {
        proxy_pass http://eoffice_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # API routes
    location /api/ {
        proxy_pass http://eoffice_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25M;
    }

    # Static frontend
    location / {
        proxy_pass http://eoffice_backend;
        proxy_set_header Host $host;
    }
}
```

## 12.4 Kubernetes with Helm

### Helm Chart Structure

```
enterprise/helm/eoffice/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── hpa.yaml
│   └── pvc.yaml
└── charts/
```

### values.yaml

```yaml
replicaCount: 3

image:
  repository: eoffice/server
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3001

ingress:
  enabled: true
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "25m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "86400"
  hosts:
    - host: office.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: eoffice-tls
      hosts:
        - office.example.com

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

persistence:
  enabled: true
  storageClass: standard
  size: 10Gi

env:
  NODE_ENV: production
  EBOT_PROVIDER: local
```

### Deploy Commands

```bash
# Install the chart
helm install eoffice enterprise/helm/eoffice \
  --namespace eoffice \
  --create-namespace \
  --set env.JWT_SECRET=$(openssl rand -hex 32)

# Upgrade to a new version
helm upgrade eoffice enterprise/helm/eoffice \
  --namespace eoffice \
  --set image.tag=v1.2.0

# Rollback to previous release
helm rollback eoffice 1 --namespace eoffice

# View release status
helm status eoffice --namespace eoffice

# Uninstall
helm uninstall eoffice --namespace eoffice
```

## 12.5 Enterprise Deployment Checklist

| Item                        | Action                                       |
|-----------------------------|----------------------------------------------|
| JWT Secret                  | Generate with `openssl rand -hex 32`          |
| TLS Certificates            | Configure HTTPS with valid certificates       |
| Data Backup                 | Schedule regular backups of data volume       |
| Rate Limits                 | Adjust based on expected user count           |
| Logging                     | Configure log aggregation (ELK, Loki, etc.)  |
| Monitoring                  | Set up health checks and alerting (Prometheus)|
| SSO Integration             | Configure SAML/OIDC if needed                 |
| File Storage                | Use networked storage for HA (NFS, EFS)       |
| eBot Provider               | Configure AI provider and API keys            |
| Security Audit              | Run security scan before go-live              |
| DNS                         | Configure DNS records for the domain          |
| Firewall                    | Open ports 80, 443; restrict 3001 internally  |


---

# Chapter 13 — Testing and Quality

## 13.1 Testing Framework

eOffice uses **Vitest** as its primary testing framework, chosen for its
native TypeScript support and Vite integration.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run packages/core/src/__tests__/auth.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "JWT"
```

## 13.2 Test Suite Overview

The project maintains 75+ tests across multiple categories:

| Category          | Count | Description                                   |
|-------------------|-------|-----------------------------------------------|
| Core Models       | 15+   | Data model validation and serialization        |
| Authentication    | 12+   | JWT creation, verification, expiration         |
| Password Hashing  | 8+    | scrypt hashing and verification                |
| Input Sanitization| 10+   | XSS, prototype pollution, field extraction     |
| Path Traversal    | 8+    | FileStore path sanitization                    |
| API Routes        | 15+   | Endpoint integration tests                     |
| Utilities         | 10+   | Helper function unit tests                     |

## 13.3 Security Test Examples

### JWT Security Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createToken, verifyToken } from '../auth/jwt';

describe('JWT Security', () => {
  const secret = 'test-secret-key-for-testing';

  it('should create a valid token', () => {
    const token = createToken(
      { sub: 'user-1', username: 'test' },
      secret
    );
    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3);
  });

  it('should reject tampered tokens', () => {
    const token = createToken(
      { sub: 'user-1', username: 'test' },
      secret
    );
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyToken(tampered, secret)).toThrow();
  });

  it('should reject expired tokens', () => {
    const token = createToken(
      {
        sub: 'user-1',
        username: 'test',
        exp: Math.floor(Date.now() / 1000) - 3600,
      },
      secret
    );
    expect(() => verifyToken(token, secret)).toThrow('expired');
  });

  it('should reject tokens with wrong secret', () => {
    const token = createToken(
      { sub: 'user-1', username: 'test' },
      secret
    );
    expect(() => verifyToken(token, 'wrong-secret')).toThrow();
  });
});
```

### XSS Protection Tests

```typescript
describe('XSS Protection', () => {
  it('should sanitize script tags', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should sanitize event handlers', () => {
    const input = '<img onerror="alert(1)" src="x">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
  });

  it('should preserve safe content', () => {
    const input = 'Hello, World! This is normal text.';
    const result = sanitizeHtml(input);
    expect(result).toBe(input);
  });
});
```

### Prototype Pollution Tests

```typescript
describe('Prototype Pollution Protection', () => {
  it('should block __proto__ injection', () => {
    const malicious = { __proto__: { admin: true }, name: 'test' };
    const result = safeExtract(malicious, ['name', '__proto__']);
    expect(result).not.toHaveProperty('__proto__');
    expect(result).toHaveProperty('name', 'test');
  });

  it('should block constructor pollution', () => {
    const malicious = { constructor: { prototype: { admin: true } } };
    const result = safeExtract(malicious, ['constructor']);
    expect(result).not.toHaveProperty('constructor');
  });
});
```

### Path Traversal Tests

```typescript
describe('Path Traversal Protection', () => {
  it('should strip directory traversal sequences', () => {
    const store = new FileStore('test');
    expect(() => store.getById('../../etc/passwd')).not.toThrow();
  });

  it('should strip absolute paths', () => {
    const store = new FileStore('test');
    expect(() => store.getById('/etc/shadow')).not.toThrow();
  });

  it('should reject empty identifiers after sanitization', () => {
    const store = new FileStore('test');
    expect(() => store.getById('../../')).toThrow('Invalid identifier');
  });
});
```

## 13.4 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v4

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --production
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'

  docker:
    needs: [test, build]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: eoffice/server:latest
```

## 13.5 Code Quality Standards

| Metric               | Target    | Tool         |
|-----------------------|-----------|-------------|
| Test Coverage         | > 80%     | Vitest       |
| TypeScript Strict     | Enabled   | tsc          |
| Lint Errors           | 0         | ESLint       |
| Security Vulnerabilities| 0 critical | npm audit |
| Bundle Size (gzipped) | < 500KB   | Vite         |

---

# Appendix A — Environment Variables Reference

| Variable            | Default             | Description                              |
|---------------------|---------------------|------------------------------------------|
| `NODE_ENV`          | `development`       | Runtime environment                      |
| `PORT`              | `3001`              | Server listening port                    |
| `HOST`              | `0.0.0.0`           | Server bind address                      |
| `JWT_SECRET`        | (generated)         | HMAC-SHA256 signing key                  |
| `JWT_EXPIRY`        | `1h`                | Token expiration duration                |
| `DATA_DIR`          | `~/.eoffice/data`   | Data storage directory                   |
| `UPLOAD_DIR`        | `~/.eoffice/uploads`| File upload directory                    |
| `UPLOAD_MAX_SIZE`   | `26214400`          | Max upload size in bytes (25 MB)         |
| `LOG_LEVEL`         | `info`              | Logging level (debug, info, warn, error) |
| `LOG_DIR`           | `~/.eoffice/logs`   | Log file directory                       |
| `EBOT_PROVIDER`     | `local`             | AI provider (local, openai, anthropic)   |
| `EBOT_MODEL`        | `default`           | AI model identifier                      |
| `EBOT_API_KEY`      | —                   | API key for cloud AI providers           |
| `EBOT_ENDPOINT`     | —                   | Custom AI provider endpoint              |
| `EBOT_MAX_TOKENS`   | `1024`              | Maximum AI response tokens               |
| `EBOT_TEMPERATURE`  | `0.7`               | AI response temperature (0.0-1.0)        |
| `RATE_LIMIT_GLOBAL` | `100`               | Global rate limit per minute             |
| `RATE_LIMIT_LOGIN`  | `5`                 | Login attempts per 15 minutes            |
| `RATE_LIMIT_REGISTER`| `3`                | Registration attempts per hour           |
| `RATE_LIMIT_AI`     | `30`                | AI requests per minute                   |
| `RATE_LIMIT_EMAIL`  | `20`                | Emails per hour                          |
| `CORS_ORIGIN`       | `*`                 | CORS allowed origins                     |
| `WS_MAX_MESSAGE`    | `65536`             | WebSocket max message size (bytes)       |
| `WS_MAX_ROOMS`      | `50`                | WebSocket max rooms per connection       |
| `WS_HEARTBEAT`      | `30000`             | WebSocket heartbeat interval (ms)        |
| `SMTP_HOST`         | —                   | Default SMTP server host                 |
| `SMTP_PORT`         | `587`               | Default SMTP server port                 |
| `IMAP_HOST`         | —                   | Default IMAP server host                 |
| `IMAP_PORT`         | `993`               | Default IMAP server port                 |
| `SESSION_CLEANUP`   | `3600000`           | Session cleanup interval (ms)            |

---

# Appendix B — API Endpoint Quick Reference

## Authentication

| Method | Path                  | Auth | Rate Limit | Description         |
|--------|-----------------------|------|------------|---------------------|
| POST   | `/api/auth/register`  | No   | 3/hr       | Register new user   |
| POST   | `/api/auth/login`     | No   | 5/15min    | Login               |
| POST   | `/api/auth/refresh`   | Yes  | 100/min    | Refresh token       |
| POST   | `/api/auth/logout`    | Yes  | 100/min    | Logout              |

## Documents (eDocs)

| Method | Path                  | Auth | Description            |
|--------|-----------------------|------|------------------------|
| GET    | `/api/documents`      | Yes  | List documents         |
| GET    | `/api/documents/:id`  | Yes  | Get document           |
| POST   | `/api/documents`      | Yes  | Create document        |
| PUT    | `/api/documents/:id`  | Yes  | Update document        |
| DELETE | `/api/documents/:id`  | Yes  | Delete document        |

## Spreadsheets (eSheets)

| Method | Path                       | Auth | Description         |
|--------|----------------------------|------|---------------------|
| GET    | `/api/spreadsheets`        | Yes  | List spreadsheets   |
| POST   | `/api/spreadsheets`        | Yes  | Create spreadsheet  |
| PUT    | `/api/spreadsheets/:id`    | Yes  | Update spreadsheet  |
| DELETE | `/api/spreadsheets/:id`    | Yes  | Delete spreadsheet  |

## Presentations (eSlides)

| Method | Path                        | Auth | Description          |
|--------|-----------------------------|------|----------------------|
| GET    | `/api/presentations`        | Yes  | List presentations   |
| POST   | `/api/presentations`        | Yes  | Create presentation  |
| PUT    | `/api/presentations/:id`    | Yes  | Update presentation  |
| DELETE | `/api/presentations/:id`    | Yes  | Delete presentation  |

## Notes (eNotes)

| Method | Path             | Auth | Description     |
|--------|------------------|------|-----------------|
| GET    | `/api/notes`     | Yes  | List notebooks  |
| POST   | `/api/notes`     | Yes  | Create notebook |
| PUT    | `/api/notes/:id` | Yes  | Update notebook |
| DELETE | `/api/notes/:id` | Yes  | Delete notebook |

## Drive (eDrive)

| Method | Path                       | Auth | Description      |
|--------|----------------------------|------|------------------|
| GET    | `/api/drive`               | Yes  | List files       |
| POST   | `/api/drive/upload`        | Yes  | Upload file      |
| GET    | `/api/drive/:id/download`  | Yes  | Download file    |
| POST   | `/api/drive/:id/share`     | Yes  | Share file       |
| DELETE | `/api/drive/:id`           | Yes  | Delete file      |

## Boards and Tasks (ePlanner)

| Method | Path                  | Auth | Description      |
|--------|-----------------------|------|------------------|
| GET    | `/api/boards`         | Yes  | List boards      |
| POST   | `/api/boards`         | Yes  | Create board     |
| POST   | `/api/tasks`          | Yes  | Create task      |
| PUT    | `/api/tasks/:id`      | Yes  | Update task      |
| PUT    | `/api/tasks/:id/move` | Yes  | Move task        |
| DELETE | `/api/tasks/:id`      | Yes  | Delete task      |

## Forms (eForms)

| Method | Path                          | Auth | Description        |
|--------|-------------------------------|------|--------------------|
| GET    | `/api/forms`                  | Yes  | List forms         |
| POST   | `/api/forms`                  | Yes  | Create form        |
| POST   | `/api/forms/:id/responses`    | Yes  | Submit response    |
| GET    | `/api/forms/:id/responses`    | Yes  | Get responses      |

## Database (eDB)

| Method | Path                          | Auth | Description       |
|--------|-------------------------------|------|-------------------|
| GET    | `/api/databases`              | Yes  | List databases    |
| POST   | `/api/databases`              | Yes  | Create database   |
| POST   | `/api/databases/:id/tables`   | Yes  | Create table      |
| POST   | `/api/databases/:id/query`    | Yes  | Execute query     |

## Connect (eConnect)

| Method | Path                             | Auth | Description      |
|--------|----------------------------------|------|------------------|
| GET    | `/api/channels`                  | Yes  | List channels    |
| POST   | `/api/channels`                  | Yes  | Create channel   |
| POST   | `/api/channels/:id/messages`     | Yes  | Send message     |
| GET    | `/api/channels/:id/messages`     | Yes  | Get messages     |

## Sway (eSway)

| Method | Path              | Auth | Description          |
|--------|-------------------|------|----------------------|
| GET    | `/api/sway`       | Yes  | List presentations   |
| POST   | `/api/sway`       | Yes  | Create presentation  |
| PUT    | `/api/sway/:id`   | Yes  | Update presentation  |
| DELETE | `/api/sway/:id`   | Yes  | Delete presentation  |

## Email (eMail)

| Method | Path                        | Auth | Description       |
|--------|-----------------------------|------|-------------------|
| GET    | `/api/email/accounts`       | Yes  | List accounts     |
| POST   | `/api/email/accounts`       | Yes  | Add account       |
| GET    | `/api/email/messages`       | Yes  | List messages     |
| POST   | `/api/email/send`           | Yes  | Send email        |
| POST   | `/api/email/draft`          | Yes  | Save draft        |

## AI (eBot)

| Method | Path                   | Auth | Rate Limit | Description    |
|--------|------------------------|------|------------|----------------|
| POST   | `/api/ebot/chat`       | Yes  | 30/min     | Chat with AI   |
| POST   | `/api/ebot/summarize`  | Yes  | 30/min     | Summarize text |

## WebSocket

| Path          | Protocol | Description                  |
|---------------|----------|------------------------------|
| `/ws/collab`  | WSS      | Real-time collaboration      |
| `/ws/signal`  | WSS      | WebRTC signaling             |

---

# Appendix C — Troubleshooting

## Common Issues

### 1. Server Fails to Start

**Symptom:** `Error: EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find and kill the process using port 3001
lsof -i :3001
kill -9 <PID>

# Or change the port
PORT=3002 npm run dev
```

### 2. JWT Token Expired

**Symptom:** `401 Unauthorized` with message `Token expired`

**Solution:** The client should automatically refresh tokens before expiry.
If manual intervention is needed:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'
```

### 3. WebSocket Connection Fails

**Symptom:** WebSocket connection closes immediately with code 4001

**Causes and Solutions:**
- **Invalid token:** Ensure the JWT token is valid and not expired
- **Origin blocked:** Add your origin to the CORS_ORIGIN environment variable
- **Message too large:** Keep messages under 64 KB

### 4. eBot AI Not Responding

**Symptom:** AI requests return `503 Service Unavailable`

**Solutions:**
- Verify the eBot provider is configured correctly in environment variables
- Check that the local LLM is running (if using local provider)
- Verify API key is set (if using cloud provider)
- Check rate limits — maximum 30 requests per minute
- Check server logs for provider connection errors

### 5. Email Connection Failed

**Symptom:** `Error: Connection refused` when adding email account

**Solutions:**
- Verify IMAP/SMTP host and port settings match your provider
- Ensure the email server allows app-specific passwords
- Check firewall rules for IMAP (993) and SMTP (587) ports
- For Gmail, use app passwords (not regular password)
- Verify TLS/SSL settings match server requirements

### 6. Data Directory Permissions

**Symptom:** `Error: EACCES: permission denied`

**Solution:**
```bash
# Fix permissions on data directory
chmod -R 700 ~/.eoffice/
chown -R $(whoami) ~/.eoffice/
```

### 7. Electron App Shows Blank Screen

**Symptom:** Desktop app opens but shows a white/blank window

**Solutions:**
- Check developer console (Ctrl+Shift+I) for CSP violations
- Ensure the backend server is running on the expected port
- Verify the Electron main process logs in the terminal
- Clear the Electron cache: delete `~/.config/eoffice/` (Linux)

### 8. Docker Container Health Check Failing

**Symptom:** Container status shows `unhealthy`

**Solutions:**
```bash
# Check container logs
docker logs eoffice-server

# Verify the health endpoint
docker exec eoffice-server wget -qO- http://localhost:3001/health

# Check if data volume is mounted correctly
docker inspect eoffice-server | grep Mounts

# Restart the container
docker restart eoffice-server
```

### 9. Rate Limit Exceeded

**Symptom:** `429 Too Many Requests`

**Solutions:**
- Wait for the rate limit window to reset (check Retry-After header)
- For login: wait 15 minutes after 5 failed attempts
- For AI: wait 1 minute after 30 requests
- Adjust rate limits via environment variables for enterprise deployments

### 10. Build Failures

**Symptom:** `npm run build` fails with TypeScript errors

**Solutions:**
```bash
# Clear build caches
rm -rf node_modules/.cache dist/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run type checking separately to isolate errors
npx tsc --noEmit

# Check for version mismatches
npm ls
```

---

# Glossary

| Term               | Definition                                                       |
|--------------------|------------------------------------------------------------------|
| **CRDT**           | Conflict-free Replicated Data Type — a data structure for distributed systems that resolves conflicts automatically |
| **CSP**            | Content Security Policy — an HTTP header that restricts resource loading |
| **eBot**           | The AI engine powering all intelligent features in eOffice        |
| **eOffice**        | The complete open-source office productivity suite                |
| **EmbeddedOS**     | The parent open-source ecosystem that eOffice belongs to          |
| **FileStore**      | The file-based JSON storage system used by eOffice                |
| **HMAC**           | Hash-based Message Authentication Code — used for JWT signing     |
| **HSTS**           | HTTP Strict Transport Security — forces HTTPS connections         |
| **IMAP**           | Internet Message Access Protocol — for reading email              |
| **IPC**            | Inter-Process Communication — used in Electron between processes  |
| **JWT**            | JSON Web Token — a stateless authentication token format          |
| **LLM**            | Large Language Model — the AI model type used by eBot             |
| **Monorepo**       | A single repository containing multiple related projects          |
| **OT**             | Operational Transformation — algorithm for resolving concurrent edits |
| **PWA**            | Progressive Web App — a web app installable as a native app       |
| **scrypt**         | A password-based key derivation function used for hashing         |
| **SMTP**           | Simple Mail Transfer Protocol — for sending email                 |
| **SPA**            | Single Page Application — a web app that loads a single HTML page |
| **TLS**            | Transport Layer Security — encryption for network communication   |
| **Vite**           | A fast frontend build tool and development server                 |
| **Vitest**         | A Vite-native testing framework                                   |
| **WebRTC**         | Web Real-Time Communication — for peer-to-peer audio/video        |
| **WebSocket**      | A protocol for full-duplex communication over TCP                 |
| **WSS**            | WebSocket Secure — WebSocket over TLS                             |
| **XSS**            | Cross-Site Scripting — a web security vulnerability               |

---

*End of eOffice Suite — AI-Powered Office Productivity: Product Reference*

*Copyright 2026 Srikanth Patchava and EmbeddedOS Contributors. MIT License.*

*Generated April 2026.*

## References

::: {#refs}
:::
