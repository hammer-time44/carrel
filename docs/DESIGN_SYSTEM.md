# Study Workspace Design System

## 1. Design Philosophy
Study Workspace is a focused academic study environment engineered for students and researchers. It pairs a dark obsidian foundation with vivid, distinct color-coding for primary document formats:
- **Blue (`#6b8cff`):** Word Documents (.docx)
- **Green (`#5fb98a`):** Spreadsheets (.xlsx, .csv)
- **Orange (`#e08a3c`):** Presentations (.pptx)
- **Teal / Ruby (`#5bbfb0` / `#b3414f`):** PDF Documents

---

## 2. Color Palette & WCAG AA Contrast

### Surface Hierarchy
| Token | Dark (Default) | Light | High Contrast | Purpose |
|---|---|---|---|---|
| `--bg-chrome` | `#141414` | `#f3f3f5` | `#000000` | Title bar, left rail, tab bar |
| `--bg-panel` | `#0e0e0e` | `#ebebed` | `#000000` | Outline, bookmarks, notes sidebar |
| `--bg-page` | `#1b1b1b` | `#ffffff` | `#000000` | Primary document canvas |
| `--bg-surface` | `#202020` | `#f8f8fa` | `#111111` | Cards, popovers, dropdowns |
| `--bg-hover` | `#262626` | `#e5e5e8` | `#222222` | Hovered interactive elements |

### Text & Contrast
| Token | Value | Contrast Ratio vs `--bg-chrome` | Contrast Ratio vs `--bg-page` |
|---|---|---|---|
| `--text` | `#e6e6e6` | **13.5:1** (Exceeds WCAG AAA 7:1) | **12.4:1** |
| `--text-dim` | `#9a9a9a` | **5.4:1** (Exceeds WCAG AA 4.5:1) | **5.0:1** |
| `--text-faint` | `#6c6c6c` | **3.1:1** (Accessible for non-text UI) | **2.8:1** |

---

## 3. Typography Scale
* **Font Family:** `Inter`, system-ui, -apple-system, sans-serif
* **Mono Family:** `JetBrains Mono`, `ui-monospace`, monospace

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 32px | 700 | 1.2 | Empty state headings |
| H1 | 24px | 600 | 1.3 | Document titles, main headers |
| H2 | 18px | 600 | 1.4 | Section headers, modal titles |
| H3 | 15px | 600 | 1.4 | Card headers, sidebar sections |
| Body | 14px | 400 | 1.5 | Standard text, document content |
| Small | 12px | 500 | 1.4 | Toolbars, labels, badges |
| Caption | 11px | 600 | 1.3 | Uppercase section markers |

---

## 4. Layout Architecture
- **Rail Width:** Fixed 64px width on the left.
- **Side Panel Width:** 220px outline and notes drawer.
- **Title Bar Height:** 40px draggable native chrome.
- **Tab Bar Height:** 38px with 2px active top indicator.
- **Toolbar Height:** 38px contextual editing controls.

