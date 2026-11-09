# Carrel

> **A minimalist, read-only desktop study viewer for `.pdf` and `.pptx` only.**  
> The interface disappears so your reading and lecture material take center stage (reference feel: Linear, Readwise Reader).

---

## Hard Constraints & Core Principles

1. **No Web Browsing:** Zero URL bars, search-the-web, or external link navigation. In-app navigation and `window.open` requests are permanently denied in the main process. Hyperlinks inside documents render as inert, unclickable text.
2. **Strictly Read-Only:** No annotations, editing, or formatting tools. Clean, deterministic rendering.
3. **Only `.pdf` and `.pptx` Everywhere:** Dialog filters, drag-and-drop, CLI arguments, and recent files strictly accept `.pdf` and `.pptx`. Files are validated by both extension **and** magic bytes (`%PDF-` for PDF; ZIP archive containing `[Content_Types].xml` and `ppt/presentation.xml` for PPTX). Any other file format is rejected with a clear user notice.
4. **100% Offline & Local:** Zero telemetry, zero auto-update network calls, zero remote fonts or CDN dependencies. The UI font (Inter) and PDF.js worker/cMaps/standard fonts are bundled completely locally.

---

## Architectural Highlights

- **Virtualized PDF Engine:** Visible pages $\pm 1$ buffer page virtualization. Canvases outside the active viewport are unmounted and garbage-collected, guaranteeing memory remains bounded on 300+ and 500+ page documents.
- **Pure-JS Web Worker PPTX Parser:** PPTX OpenXML packages are unpacked in a dedicated Web Worker with strict resource bounds (max 200 MB uncompressed, max 10,000 entries, 10-second timeout).
- **Responsive Slide Stage:** Preserves native aspect ratio (16:9, 4:3, or custom from `presentation.xml`) without distortion or clipping.
- **Distraction-Free Focus Mode (`Ctrl+\` / `F11`):** Hides the rail, tab bar, and side panels. An auto-hiding floating HUD appears on mouse movement and fades during reading idle.
- **Side-by-Side Split View:** Compare lecture slides on the left with reference PDFs on the right using a resizable divider with keyboard focus switching (`F6`).
- **Command Palette (`Ctrl+K`):** Fuzzy search over open tabs, recent documents, themes, and workspace actions.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + \` / `F11` | Toggle Focus Mode (hide chrome for reading focus) |
| `Ctrl + K` | Open Command Palette |
| `Ctrl + O` | Open Document Dialog (`.pdf`, `.pptx`) |
| `Ctrl + W` | Close Active Tab |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Cycle forward / backward through tabs |
| `Ctrl + 1..9` | Jump directly to tab 1 through 9 |
| `F6` | Switch focus between Split View panes |
| `Ctrl + F` (PDF) | Find text in document with page jumping |
| `Ctrl + G` (PDF) | Jump directly to page number |
| `Ctrl + +` / `Ctrl + -` / `Ctrl + 0` | Zoom in / Zoom out / Reset zoom |
| `←` / `→` / `Space` / `J` / `K` (PPTX) | Navigate slides forward / backward |
| `Home` / `End` | Jump to first / last page or slide |

---

## Getting Started

### Development & Preview
```bash
# Install dependencies
npm install

# Typecheck and lint
npm run typecheck
npm run lint

# Run unit tests
npm run test

# Run performance & virtualization benchmarks
npm run build
npm run preview
```

### Windows Packaging & Signing
```bash
# Build desktop packages (NSIS installer and portable executable)
npm run dist:win

# See WINDOWS_SIGNING.md for Authenticode code signing configuration
```

---

## License

MIT License. Local font dependencies: Inter (SIL Open Font License). PDF.js (Apache-2.0). JSZip (MIT).
