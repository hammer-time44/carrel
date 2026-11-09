import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { FileEntry, TabOutlineItem } from '../../../common/types';
import { useSettingsStore } from '../../store/settings-store';
import {
  ParsedSlide,
  PptxParseResult,
} from '../../workers/pptx-parser.worker';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  RotateCcw,
  Layout,
  Layers,
} from 'lucide-react';

interface PptxViewerProps {
  entry: FileEntry;
  isActive: boolean;
  onOutlineReady?: (outline: TabOutlineItem[]) => void;
}

export const PptxViewer: React.FC<PptxViewerProps> = ({ entry, isActive, onOutlineReady }) => {
  const stageContainerRef = useRef<HTMLDivElement>(null);

  const [slides, setSlides] = useState<ParsedSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(entry.error || null);

  const [isFilmstripOpen, setIsFilmstripOpen] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(false);

  // Position storage key
  const storageKey = useMemo(() => {
    return `${entry.path}:${entry.size || 0}:${entry.lastModified || 0}`;
  }, [entry.path, entry.size, entry.lastModified]);

  // Worker-based PPTX parser
  const parsePresentation = useCallback(() => {
    setLoading(true);
    setErrorMsg(null);

    if (!entry.data || entry.data.byteLength === 0) {
      setErrorMsg('Presentation file buffer is empty or corrupted.');
      setLoading(false);
      return;
    }

    try {
      const worker = new Worker(
        new URL('../../workers/pptx-parser.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e: MessageEvent<PptxParseResult>) => {
        const result = e.data;
        worker.terminate();

        if (result.success && result.slides && result.slides.length > 0) {
          setSlides(result.slides);
          if (result.aspectRatio) {
            setAspectRatio(result.aspectRatio);
          }

          // Restore saved position
          const savedPos = useSettingsStore.getState().getPosition(storageKey);
          if (savedPos && savedPos.slide !== undefined && savedPos.slide < result.slides.length) {
            setCurrentSlideIndex(savedPos.slide);
          } else {
            setCurrentSlideIndex(0);
          }

          // Populate outline
          if (onOutlineReady) {
            const items: TabOutlineItem[] = result.slides.map((s, idx) => ({
              id: `slide-outline-${idx}`,
              title: s.title || `Slide ${idx + 1}`,
              level: 1,
              target: idx,
            }));
            onOutlineReady(items);
          }

          setLoading(false);
        } else {
          setErrorMsg(result.error || 'Failed to parse presentation slides.');
          setLoading(false);
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        setErrorMsg(`Worker error during PPTX parsing: ${err.message || 'unknown error'}`);
        setLoading(false);
      };

      // Post ArrayBuffer to worker
      const bufferCopy = entry.data.buffer.slice(
        entry.data.byteOffset,
        entry.data.byteOffset + entry.data.byteLength
      );
      worker.postMessage({ buffer: bufferCopy }, [bufferCopy]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to initialize PPTX parser: ${msg}`);
      setLoading(false);
    }
  }, [entry.data, storageKey, onOutlineReady]);

  useEffect(() => {
    parsePresentation();
  }, [parsePresentation]);

  // Persist current slide index
  useEffect(() => {
    if (slides.length > 0) {
      useSettingsStore.getState().savePosition(storageKey, {
        slide: currentSlideIndex,
      });
    }
  }, [currentSlideIndex, slides.length, storageKey]);

  const handleNext = useCallback(() => {
    setCurrentSlideIndex((idx) => Math.min(slides.length - 1, idx + 1));
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlideIndex((idx) => Math.max(0, idx - 1));
  }, []);

  // Keyboard navigation
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

      // Next slide: ArrowRight, ArrowDown, PageDown, Space (without shift), K
      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        (e.key === ' ' && !e.shiftKey) ||
        e.key === 'k' ||
        e.key === 'K'
      ) {
        e.preventDefault();
        handleNext();
      }
      // Previous slide: ArrowLeft, ArrowUp, PageUp, Shift+Space, J
      else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp' ||
        e.key === 'PageUp' ||
        (e.key === ' ' && e.shiftKey) ||
        e.key === 'j' ||
        e.key === 'J'
      ) {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, slides.length, handleNext, handlePrev]);

  if (loading) {
    return (
      <div className="viewer-skeleton-container" aria-label="Loading presentation">
        <div className="skeleton-bar pulse" style={{ width: '40%', height: 28, marginBottom: 24 }} />
        <div className="skeleton-page pulse" style={{ width: '80%', height: 450, borderRadius: 8 }} />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="viewer-error-container" role="alert">
        <h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--status-error)', marginBottom: 8 }}>
          Unable to Read Presentation
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{errorMsg}</p>
        <button onClick={parsePresentation} className="btn-secondary">
          <RotateCcw size={14} style={{ marginRight: 6 }} /> Retry Opening
        </button>
      </div>
    );
  }

  const activeSlide: ParsedSlide = slides[currentSlideIndex] || {
    index: 0,
    title: 'Slide 1',
    texts: [],
    tables: [],
    shapes: [],
    images: [],
  };

  return (
    <div className="pptx-viewer-root">
      {/* HUD Navigation Toolbar */}
      <div className="viewer-hud-bar" role="toolbar" aria-label="Slide Navigation Controls">
        <button
          className={`hud-btn ${isFilmstripOpen ? 'active' : ''}`}
          onClick={() => setIsFilmstripOpen(!isFilmstripOpen)}
          title="Toggle Slide Filmstrip"
          aria-label="Toggle Filmstrip"
        >
          <Layers size={15} />
        </button>

        <div className="hud-sep" />

        <button
          className="hud-btn"
          onClick={handlePrev}
          disabled={currentSlideIndex <= 0}
          title="Previous Slide (Left Arrow / J)"
          aria-label="Previous Slide"
        >
          <ChevronLeft size={16} />
        </button>

        <span className="hud-label tabular-nums">
          Slide {currentSlideIndex + 1} of {slides.length}
        </span>

        <button
          className="hud-btn"
          onClick={handleNext}
          disabled={currentSlideIndex >= slides.length - 1}
          title="Next Slide (Right Arrow / Space / K)"
          aria-label="Next Slide"
        >
          <ChevronRight size={16} />
        </button>

        <div className="hud-sep" />

        <button
          className={`hud-btn ${showNotes ? 'active' : ''}`}
          onClick={() => setShowNotes(!showNotes)}
          title="Toggle Speaker Notes Panel"
          aria-label="Toggle Speaker Notes"
        >
          <FileText size={14} style={{ marginRight: 4 }} />
          Notes {activeSlide.notes ? '•' : ''}
        </button>
      </div>

      <div className="pptx-main-layout">
        {/* Filmstrip Left Panel */}
        {isFilmstripOpen && (
          <aside className="pptx-filmstrip" aria-label="Slide Thumbnails">
            {slides.map((s, idx) => {
              const isSelected = idx === currentSlideIndex;
              return (
                <button
                  key={`filmstrip-${idx}`}
                  className={`filmstrip-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setCurrentSlideIndex(idx)}
                >
                  <div className="filmstrip-card-index tabular-nums">{idx + 1}</div>
                  <div className="filmstrip-card-title">{s.title || `Slide ${idx + 1}`}</div>
                </button>
              );
            })}
          </aside>
        )}

        {/* Center Stage Presentation Screen */}
        <div ref={stageContainerRef} className="pptx-stage-viewport">
          <div
            className="pptx-stage-aspect-box"
            style={{
              aspectRatio: `${aspectRatio}`,
            }}
          >
            {/* Slide Header */}
            <h1 className="pptx-slide-title">{activeSlide.title}</h1>

            {/* Slide Body Text & Bullet Hierarchy */}
            <div className="pptx-slide-body">
              {activeSlide.texts
                .filter((t) => !t.isTitle)
                .map((item, tIdx) => (
                  <div
                    key={`text-${tIdx}`}
                    className={`pptx-text-run lvl-${item.level || 0}`}
                    style={{
                      fontWeight: item.bold ? 600 : 400,
                      fontStyle: item.italic ? 'italic' : 'normal',
                      fontSize: item.size ? `${Math.max(14, item.size * 0.9)}px` : undefined,
                    }}
                  >
                    {item.level && item.level > 0 ? (
                      <span className="pptx-bullet">•</span>
                    ) : null}
                    <span>{item.text}</span>
                  </div>
                ))}
            </div>

            {/* Render Tables */}
            {activeSlide.tables &&
              activeSlide.tables.map((tbl, tblIdx) => (
                <table key={`tbl-${tblIdx}`} className="pptx-slide-table">
                  <tbody>
                    {tbl.rows.map((row, rIdx) => (
                      <tr key={`r-${rIdx}`}>
                        {row.map((cell, cIdx) => (
                          <td key={`c-${cIdx}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {/* Render Shapes */}
            {activeSlide.shapes && activeSlide.shapes.length > 0 && (
              <div className="pptx-shapes-row">
                {activeSlide.shapes.map((shp) => (
                  <div
                    key={shp.id}
                    className="pptx-shape-card"
                    style={{
                      backgroundColor: shp.color || 'var(--bg-hover)',
                      borderColor: shp.color ? undefined : 'var(--line)',
                    }}
                  >
                    <Layout size={18} />
                    <span>{shp.type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Render Images */}
            {activeSlide.images && activeSlide.images.length > 0 && (
              <div className="pptx-images-row">
                {activeSlide.images.map((imgSrc, imgIdx) => (
                  <img
                    key={`img-${imgIdx}`}
                    src={imgSrc}
                    alt={`Slide ${currentSlideIndex + 1} illustration`}
                    className="pptx-embedded-image"
                  />
                ))}
              </div>
            )}

            {/* Slide Number Badge */}
            <div className="pptx-slide-footer tabular-nums">
              {currentSlideIndex + 1}
            </div>
          </div>
        </div>
      </div>

      {/* Speaker Notes Drawer */}
      {showNotes && (
        <div className="pptx-notes-drawer" role="region" aria-label="Speaker Notes">
          <div className="notes-header">
            <h4>Speaker Notes</h4>
            <span className="tabular-nums">Slide {currentSlideIndex + 1}</span>
          </div>
          <p className="notes-content">
            {activeSlide.notes || (
              <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                No speaker notes recorded for this slide.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};
