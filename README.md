# eOffice — The World's Most Advanced Open-Source Office Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-purple)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-teal)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green)](https://web.dev/progressive-web-apps/)

> **eOffice** is a production-ready, feature-rich office suite that surpasses Microsoft Office, LibreOffice, and OpenOffice in performance, design, and AI-powered features. Built with modern web technologies for the web, mobile, and desktop.

---

## ✨ Features

### 📝 eOffice Writer
- Full rich-text editor powered by TipTap (ProseMirror)
- AI-powered writing assistant (grammar, style, summarization, translation)
- Real-time collaboration with presence indicators
- Export to DOCX, PDF, HTML, Markdown, ODT
- 50+ document templates
- Track changes and version history
- Table of contents, footnotes, endnotes
- Mail merge and form letters
- Advanced typography controls
- Spell check in 25+ languages

### 📊 eOffice Calc
- High-performance spreadsheet engine
- 300+ built-in formulas (SUM, AVERAGE, VLOOKUP, IF, etc.)
- Multiple sheets per workbook
- Charts and data visualization (bar, line, pie, scatter, etc.)
- Pivot tables and data analysis
- Conditional formatting
- Data validation and drop-down lists
- Import/export CSV, XLSX, ODS
- Freeze rows/columns
- Formula autocomplete

### 🎨 eOffice Impress
- Beautiful presentation editor
- 50+ professional themes
- Smooth slide transitions (fade, slide, zoom, flip, cube)
- Element animations
- Real-time presentation mode
- Speaker notes
- Export to PPTX, PDF, HTML, PNG
- Drag-and-drop slide reordering
- Text, image, shape, chart, and table elements
- Collaborative editing

### 📄 eOffice PDF
- Fast PDF viewer with zoom and rotation
- Annotations (highlights, notes, underlines)
- Bookmarks and navigation
- Full-text search
- Form filling
- PDF to Word conversion
- Drag-and-drop file opening
- Print support

### 🤖 AI Assistant
- Integrated AI writing assistant
- Grammar and style improvements
- Text summarization
- Language translation (100+ languages)
- Content generation
- Document analysis
- Powered by OpenAI GPT-4

### 🌍 Internationalization
- 25+ languages supported
- RTL support (Arabic, Hebrew, Persian)
- Locale-aware date, time, and number formatting
- Language: English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Hindi, Portuguese, Russian, Italian, Dutch, Turkish, Polish, Vietnamese, Thai, Indonesian, Swedish, Danish, Norwegian, Finnish, Czech, Hungarian, Romanian

### 🔒 Security & Privacy
- All data stored locally in browser
- Optional cloud sync
- End-to-end encryption for shared documents
- No tracking or analytics by default
- GDPR compliant

### 📱 Cross-Platform
- Progressive Web App (PWA) — installable on any device
- Responsive design for mobile and tablet
- Works offline with service worker
- Chrome, Firefox, Safari, Edge support
- Android and iOS compatible

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/embeddedos-org/eOffice.git
cd eOffice

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Environment Variables

Create a `.env.local` file:

```env
# OpenAI API Key (optional - for AI features)
VITE_OPENAI_API_KEY=sk-your-key-here

# App URL
VITE_APP_URL=https://eoffice.app

# Feature flags
VITE_ENABLE_COLLABORATION=true
VITE_ENABLE_AI=true
VITE_ENABLE_CLOUD_SYNC=false
```

---

## 🏗️ Architecture

```
eOffice/
├── public/
│   ├── locales/          # i18n translation files (25+ languages)
│   ├── icons/            # PWA icons
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service worker
├── src/
│   ├── components/
│   │   ├── ai/           # AI assistant components
│   │   ├── collaboration/ # Real-time collaboration
│   │   ├── editor/       # Writer editor components
│   │   ├── presentation/ # Impress components
│   │   ├── spreadsheet/  # Calc components
│   │   └── shared/       # Shared UI components
│   ├── pages/
│   │   ├── HomePage.tsx  # Dashboard
│   │   ├── WriterPage.tsx # Document editor
│   │   ├── CalcPage.tsx  # Spreadsheet
│   │   ├── ImpressPage.tsx # Presentations
│   │   ├── PDFPage.tsx   # PDF viewer
│   │   └── SettingsPage.tsx # Settings
│   ├── store/
│   │   ├── documentStore.ts # Document state management
│   │   └── themeStore.ts    # Theme state
│   ├── i18n/
│   │   └── config.ts     # i18n configuration
│   ├── utils/
│   │   └── cn.ts         # Utility functions
│   └── styles/
│       └── globals.css   # Global styles
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with concurrent features |
| **TypeScript 5** | Type safety and developer experience |
| **Vite 5** | Lightning-fast build tool |
| **TailwindCSS 3** | Utility-first styling |
| **TipTap 2** | Rich text editor (Writer) |
| **Zustand** | Lightweight state management |
| **React Router 6** | Client-side routing |
| **React i18next** | Internationalization |
| **Lucide React** | Icon library |
| **React Hot Toast** | Notifications |
| **date-fns** | Date utilities |
| **file-saver** | File download utilities |
| **react-dropzone** | Drag-and-drop file upload |

---

## 🎯 Comparison: eOffice vs Competitors

| Feature | eOffice | MS Office | LibreOffice | OpenOffice |
|---------|---------|-----------|-------------|------------|
| **Price** | Free & Open Source | $99+/year | Free | Free |
| **AI Assistant** | ✅ Built-in | ✅ Copilot ($30/mo) | ❌ | ❌ |
| **Web-based** | ✅ Native | ✅ Limited | ❌ | ❌ |
| **Real-time Collaboration** | ✅ | ✅ | ❌ | ❌ |
| **PWA / Offline** | ✅ | ❌ | ❌ | ❌ |
| **Mobile** | ✅ Responsive | ✅ Separate app | ❌ | ❌ |
| **25+ Languages** | ✅ | ✅ | ✅ | ✅ |
| **RTL Support** | ✅ | ✅ | ✅ | ✅ |
| **Dark Mode** | ✅ | ✅ | ❌ | ❌ |
| **Open Source** | ✅ MIT | ❌ | ✅ MPL | ✅ Apache |
| **Performance** | ⚡ Instant | 🐌 Heavy | 🐌 Heavy | 🐌 Heavy |
| **Modern UI** | ✅ | ✅ | ❌ Dated | ❌ Dated |
| **Browser Extension** | ✅ | ❌ | ❌ | ❌ |

---

## 🔧 Development

### Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript type checking
pnpm test         # Run tests
```

### Adding a New Language

1. Create `public/locales/{code}/common.json`
2. Add the language to `src/i18n/config.ts`
3. Add translations for all keys

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [TipTap](https://tiptap.dev/) — Excellent rich text editor framework
- [Lucide](https://lucide.dev/) — Beautiful icon library
- [TailwindCSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Vite](https://vitejs.dev/) — Next generation frontend tooling
- [React](https://reactjs.org/) — The UI library that powers everything

---

## 📞 Support

- 📧 Email: support@eoffice.app
- 🐛 Issues: [GitHub Issues](https://github.com/embeddedos-org/eOffice/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/embeddedos-org/eOffice/discussions)
- 📖 Docs: [docs.eoffice.app](https://docs.eoffice.app)

---

<p align="center">Made with ❤️ by the eOffice Team</p>
