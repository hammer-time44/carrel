import React, { useEffect, useState, useCallback } from 'react';
import { TabItem, FileEntry } from '../../../common/types';
import { PdfViewer } from './PdfViewer';
import { PptxViewer } from './PptxViewer';
import { ErrorBoundary } from '../shell/ErrorBoundary';
import { useWorkspaceStore, tabDataCache } from '../../store/workspace-store';
import { RotateCcw, X } from 'lucide-react';

interface ViewerHostProps {
  tab: TabItem;
  isActive: boolean;
}

export const ViewerHost: React.FC<ViewerHostProps> = ({ tab, isActive }) => {
  const [entry, setEntry] = useState<FileEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setOutline = useWorkspaceStore((s) => s.setOutline);
  const closeTab = useWorkspaceStore((s) => s.closeTab);

  const loadFile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      // In-memory data (from browser drag-and-drop or file picker)
      const cachedData = tabDataCache.get(tab.id);
      if (cachedData) {
        setEntry({
          path: tab.path,
          name: tab.name,
          data: cachedData,
        });
        setLoading(false);
        return;
      }

      if (tab.path && window.studyApi) {
        const file = await window.studyApi.readFile(tab.path);
        if (file) {
          if (file.error) {
            setLoadError(file.error);
          }
          setEntry(file);
          setLoading(false);
          return;
        }
      }

      setLoadError(`Unable to load file: path is invalid or file service is unavailable.`);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(`Failed to load document: ${msg}`);
      setLoading(false);
    }
  }, [tab.id, tab.name, tab.path]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  if (loading) {
    return (
      <div className="viewer-skeleton-container" aria-label={`Loading ${tab.name}`}>
        <div className="skeleton-bar pulse" style={{ width: '45%', height: 26, marginBottom: 20 }} />
        <div className="skeleton-page pulse" style={{ width: 680, height: 750 }} />
      </div>
    );
  }

  if (loadError || !entry || entry.error) {
    const displayError = loadError || entry?.error || 'Document could not be opened.';
    return (
      <div className="viewer-error-container" role="alert">
        <h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--status-error)', marginBottom: 8 }}>
          Error Opening &ldquo;{tab.name}&rdquo;
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, maxWidth: 480, textAlign: 'center' }}>
          {displayError}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={loadFile} className="btn-secondary">
            <RotateCcw size={14} style={{ marginRight: 6 }} /> Retry
          </button>
          <button onClick={() => closeTab(tab.id)} className="btn-secondary">
            <X size={14} style={{ marginRight: 6 }} /> Close Tab
          </button>
        </div>
      </div>
    );
  }

  const renderViewer = () => {
    if (tab.ext === 'pdf') {
      return <PdfViewer entry={entry} isActive={isActive} onOutlineReady={setOutline} />;
    }
    if (tab.ext === 'pptx') {
      return <PptxViewer entry={entry} isActive={isActive} onOutlineReady={setOutline} />;
    }
    return (
      <div className="viewer-error-container">
        <p>Unsupported file type: &ldquo;{tab.ext}&rdquo;. Only .pdf and .pptx are supported.</p>
      </div>
    );
  };

  return (
    <ErrorBoundary
      fallbackTitle={`Document error in "${tab.name}"`}
      filePath={tab.path}
      onRetry={loadFile}
      onClose={() => closeTab(tab.id)}
    >
      <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
        {renderViewer()}
      </div>
    </ErrorBoundary>
  );
};
