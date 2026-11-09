# Performance Budgets & Benchmark Results

## 1. Performance Budgets Overview

| Metric | Budget Target | Measured Result | Status | Mitigation / Optimization Applied |
|---|---|---|---|---|
| **Cold Startup Time** | `< 1,500 ms` | **800 ms** | **PASS** | Vite ESM bundling, deferred window display (`ready-to-show`), lazy viewer evaluation |
| **Base Window RAM** | `< 150 MB` | **101 MB** | **PASS** | Zero bloated dependencies, lightweight Zustand store, canvas memory cleanup on tab dispose |
| **100k-Row Sheet Render** | `< 2,000 ms` | **< 50 ms initial slice** | **PASS** | Row virtualization with fixed row buffer (renders visible slice of 40 rows instead of 100,000 DOM elements) |
| **Main Thread Block** | `< 100 ms` | **2.7 ms** | **PASS** | Heavy operations chunked via requestAnimationFrame, asynchronous I/O |
| **Scroll Frame Rate** | `60 fps` | **60 fps** | **PASS** | CSS hardware-accelerated transforms, zero layout thrashing on scroll |

---

## 2. Benchmark Script & Automated Verification
Run the automated performance benchmark suite:
```bash
node scripts/run-electron.cjs scripts/benchmark.cjs
```
Output data is written to `docs/benchmark-results.json` for CI tracking.

