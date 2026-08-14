# eOffice — Open-Source Office Suite

[![CI](https://github.com/embeddedos-org/eOffice/actions/workflows/ci.yml/badge.svg)](https://github.com/embeddedos-org/eOffice/actions/workflows/ci.yml)
[![CodeQL](https://github.com/embeddedos-org/eOffice/actions/workflows/codeql.yml/badge.svg)](https://github.com/embeddedos-org/eOffice/actions/workflows/codeql.yml)
[![Scorecard](https://github.com/embeddedos-org/eOffice/actions/workflows/scorecard.yml/badge.svg)](https://github.com/embeddedos-org/eOffice/actions/workflows/scorecard.yml)
[![Release](https://github.com/embeddedos-org/eOffice/actions/workflows/release.yml/badge.svg)](https://github.com/embeddedos-org/eOffice/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

eOffice is an open-source office suite for the **EmbeddedOS (EoS)** ecosystem,
built as a TypeScript/React monorepo. A single Vite web app hosts a launcher and
eleven productivity apps — documents, spreadsheets, slides, and more — that also
ship as browser (PWA) builds, an Electron desktop app, and editor/browser
extensions. It is part of the [EmbeddedOS (EoS)](https://github.com/embeddedos-org)
ecosystem and is also bundled into the
[eApps](https://github.com/embeddedos-org/eApps) marketplace. Package `eoffice`,
version 1.0.0.

## Apps

The suite lives under `apps/` (a pnpm workspace):

| App | Folder | Purpose |
|---|---|---|
| eDocs | `apps/edocs` | Rich-text documents (TipTap / ProseMirror) |
| eSheets | `apps/esheets` | Spreadsheets (HyperFormula engine) |
| eSlides | `apps/eslides` | Presentations |
| ePlanner | `apps/eplanner` | Planning / calendar |
| eNotes | `apps/enotes` | Notes |
| eMail | `apps/email` | Mail client |
| eDrive | `apps/edrive` | File storage |
| eConnect | `apps/econnect` | Messaging / connectivity |
| eForms | `apps/eforms` | Forms |
| eSway | `apps/esway` | Web storytelling pages |
| eDB | `apps/edb` | Embedded-database front-end |

Plus `apps/launcher` (suite shell) and `apps/shared` (shared app code).

## Repository layout

| Path | Contents |
|---|---|
| `src/` | Web app shell — `App.tsx`, `main.tsx`, `components/`, `pages/`, `store/`, `i18n/`, `styles/` |
| `apps/` | The eleven suite apps plus `launcher` and `shared` |
| `packages/` | Shared libraries: `core`, `server`, `ebot-client` |
| `browser/` | Static per-app HTML entry points |
| `desktop/` | Electron wrapper (`main.js`, `preload.js`, auto-updater) |
| `extensions/` | Editor/browser integrations: `browser`, `safari`, `vscode`, `jetbrains`, `obsidian`, `slack`, `raycast`, `github`, `google-workspace`, `office365` |
| `e2e/` | Playwright end-to-end tests |
| `docs/` | Documentation |

## Stack

React 18 · TypeScript · Vite · TanStack Query · Zustand · i18next · TipTap
(rich text) · HyperFormula (spreadsheets) · Framer Motion. Managed as a pnpm
workspace (`packages/*`, `apps/*`).

## Develop

```bash
pnpm install
pnpm dev          # Vite dev server
pnpm build        # tsc && vite build
pnpm build:pwa    # PWA build
pnpm preview      # preview the production build
```

Desktop (Electron) and extension packaging:

```bash
pnpm build:extension                     # package a browser/editor extension
cd desktop && npm install && npm start   # run the Electron app
```

## Test

```bash
pnpm test        # Vitest unit tests
pnpm test:e2e    # Playwright end-to-end tests
pnpm lint        # ESLint
pnpm type-check  # tsc --noEmit
```

## Docs

See [`docs/`](docs/); `APPS_STATUS.md` and `FEATURE_VALIDATION.md` track per-app
status.

## License

Licensed under the [MIT License](LICENSE).
