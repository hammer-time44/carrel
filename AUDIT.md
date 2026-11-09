# Audit & Refactoring Plan: Carrel (.pdf & .pptx only)

**Date:** 2026-11-09  
**Branch:** `refactor/pdf-pptx-only`  
**Target OS:** Windows  
**Package Manager:** npm  

---

## 1. Baseline Assessment

Prior to executing dead-code deletion and refactoring, the repository was verified in its initial committed state:

| Check | Command | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Install** | `npm install` | PASS | 196 packages added, audited cleanly. |
| **Typecheck** | `npm run typecheck` | PASS | `tsc --noEmit` and `tsc -p tsconfig.main.json --noEmit` exit code 0. |
| **Lint** | `npm run lint` | PASS | `eslint src/ --max-warnings=0` exits code 0 with 0 errors/warnings. |
| **Build** | `npm run build` | PASS | Both main and renderer Vite builds succeed. |
| **Tests** | `npm run test` | PASS | Vitest runs 5 test files (19 tests) with 100% pass rate. |
| **Pre-existing Failures** | — | **None** | Baseline is completely green. |

---

## 2. Comprehensive Audit Table

| File / Directory | Action | Reason |
| :--- | :--- | :--- |
| `src/renderer/components/viewers/DocxViewer.tsx` | **delete** | Non-goal: Carrel is strictly for .pdf and .pptx only. DOCX rendering is removed. |
| `src/renderer/components/viewers/SheetViewer.tsx` | **delete** | Non-goal: Spreadsheets (XLSX, XLS, CSV) are out of scope. |
| `tests/fixtures/sample.docx` | **delete** | Fixture for removed DOCX format. |
| `tests/fixtures/sample.xlsx` | **delete** | Fixture for removed XLSX format. |
| `tests/fixtures/sample.csv` | **delete** | Fixture for removed CSV format. |
| `tests/fixtures/100k-rows.xlsx` | **delete** | Large fixture for removed spreadsheet viewer. |
| `main.js` (root) | **delete** | Legacy entry point. Replaced entirely by unified TypeScript pipeline `src/main/index.ts`. |
| `preload.js` (root) | **delete** | Legacy preload script. Replaced by `src/main/preload.ts`. |
| `renderer/` (root `app.js`, `index.html`, `styles.css`) | **delete** | Legacy vanilla JS prototype. React renderer in `src/renderer` is the single source of truth. |
| `server/` (entire directory) | **delete** | Non-goal: Cloud sync, user accounts, database, and backend server are excluded. Zero imports in viewer. |
| `docker-compose.yml` | **delete** | Associated with removed `server/` infrastructure. |
| `src/renderer/components/study/FlashcardsModal.tsx` | **delete** | Non-goal: Flashcards and SM-2 spaced repetition are out of scope. |
| `src/renderer/components/shell/AccountModal.tsx` | **delete** | Non-goal: Account management and cloud sync are out of scope. |
| `src/renderer/services/ai-assistant.ts` | **delete** | Non-goal: AI assistant is excluded. |
| `src/renderer/services/library-indexer.ts` | **delete** | Non-goal: Background indexing service is out of scope for lightweight file viewer. |
| `src/renderer/store/auth-store.ts` | **delete** | Non-goal: User authentication is excluded. |
| `tests/ai-assistant.test.ts` | **delete** | Tests for removed AI service. |
| `tests/library-indexer.test.ts` | **delete** | Tests for removed library indexer. |
| `tests/sm2-scheduler.test.ts` | **delete** | Tests for removed flashcard scheduler. |
| `scripts/inspect-sync-account.cjs` | **delete** | Test script for removed cloud sync account. |
| `scripts/inspect-premium-app.cjs` | **delete** | Test script for removed multi-format legacy shell. |
| `scripts/create-office-fixtures.cjs` | **delete** | Generator script for removed office format fixtures. |
| `package.json` (`docx`, `mammoth`, `xlsx`) | **delete** | Unused dependencies from removed document formats. |
| `src/renderer/components/viewers/PdfViewer.tsx` | **refactor** | Implement high-performance virtualized canvas rendering (+/- 1 page buffer), HiDPI, text layer, find, dark mode, password unlock. |
| `src/renderer/components/viewers/PptxViewer.tsx` | **refactor** | Replace mock fallback with robust pure-JS OOXML presentation rendering, aspect ratio scaling, filmstrip, keyboard navigation, notes. |
| `src/renderer/components/viewers/ViewerHost.tsx` | **refactor** | Restrict to PDF and PPTX only; strict error boundaries and loading states. |
| `src/renderer/components/shell/EmptyState.tsx` | **refactor** | Restrict drop and file opening to .pdf and .pptx only; clear rejection feedback. |
| `src/renderer/components/shell/CommandPalette.tsx` | **refactor** | Remove flashcard/sync actions; add Zen mode, split toggle, theme, tab/slide jump. |
| `src/renderer/components/shell/TabBar.tsx` | **refactor** | Tab cycling (Ctrl+Tab / Ctrl+Shift+Tab), middle-click close, pin, drag to reorder. |
| `src/renderer/components/shell/SplitPane.tsx` | **refactor** | Resizable divider with min-widths, keyboard focus switching, active pane indicator. |
| `src/renderer/components/shell/Rail.tsx` | **refactor** | Minimalist rail, hidden in Zen mode. |
| `src/renderer/components/shell/SettingsModal.tsx` | **refactor** | Clean settings for theme, reading position history, clear cache. |
| `src/renderer/components/shell/AboutModal.tsx` | **refactor** | Carrel branding and license information. |
| `src/renderer/styles/tokens.css` | **refactor** | Apply exact tokens: dark surfaces `#0A0A0C` / `#121216`, warm paper light mode, Inter font bundling. |
| `src/main/index.ts` | **refactor** | Hardened security: block all navigation, deny window.open, no external browser opening, strict CSP, single instance lock. |
| `src/main/services/file-service.ts` | **refactor** | Read-only; strict extension + magic byte validation (PDF `%PDF-`, PPTX ZIP + `[Content_Types].xml` + `ppt/presentation.xml`); max file size limit. |
| `src/common/constants.ts` | **refactor** | Restrict SUPPORTED_EXTENSIONS to `pdf` and `pptx` only. |
| `src/common/types.ts` | **refactor** | Strip unused annotation/flashcard/sync types; simplify to Carrel requirements. |
| `src/common/ipc-schemas.ts` | **refactor** | Hardened runtime validation for all IPC channels. |
| `public/icon.svg` & `public/logo.svg` | **keep** | Branding assets for Carrel desktop window and shell. |

---

## 3. Dependency License Verification

All retained and added dependencies are verified for license compatibility (permissive MIT / ISC / Apache-2.0 / BSD; no AGPL/GPL/commercial restrictions):

- `electron` (MIT)
- `react`, `react-dom` (MIT)
- `zustand` (MIT)
- `zod` (MIT)
- `lucide-react` (ISC)
- `pdfjs-dist` (Apache-2.0)
- `jszip` (MIT) - for PPTX container inspection and worker extraction
- Removed: `docx` (unused), `mammoth` (unused), `xlsx` (unused).
