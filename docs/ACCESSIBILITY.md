# Accessibility Specification & Testing Notes (WCAG 2.1 AA)

## 1. Keyboard Navigation
Every interactive component within Study Workspace is fully navigable and operable via standard keyboard interactions:
* `Tab` / `Shift+Tab`: Forward and backward navigation through focusable controls.
* `Enter` / `Space`: Activate buttons, toggles, and modal dialogs.
* `ArrowLeft` / `ArrowRight`: Navigate slides in presentation mode and spreadsheet columns.
* `ArrowUp` / `ArrowDown`: Navigate command palette items and spreadsheet rows.
* `Ctrl` + `K`: Instant global Command Palette.
* `Ctrl` + `O`: Open file dialog.
* `Ctrl` + `W`: Close active tab.
* `Ctrl` + `Tab`: Cycle through open tabs.
* `Ctrl` + `1` ... `9`: Direct jump to tab by index.
* `Ctrl` + `S`: Save document or spreadsheet modifications.
* `Escape`: Dismiss open modals, dialogs, and exit presenter mode.

---

## 2. ARIA Roles & Landmarks
* **Application Shell:** Landmark `<header>` for TitleBar, `<nav>` for 64px Icon Rail, `<aside>` for Side Panel, `<main>` for Document Viewport.
* **Modal Dialogs:** `role="dialog"`, `aria-modal="true"`, with auto-focus management trapping focus within active modal.
* **Tabs:** Semantic `role="tablist"` and `role="tab"` with `aria-selected` attributes.

---

## 3. High-Contrast & Vision Support
* **System High Contrast:** Responds to `@media (forced-colors: active)` and provides explicit user toggle for High-Contrast Mode (`data-theme="high-contrast"`).
* **Focus Outlines:** High-visibility 2px focus ring with high-contrast accent color (`--accent`).
* **Prefers-Reduced-Motion:** Respects user motion preferences by disabling decorative transitions.

