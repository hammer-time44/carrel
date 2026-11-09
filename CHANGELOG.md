# Changelog: Study Workspace

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-11-08

### Added
- **TypeScript Strict Migration:** Completely rebuilt codebase in strict TypeScript with modern Vite build pipeline and React 19.
- **True DOCX Round-Trip:** Real binary saving to `.docx` format using `docx` OpenXML Packer with headings, paragraphs, and list formatting.
- **Virtualized Spreadsheets:** High-performance data grid capable of rendering 100,000+ rows smoothly with formula bar and in-grid editing.
- **PDF Study Viewer:** Search with highlighted matches, page outline list, zoom controls, and persisted highlight/note annotations.
- **Presentation Mode:** Clean PowerPoint viewer with speaker notes, outline list, and fullscreen keyboard presentation mode (`F5`).
- **Side-by-Side Split View:** Multi-pane workspace view for comparative study with resizable dividers.
- **Productivity Navigation:** Command Palette (`Ctrl+K`) and quick switcher with fuzzy search across open tabs, commands, and recent files.
- **Spaced Repetition Tools:** Built-in SM-2 flashcard reviewer and per-document study notes with anchors.
- **Full-Stack Sync Backend:** Fastify + PostgreSQL + Docker Compose sync server in `/server` supporting multi-device synchronization with offline conflict resolution.
- **Design System & Multi-Theme:** Dark, Light, and High-Contrast themes meeting WCAG AA contrast standards.
- **Accessibility & i18n:** Full keyboard accessibility, ARIA landmarks, and translations in English, Spanish, and Hindi.

### Security
- Enforced strict Content-Security-Policy blocking arbitrary script evaluation.
- Denied unexpected window navigations and unsolicited popups (`setWindowOpenHandler`).
- Upgraded `pdfjs-dist` to 4.x patching high-severity arbitrary script execution vulnerability.
- Validated 100% of IPC payloads with runtime Zod schemas.
- Implemented atomic file saving with automatic `.bak` backups.

