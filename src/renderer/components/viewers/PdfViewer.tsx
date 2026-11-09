import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileEntry, TabOutlineItem } from '../../../common/types';
import { useSettingsStore } from '../../store/settings-store';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Search,
  Moon,
  Sun,
  Lock,
  ArrowRight,
  X,
  RotateCcw,
} from 'lucide-react';

// Configure pdfjs worker to local bundled Vite asset
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PdfViewerProps {
  entry: FileEntry;
  isActive: boolean;
  onOutlineReady?: (outline: TabOutlineItem[]) => void;
}

interface PageDimension {
  width: number;
  height: number;
  aspectRatio: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ entry, isActive, onOutlineReady }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Document state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(entry.error || null);

  // Password unlock state
  const [needsPassword, setNeedsPassword] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Zoom & Viewport state
  const [zoom, setZoom] = useState<number>(1.0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));

  // Find in page state (Ctrl+F)
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [findMatches, setFindMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Page Jump state (Ctrl+G)
  const [isJumpOpen, setIsJumpOpen] = useState<boolean>(false);
  const [jumpInput, setJumpInput] = useState<string>('');
  const jumpInputRef = useRef<HTMLInputElement>(null);

  // Dark reading mode
  const [isDarkReading, setIsDarkReading] = useState<boolean>(false);

  // Storage key for position & zoom
  const storageKey = useMemo(() => {
    return `${entry.path}:${entry.size || 0}:${entry.lastModified || 0}`;
  }, [entry.path, entry.size, entry.lastModified]);

  // Active in-flight render tasks map to cancel on zoom/scroll
  const renderTasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());
  const renderedCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Load document with password support
  const loadDocument = useCallback(
    async (password?: string) => {
      setLoading(true);
      setErrorMsg(null);
      setPasswordError(null);

      try {
        if (!entry.data || entry.data.byteLength === 0) {
          setErrorMsg('PDF file buffer is empty or unreadable.');
          setLoading(false);
          return;
        }

        const dataCopy = entry.data.slice();
        const loadingTask = pdfjsLib.getDocument({
          data: dataCopy,
          password: password || undefined,
          cMapUrl: './pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: './pdfjs/standard_fonts/',
        });

        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setNeedsPassword(false);

        // Compute page dimensions
        const dims: PageDimension[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1.0 });
          dims.push({
            width: vp.width,
            height: vp.height,
            aspectRatio: vp.width / vp.height,
          });
        }
        setPageDimensions(dims);

        // Restore saved position
        const savedPos = useSettingsStore.getState().getPosition(storageKey);
        if (savedPos) {
          if (savedPos.zoom) setZoom(savedPos.zoom);
          if (savedPos.page && savedPos.page <= doc.numPages) {
            setCurrentPage(savedPos.page);
            setTimeout(() => {
              const el = document.getElementById(`pdf-page-slot-${savedPos.page}`);
              el?.scrollIntoView({ behavior: 'auto', block: 'start' });
            }, 100);
          }
        }

        // Extract outline if available
        try {
          const outline = await doc.getOutline();
          if (outline && outline.length && onOutlineReady) {
            const items: TabOutlineItem[] = outline.map((item, idx) => ({
              id: `pdf-outline-${idx}`,
              title: item.title || `Section ${idx + 1}`,
              level: 1,
              target: 1,
            }));
            onOutlineReady(items);
          } else if (onOutlineReady) {
            const pageItems: TabOutlineItem[] = Array.from({ length: doc.numPages }, (_, idx) => ({
              id: `pdf-page-outline-${idx + 1}`,
              title: `Page ${idx + 1}`,
              level: 1,
              target: idx + 1,
            }));
            onOutlineReady(pageItems);
          }
        } catch {
          // Ignore outline extraction failure
        }

        setLoading(false);
      } catch (err: unknown) {
        const error = err as { name?: string; code?: number; message?: string };
        if (error.name === 'PasswordException' || error.code === 1 || error.code === 2) {
          setNeedsPassword(true);
          if (error.code === 2) {
            setPasswordError('Incorrect password. Please try again.');
          }
          setLoading(false);
        } else {
          setErrorMsg(error.message || 'Failed to open PDF document.');
          setLoading(false);
        }
      }
    },
    [entry.data, storageKey, onOutlineReady]
  );

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Persist position and zoom changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      useSettingsStore.getState().savePosition(storageKey, {
        page: currentPage,
        zoom,
      });
    }
  }, [pdfDoc, currentPage, zoom, storageKey]);

  // Virtualized page intersection observer
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !pdfDoc || pageDimensions.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = new Set<number>();
        let mostVisiblePage = currentPage;
        let maxRatio = 0;

        entries.forEach((ent) => {
          const pageNum = parseInt(ent.target.getAttribute('data-page') || '0', 10);
          if (pageNum > 0) {
            if (ent.isIntersecting) {
              visible.add(pageNum);
              // Add +/- 1 buffer page
              if (pageNum > 1) visible.add(pageNum - 1);
              if (pageNum < numPages) visible.add(pageNum + 1);

              if (ent.intersectionRatio > maxRatio) {
                maxRatio = ent.intersectionRatio;
                mostVisiblePage = pageNum;
              }
            }
          }
        });

        if (visible.size > 0) {
          setVisiblePages((prev) => {
            // Check equality to avoid re-renders
            if (prev.size === visible.size && Array.from(visible).every((p) => prev.has(p))) {
              return prev;
            }
            return visible;
          });
          setCurrentPage(mostVisiblePage);
        }
      },
      {
        root: container,
        rootMargin: '300px 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      }
    );

    const pageSlots = container.querySelectorAll('.pdf-page-slot');
    pageSlots.forEach((slot) => observer.observe(slot));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, pageDimensions, numPages, zoom, currentPage]);

  // Render or clean up pages based on visiblePages
  useEffect(() => {
    if (!pdfDoc) return;

    const dpr = window.devicePixelRatio || 1;

    // Clean up pages that left visible set
    renderedCanvasesRef.current.forEach((canvas, pageNum) => {
      if (!visiblePages.has(pageNum)) {
        // Cancel in-flight render task if any
        const task = renderTasksRef.current.get(pageNum);
        if (task) {
          try {
            task.cancel();
          } catch {
            // task cancelled
          }
          renderTasksRef.current.delete(pageNum);
        }
        canvas.remove();
        renderedCanvasesRef.current.delete(pageNum);

        // Remove text layer
        const slot = document.getElementById(`pdf-page-slot-${pageNum}`);
        const textLayer = slot?.querySelector('.textLayer');
        if (textLayer) textLayer.remove();
      }
    });

    // Render pages that entered visible set
    visiblePages.forEach(async (pageNum) => {
      if (renderedCanvasesRef.current.has(pageNum)) return;

      const slot = document.getElementById(`pdf-page-slot-${pageNum}`);
      if (!slot) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });

        // Cancel previous task if pending
        const existingTask = renderTasksRef.current.get(pageNum);
        if (existingTask) {
          try {
            existingTask.cancel();
          } catch {
            // Ignore
          }
        }

        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-canvas';
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.scale(dpr, dpr);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;

        renderTasksRef.current.delete(pageNum);
        renderedCanvasesRef.current.set(pageNum, canvas);

        // Clear existing canvas and append new
        const oldCanvas = slot.querySelector('canvas');
        if (oldCanvas) oldCanvas.remove();
        slot.prepend(canvas);

        // Render accessible text layer for copy/selection
        const textContent = await page.getTextContent();
        const oldTextLayer = slot.querySelector('.textLayer');
        if (oldTextLayer) oldTextLayer.remove();

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
        textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
        textLayerDiv.style.position = 'absolute';
        textLayerDiv.style.top = '0';
        textLayerDiv.style.left = '0';
        textLayerDiv.style.overflow = 'hidden';
        textLayerDiv.style.opacity = '0.99';
        textLayerDiv.style.lineHeight = '1';

        // Hyperlinks in document text are inert (not clickable)
        textContent.items.forEach((item) => {
          if ('str' in item && item.str.trim()) {
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.position = 'absolute';
            // Coordinate mapping
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - (item.height || 10)}px`;
            span.style.fontSize = `${(item.height || 12) * zoom}px`;
            span.style.fontFamily = 'var(--font-ui)';
            span.style.color = 'transparent';
            span.style.userSelect = 'text';
            textLayerDiv.appendChild(span);
          }
        });

        slot.appendChild(textLayerDiv);
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering PDF page ${pageNum}`, e);
        }
      }
    });
  }, [pdfDoc, visiblePages, zoom]);

  // Zoom controls with anchor preservation
  const handleZoom = useCallback(
    (newZoom: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const clamped = Math.max(0.4, Math.min(3.5, newZoom));
      const scrollRatio =
        container.scrollHeight > 0 ? container.scrollTop / container.scrollHeight : 0;

      // Cancel all active render tasks
      renderTasksRef.current.forEach((t) => {
        try {
          t.cancel();
        } catch {
          // task cancelled
        }
      });
      renderTasksRef.current.clear();
      renderedCanvasesRef.current.clear();

      setZoom(clamped);

      // Restore scroll anchor
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = scrollRatio * container.scrollHeight;
        }
      });
    },
    []
  );

  const handleFitWidth = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || pageDimensions.length === 0) return;
    const pageWidth = pageDimensions[0].width;
    const availableWidth = container.clientWidth - 48;
    if (pageWidth > 0 && availableWidth > 0) {
      handleZoom(availableWidth / pageWidth);
    }
  }, [pageDimensions, handleZoom]);

  const handleFitPage = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || pageDimensions.length === 0) return;
    const page = pageDimensions[0];
    const availableWidth = container.clientWidth - 48;
    const availableHeight = container.clientHeight - 48;
    if (page.width > 0 && page.height > 0) {
      const scale = Math.min(availableWidth / page.width, availableHeight / page.height);
      handleZoom(scale);
    }
  }, [pageDimensions, handleZoom]);

  // Jump to page
  const scrollToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.max(1, Math.min(numPages, targetPage));
      const slot = document.getElementById(`pdf-page-slot-${clamped}`);
      if (slot) {
        slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentPage(clamped);
      }
    },
    [numPages]
  );

  // In-document find
  const handleFind = useCallback(
    async (query: string) => {
      if (!pdfDoc || !query.trim()) {
        setFindMatches([]);
        setCurrentMatchIndex(0);
        return;
      }

      const q = query.toLowerCase();
      const matchedPages: number[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();

        if (pageText.includes(q)) {
          matchedPages.push(i);
        }
      }

      setFindMatches(matchedPages);
      setCurrentMatchIndex(0);
      if (matchedPages.length > 0) {
        scrollToPage(matchedPages[0]);
      }
    },
    [pdfDoc, scrollToPage]
  );

  const nextMatch = () => {
    if (findMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % findMatches.length;
    setCurrentMatchIndex(nextIdx);
    scrollToPage(findMatches[nextIdx]);
  };

  const prevMatch = () => {
    if (findMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + findMatches.length) % findMatches.length;
    setCurrentMatchIndex(prevIdx);
    scrollToPage(findMatches[prevIdx]);
  };

  // Keyboard shortcut handler
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      const mod = e.ctrlKey || e.metaKey;

      // Find (Ctrl+F)
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindOpen(true);
        setTimeout(() => findInputRef.current?.focus(), 50);
        return;
      }

      // Page Jump (Ctrl+G)
      if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsJumpOpen(true);
        setJumpInput(String(currentPage));
        setTimeout(() => jumpInputRef.current?.select(), 50);
        return;
      }

      // Zoom In (Ctrl + / =)
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoom(zoom * 1.2);
        return;
      }

      // Zoom Out (Ctrl -)
      if (mod && e.key === '-') {
        e.preventDefault();
        handleZoom(zoom / 1.2);
        return;
      }

      // Zoom Reset (Ctrl 0)
      if (mod && e.key === '0') {
        e.preventDefault();
        handleZoom(1.0);
        return;
      }

      // Page navigation
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToPage(currentPage - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToPage(numPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, zoom, currentPage, numPages, handleZoom, scrollToPage]);

  // Ctrl+Wheel Zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        handleZoom(zoom * delta);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, handleZoom]);

  if (loading) {
    return (
      <div className="viewer-skeleton-container" aria-label="Loading document">
        <div className="skeleton-bar pulse" style={{ width: '40%', height: 28, marginBottom: 24 }} />
        <div className="skeleton-page pulse" style={{ width: 620, height: 800 }} />
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="password-unlock-card" role="dialog" aria-labelledby="unlock-title">
        <div className="unlock-icon-badge">
          <Lock size={28} />
        </div>
        <h2 id="unlock-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
          Password Protected Document
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
          This PDF is encrypted. Enter the document password to decrypt and read.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadDocument(passwordInput);
          }}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
        >
          <input
            type="password"
            autoFocus
            className="input-field"
            placeholder="Document Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />

          {passwordError && (
            <div className="form-error-msg" role="alert">
              {passwordError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary">
              Unlock Document <ArrowRight size={14} style={{ marginLeft: 6 }} />
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="viewer-error-container" role="alert">
        <h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--status-error)', marginBottom: 8 }}>
          Unable to Read PDF
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{errorMsg}</p>
        <button onClick={() => loadDocument()} className="btn-secondary">
          <RotateCcw size={14} style={{ marginRight: 6 }} /> Retry Opening
        </button>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer-root ${isDarkReading ? 'dark-reading-mode' : ''}`}>
      {/* Viewer Floating HUD Toolbar */}
      <div className="viewer-hud-bar" role="toolbar" aria-label="PDF Navigation Controls">
        {/* Page Jump Button with tabular numbers */}
        <button
          className="hud-btn tabular-nums"
          onClick={() => {
            setIsJumpOpen(true);
            setJumpInput(String(currentPage));
            setTimeout(() => jumpInputRef.current?.select(), 50);
          }}
          title="Jump to Page (Ctrl+G)"
        >
          {currentPage} / {numPages}
        </button>

        <div className="hud-sep" />

        <button
          className="hud-btn"
          onClick={() => scrollToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous Page (Left Arrow)"
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          className="hud-btn"
          onClick={() => scrollToPage(currentPage + 1)}
          disabled={currentPage >= numPages}
          title="Next Page (Right Arrow)"
          aria-label="Next Page"
        >
          <ChevronRight size={16} />
        </button>

        <div className="hud-sep" />

        <button
          className="hud-btn"
          onClick={() => handleZoom(zoom / 1.2)}
          title="Zoom Out (Ctrl -)"
          aria-label="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <span className="hud-label tabular-nums">{Math.round(zoom * 100)}%</span>

        <button
          className="hud-btn"
          onClick={() => handleZoom(zoom * 1.2)}
          title="Zoom In (Ctrl +)"
          aria-label="Zoom In"
        >
          <ZoomIn size={16} />
        </button>

        <div className="hud-sep" />

        <button
          className="hud-btn"
          onClick={handleFitWidth}
          title="Fit to Width"
          aria-label="Fit to Width"
        >
          <Maximize2 size={15} />
        </button>

        <button
          className="hud-btn"
          onClick={handleFitPage}
          title="Fit Entire Page"
          aria-label="Fit Page"
        >
          Fit
        </button>

        <div className="hud-sep" />

        <button
          className={`hud-btn ${isFindOpen ? 'active' : ''}`}
          onClick={() => {
            setIsFindOpen(!isFindOpen);
            if (!isFindOpen) setTimeout(() => findInputRef.current?.focus(), 50);
          }}
          title="Find in Document (Ctrl+F)"
          aria-label="Find in Document"
        >
          <Search size={15} />
        </button>

        <button
          className={`hud-btn ${isDarkReading ? 'active' : ''}`}
          onClick={() => setIsDarkReading(!isDarkReading)}
          title="Toggle Inverted Dark Reading Mode"
          aria-label="Toggle Dark Reading Mode"
        >
          {isDarkReading ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* Find Bar Drawer */}
      {isFindOpen && (
        <div className="find-bar-overlay" role="search">
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={findInputRef}
            type="text"
            className="find-input"
            placeholder="Find in document…"
            value={findQuery}
            onChange={(e) => {
              setFindQuery(e.target.value);
              handleFind(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) prevMatch();
                else nextMatch();
              } else if (e.key === 'Escape') {
                setIsFindOpen(false);
              }
            }}
          />

          <span className="find-count-label tabular-nums">
            {findMatches.length > 0
              ? `${currentMatchIndex + 1} of ${findMatches.length} pages`
              : findQuery
              ? 'No matches'
              : ''}
          </span>

          <button
            className="hud-btn"
            onClick={prevMatch}
            disabled={findMatches.length <= 1}
            title="Previous Match (Shift+Enter)"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className="hud-btn"
            onClick={nextMatch}
            disabled={findMatches.length <= 1}
            title="Next Match (Enter)"
          >
            <ChevronRight size={14} />
          </button>
          <button
            className="hud-btn"
            onClick={() => setIsFindOpen(false)}
            title="Close Find (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Jump to Page Dialog */}
      {isJumpOpen && (
        <div className="jump-page-overlay">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const p = parseInt(jumpInput, 10);
              if (!isNaN(p)) scrollToPage(p);
              setIsJumpOpen(false);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Jump to Page:
            </span>
            <input
              ref={jumpInputRef}
              type="number"
              min={1}
              max={numPages}
              className="jump-input tabular-nums"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsJumpOpen(false);
              }}
            />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              of {numPages}
            </span>
            <button type="submit" className="btn-primary" style={{ padding: '4px 10px' }}>
              Go
            </button>
            <button
              type="button"
              className="hud-btn"
              onClick={() => setIsJumpOpen(false)}
            >
              <X size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Virtualized Document Scroll Canvas Container */}
      <div ref={scrollContainerRef} className="pdf-scroll-viewport" role="region" aria-label="PDF Document Pages">
        <div className="pdf-pages-column">
          {pageDimensions.map((dim, idx) => {
            const pageNum = idx + 1;
            const slotWidth = Math.floor(dim.width * zoom);
            const slotHeight = Math.floor(dim.height * zoom);

            return (
              <div
                key={`page-slot-${pageNum}`}
                id={`pdf-page-slot-${pageNum}`}
                data-page={pageNum}
                className="pdf-page-slot"
                style={{
                  width: `${slotWidth}px`,
                  height: `${slotHeight}px`,
                  minHeight: `${slotHeight}px`,
                }}
              >
                {!renderedCanvasesRef.current.has(pageNum) && (
                  <div className="pdf-page-placeholder tabular-nums">
                    Page {pageNum}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
