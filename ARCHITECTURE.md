# Architecture: Carrel

Carrel is a minimalist, read-only desktop study viewer for **`.pdf`** and **`.pptx`** documents.

---

## 1. Process & Security Model

```
┌────────────────────────────────────────────────────────┐
│               Electron Main Process                    │
│  - Window Management & Single Instance Lock            │
│  - FileService: Strict Extension & Magic Bytes Guard   │
│  - DialogService: Filtered to .pdf and .pptx only      │
│  - Navigation Denied: will-navigate & popups blocked   │
│  - Hardened CSP: connect-src 'none', no remote assets  │
│  - Typed Zod schema validation on IPC boundaries       │
└──────────────────────────┬─────────────────────────────┘
                           │ (Sandboxed contextBridge)
┌──────────────────────────▼─────────────────────────────┐
│             Preload Script (Least Privilege)           │
│  - contextIsolation = true, nodeIntegration = false    │
│  - sandbox = true                                      │
│  - Minimal typed window.studyApi only                  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│             React 19 + Vite Renderer                   │
│  - Shell: TitleBar, TabBar, Rail, SidePanel, Zen HUD   │
│  - SplitPane: Resizable side-by-side document panes    │
│  - PdfViewer: Virtualized canvas, HiDPI, text layer    │
│  - PptxViewer: Aspect-ratio locked presentation stage  │
│  - Zustand Stores: WorkspaceStore, SettingsStore       │
└──────────────────────────┬─────────────────────────────┘
                           │ (ArrayBuffer Transfer)
┌──────────────────────────▼─────────────────────────────┐
│             Web Worker: PPTX Parser Engine             │
│  - JSZip background OPC unpacker                       │
│  - Max uncompressed size limit: 200 MB                 │
│  - Max entry count limit: 10,000                       │
│  - Timeout guard: 10,000 ms                            │
│  - Slide XML, layout, tables, shapes & notes extract   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Security Hardening Guarantees

1. **Deny Navigation:** `win.webContents.on('will-navigate', (e) => e.preventDefault())`.
2. **Deny New Windows:** `win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))`.
3. **No External Browser Calls:** `shell.openExternal` is omitted; links inside documents are rendered as inert text.
4. **Content Security Policy (CSP):**
   ```
   default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';
   ```
5. **Magic Bytes Validation:**
   - PDF: must contain `%PDF-` in the initial 1024 bytes.
   - PPTX: must start with ZIP signature (`0x50 0x4B`) and contain both `[Content_Types].xml` and `ppt/presentation.xml`.
6. **File Size Capping:** 500 MB hard limit enforced in the main process before file buffers are loaded.

---

## 3. High-Performance Virtualization

- **PDF.js Virtualization:**
  - Page dimensions are precalculated upon document load.
  - An `IntersectionObserver` tracks visible pages within the scroll container.
  - Active render window is restricted to visible pages $\pm 1$ buffer page.
  - Canvases outside the buffer are unmounted to keep GPU/canvas memory bounded to $\le 3-5$ canvases even on 500-page files.
  - In-flight render tasks are cancelled on zoom and scroll using `renderTask.cancel()`.
- **PPTX Background Parsing:**
  - Parsing happens off the main UI thread in a Web Worker, ensuring zero UI freezing during slide decompression.

---

## 4. Local-Only Persistence

- Storage keys:
  - `zc.session.v1`: Open tabs, active tab ID, and split layout. Dropped tabs whose files no longer exist on disk are quietly pruned on restore.
  - `zc.recent.v1`: History of up to 30 opened `.pdf` / `.pptx` file paths with an instant "Clear history" action.
  - `zc.positions.v1`: Last viewed page, slide, and zoom factor per document keyed by `${path}:${size}:${mtime}`.
  - `zc.settings.v1`: Theme preference (`dark`, `light`, `system`) and dark reading mode options.
