# Decision 001: Modern Modular Architecture & UI Framework Selection

* **Context:** The prototype is a single 834-line vanilla JavaScript file with direct DOM mutations, no build step, no TypeScript, and direct script imports from `node_modules`. We need a modular, type-safe, maintainable architecture supporting multi-pane split views, tabs, rich viewers, and virtualized tables.
* **Options Considered:** 
  1. Plain TypeScript + vanilla DOM components
  2. Svelte 5 + Vite
  3. React 19 + TypeScript + Vite + Zustand
* **Choice:** React 19 + TypeScript (Strict) + Vite + Zustand.
* **Why:** React with Vite provides an industry-standard, battle-tested ecosystem for rich desktop applications (Linear, Obsidian plugins, Notion web, Slack), first-class integration with TipTap/ProseMirror for round-trip DOCX editing, virtualized data grids for 100k+ rows, Lucide icons, and zero-overhead Zustand state management, while allowing strict TypeScript type contracts across main and renderer processes.

