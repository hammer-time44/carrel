import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { FileUp, Clock, FileText, Presentation, Trash2, AlertCircle } from 'lucide-react';
import { SUPPORTED_EXTENSIONS } from '../../../common/constants';
import { openFileDialog, openDroppedFile } from '../../utils/file-opener';

export const EmptyState: React.FC = () => {
  const addTab = useWorkspaceStore((s) => s.addTab);
  const recentPaths = useWorkspaceStore((s) => s.recentPaths);
  const clearRecentPaths = useWorkspaceStore((s) => s.clearRecentPaths);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const [rejectionMsg, setRejectionMsg] = useState<string | null>(null);

  const handleBrowseFiles = async () => {
    try {
      const entries = await openFileDialog();
      if (entries && entries.length) {
        entries.forEach((e) => {
          if (e.error) {
            showToast(e.error);
          } else {
            addTab(e);
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenRecent = async (filePath: string) => {
    try {
      if (window.studyApi) {
        const entry = await window.studyApi.readFile(filePath);
        if (entry.error) {
          showToast(`File not found: ${filePath}`);
        } else {
          addTab(entry);
        }
      }
    } catch (err) {
      showToast(`Could not open recent file: ${filePath}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setRejectionMsg(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      for (const file of Array.from(e.dataTransfer.files)) {
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext as 'pdf' | 'pptx')) {
          setRejectionMsg(
            `Unsupported file type ".${ext || 'unknown'}". Carrel only accepts .pdf and .pptx files.`
          );
          continue;
        }

        const entry = await openDroppedFile(file);
        if (entry) {
          if (entry.error) {
            showToast(entry.error);
          } else {
            addTab(entry);
          }
        }
      }
    }
  };

  const getFileName = (p: string) => p.split(/[\\/]/).pop() || p;
  const getFileDir = (p: string) => {
    const parts = p.split(/[\\/]/).filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).slice(-2).join('/') : '';
  };

  return (
    <div
      className="empty-state-root"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="region"
      aria-label="Empty Workspace"
    >
      <div className="empty-state-card">
        {/* Drop Target Box */}
        <div className="dropzone-box" onClick={handleBrowseFiles}>
          <div className="dropzone-icon-circle">
            <FileUp size={28} />
          </div>
          <h2 className="dropzone-title">Open Document</h2>
          <p className="dropzone-subtitle">
            Drag &amp; drop <strong>.pdf</strong> or <strong>.pptx</strong> here, or click to browse
          </p>

          <div className="supported-formats-row">
            <span className="badge-pdf">PDF</span>
            <span className="badge-pptx">PPTX</span>
            <span className="badge-offline">100% Offline</span>
          </div>
        </div>

        {/* Rejection Message */}
        {rejectionMsg && (
          <div className="rejection-alert" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{rejectionMsg}</span>
          </div>
        )}

        {/* Recent Files Section */}
        {recentPaths.length > 0 && (
          <div className="recent-files-section">
            <div className="recent-files-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                <span className="recent-header-text">Recent Documents</span>
              </div>
              <button
                className="clear-recent-btn"
                onClick={clearRecentPaths}
                title="Clear Recent Files History"
                aria-label="Clear recent files"
              >
                <Trash2 size={12} style={{ marginRight: 4 }} /> Clear
              </button>
            </div>

            <div className="recent-files-list">
              {recentPaths.slice(0, 8).map((p) => {
                const isPdf = p.toLowerCase().endsWith('.pdf');
                return (
                  <button
                    key={p}
                    className="recent-file-item"
                    onClick={() => handleOpenRecent(p)}
                    title={p}
                  >
                    <div className="recent-file-icon">
                      {isPdf ? (
                        <FileText size={15} style={{ color: 'var(--pdf-color)' }} />
                      ) : (
                        <Presentation size={15} style={{ color: 'var(--pptx-color)' }} />
                      )}
                    </div>
                    <div className="recent-file-info">
                      <span className="recent-file-name">{getFileName(p)}</span>
                      <span className="recent-file-dir">{getFileDir(p)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
