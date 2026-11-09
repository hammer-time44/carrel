# Architecture & Design Decisions (DECISIONS.md)

This log records major technical and design decisions made for **Carrel**.

---

## ADR 001: Pivot to Carrel (.pdf & .pptx Minimalist Viewer)

- **Status:** Accepted
- **Context:** The original codebase was a generic multi-format study workspace with an unmaintained backend server, flashcards, cloud sync, and partial support for DOCX/XLSX/CSV.
- **Decision:** Narrow the scope strictly to `.pdf` and `.pptx` documents in a distraction-free, read-only desktop application. All non-core modules (cloud sync, Postgres server, user authentication, flashcards, AI assistant, and DOCX/XLSX viewers) are permanently excised.
- **Consequences:** Dramatically reduced attack surface, zero remote dependencies, deterministic offline execution, and focused engineering on document rendering fidelity and performance.

---

## ADR 002: Electron Security Architecture & IPC Hardening

- **Status:** Accepted
- **Context:** Carrel opens untrusted local documents. Any document containing scripts or URLs must not execute arbitrary code or navigate the application.
- **Decision:**
  1. `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
  2. Preload exposes only a minimal, typed `studyApi` leveraging `contextBridge` and `ipcRenderer`.
  3. Deny all `will-navigate` events and set `setWindowOpenHandler(() => ({ action: 'deny' }))`. Hyperlinks inside documents are rendered as inert text. No `shell.openExternal`.
  4. Content Security Policy (CSP):
     `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';`
     (`'wasm-unsafe-eval'` is permitted exclusively for pdf.js WASM decoders if required).
  5. File type validation enforces both file extension (`.pdf`, `.pptx`) AND magic byte inspection on the main process side before returning file buffers.
  6. Maximum file size cap set to 500 MB with clear user feedback for oversized files.

---

## ADR 003: Pure-JS Local PPTX Rendering Strategy Spike & Fidelity Evaluation

- **Status:** Accepted
- **Context:** PPTX files are Open Packaging Conventions (OPC) ZIP containers containing XML slide definitions, drawings, and media. We evaluated three strategies:
  1. **(a) Pure-JS maintained renderer / OOXML parser (`pptx-preview` + JSZip):** Runs fully locally in renderer or Web Worker, ISC/MIT licensed, bundle size ~1.4MB, no external system dependencies.
  2. **(b) Custom pure OOXML parser and SVG/HTML renderer:** Built directly with JSZip and DOM/Canvas. Full control over slide elements (shapes, text, master slides, tables, images, speaker notes).
  3. **(c) Converting to PDF with LibreOffice (`soffice --headless`):** Requires the end-user to have LibreOffice installed locally. Cannot be bundled due to size (300MB+) and GPL/LGPL licensing. Only acceptable as an optional manual fallback if pre-installed.
- **Strategy Selected:** Hybrid approach: pure-JS OOXML pipeline with a background Web Worker parsing engine and JSZip (MIT). The parser extracts slide XML, geometries, master/theme styles, tables, embedded blip pictures, and speaker notes (`ppt/notesSlides/notesSlide*.xml`).
- **Fidelity Test Suite Results (`tests/fixtures/fidelity-deck.pptx`):**

| PPTX Feature | Result | Notes |
| :--- | :--- | :--- |
| **Slide layout & master inheritance** | **PASS** | Title, subtitle, and body placeholders inherit master slide geometry and theme styling. |
| **Typography & bullet hierarchy** | **PASS** | Multi-level bullets (`lvl="0"`, `lvl="1"`), bold, italic, font scaling rendered cleanly. |
| **Geometric shapes & vector fills** | **PASS** | Standard shapes (`roundRect`, `rect`, lines) with solid fill RGB colors render accurately. |
| **Tabular data & borders** | **PASS** | `a:tbl` cells, rows, and borders render with alignment and padding. |
| **Embedded images (PNG/JPEG blips)** | **PASS** | Media extracted from `ppt/media/*` via relationship maps (`rId`) and rendered as object URLs. |
| **Non-embedded fonts** | **PASS** | Graceful fallback to bundled Inter font and system-ui typographic stack. |
| **RTL & non-Latin scripts** | **PASS** | Full Unicode and bidirectional rendering for Arabic, Hebrew, Devanagari, and CJK text. |
| **Speaker notes extraction** | **PASS** | Notes parsed from `ppt/notesSlides/notesSlide*.xml` and displayed in toggleable notes panel. |
| **Charts** | **PARTIAL** | Standard charts render through chart frames; unsupported chart types display a clean visual container. |
| **SmartArt** | **PARTIAL** | Content text extracts cleanly; complex diagram layouts degrade gracefully without error. |
| **Animations & transitions** | **LIMIT** | By design: Carrel is a distraction-free static study viewer; transitions and animations are inert. |
| **Embedded audio/video** | **LIMIT** | By design: Media playback is non-goal; placeholders are displayed for media elements. |

- **Untrusted Input Protection (Web Worker):**
  - Max uncompressed size limit: 200 MB.
  - Max zip entry count limit: 10,000 files.
  - Parse timeout limit: 10,000 ms.
  - Graceful degradation: any single corrupted slide displays an inline notice without crashing the viewer.

---

## ADR 004: PDF.js Local Bundling & Virtualized Memory Bounds

- **Status:** Accepted
- **Context:** Loading multi-hundred-page PDFs (300 to 500 pages) without virtualization creates hundreds of DOM canvas elements, exhausting GPU and system RAM, causing crashes or severe UI jank.
- **Decision:**
  1. Virtualize pages: only render visible pages +/- 1 buffer page. Unmount and release canvas memory for pages out of viewport.
  2. HiDPI-correct canvas scaling based on `window.devicePixelRatio`.
  3. Overlay an accessible, transparent text layer on active rendered pages to enable native selection, copying, and in-document search.
  4. PDF worker (`pdf.worker.min.mjs`) is resolved and bundled entirely locally via Vite; cMaps and standard font data are bundled locally in `public/pdfjs/` with zero CDN requests.
  5. Password-protected PDFs: intercept `PasswordResponses.NEED_PASSWORD` and display a clean inline unlock dialog with retry feedback.
