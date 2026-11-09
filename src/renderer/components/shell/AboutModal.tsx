import React from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { X, BookOpen, Shield } from 'lucide-react';

export const AboutModal: React.FC = () => {
  const isAboutOpen = useWorkspaceStore((s) => s.isAboutOpen);
  const setAboutOpen = useWorkspaceStore((s) => s.setAboutOpen);

  if (!isAboutOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => setAboutOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div className="modal-dialog about-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="about-title" className="modal-title">About Carrel</h3>
          <button
            className="modal-close-btn"
            onClick={() => setAboutOpen(false)}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body about-body">
          <div className="about-brand-box">
            <BookOpen size={36} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginTop: 12 }}>
              Carrel
            </h2>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Version 2.1.0 &middot; Minimalist Desktop Study Viewer
            </span>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            Designed for deep academic focus. Exclusively renders <strong>.pdf</strong> and <strong>.pptx</strong> files.
            The interface disappears so your reading material takes center stage.
          </p>

          <div className="about-constraints-card">
            <div className="constraint-item">
              <Shield size={14} style={{ color: 'var(--status-success)' }} />
              <span>Fully offline and local with zero telemetry or network calls</span>
            </div>
            <div className="constraint-item">
              <Shield size={14} style={{ color: 'var(--status-success)' }} />
              <span>Read-only document security with inert links and zero web browsing</span>
            </div>
            <div className="constraint-item">
              <Shield size={14} style={{ color: 'var(--status-success)' }} />
              <span>Strict sandbox and local asset bundling (Inter font, pdf.js worker)</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-subtle)', marginTop: 8 }}>
            MIT License &middot; Powered by Electron, React, PDF.js &amp; JSZip
          </div>
        </div>
      </div>
    </div>
  );
};
