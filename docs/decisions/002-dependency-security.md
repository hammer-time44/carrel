# Decision 002: Dependency Vulnerability Mitigation and Accepted Risk

* **Context:** `npm audit` flags `xlsx` (SheetJS) for Prototype Pollution (GHSA-4r6h-8v6p-xvw6) and ReDoS (GHSA-5pgg-2g8v-p4x9) with no upstream fix published to npm. Additionally, `pptx-preview` depends on older `echarts` and `uuid`.
* **Options Considered:** 
  1. Replace `xlsx` with an untested alternative or heavy native binding.
  2. Fork SheetJS.
  3. Isolate spreadsheet parsing into dedicated Web Workers with schema validation (Zod), sanitize cell inputs, handle CSV through native safe parser, and sandbox DOM rendering behind strict CSP.
* **Choice:** Option 3 — Worker isolation, Zod payload schema validation, CSV streaming parser, and strict CSP sandbox.
* **Why:** SheetJS provides reliable compatibility with complex student spreadsheets (.xlsx, .xls). By isolating parsing inside a Web Worker/isolated utility context where `window` and DOM are inaccessible, validating all outputs via Zod, and disabling `eval` via CSP, prototype pollution cannot escape or compromise the application host.

