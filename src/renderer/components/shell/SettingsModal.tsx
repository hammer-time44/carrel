import React from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { useSettingsStore, AppTheme } from '../../store/settings-store';
import { X, Moon, Sun, Laptop, Trash2, ShieldCheck, Info } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const isSettingsOpen = useWorkspaceStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useWorkspaceStore((s) => s.setSettingsOpen);
  const setAboutOpen = useWorkspaceStore((s) => s.setAboutOpen);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const invertImagesBack = useSettingsStore((s) => s.invertImagesBack);
  const setInvertImagesBack = useSettingsStore((s) => s.setInvertImagesBack);
  const clearHistory = useSettingsStore((s) => s.clearHistory);

  if (!isSettingsOpen) return null;

  const handleClearHistory = () => {
    clearHistory();
    showToast('Document reading positions history cleared.');
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => setSettingsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="settings-title" className="modal-title">Preferences</h3>
          <button
            className="modal-close-btn"
            onClick={() => setSettingsOpen(false)}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Appearance Section */}
          <div className="settings-section">
            <h4 className="settings-section-title">Appearance</h4>
            <div className="theme-toggle-grid">
              <button
                className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={18} />
                <span>Dark</span>
              </button>

              <button
                className={`theme-card ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={18} />
                <span>Warm Paper</span>
              </button>

              <button
                className={`theme-card ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
              >
                <Laptop size={18} />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Reading Mode Section */}
          <div className="settings-section">
            <h4 className="settings-section-title">Reading Mode</h4>
            <label className="settings-toggle-row">
              <div>
                <div style={{ fontWeight: 500 }}>Invert Images in Dark Mode</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Keep diagrams and figures readable when dark reading inversion is enabled
                </div>
              </div>
              <input
                type="checkbox"
                checked={invertImagesBack}
                onChange={(e) => setInvertImagesBack(e.target.checked)}
              />
            </label>
          </div>

          {/* Privacy & History Section */}
          <div className="settings-section">
            <h4 className="settings-section-title">Privacy &amp; Local Storage</h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500 }}>Reading Positions Cache</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Remembers last viewed page and zoom per file on this device only
                </div>
              </div>
              <button onClick={handleClearHistory} className="btn-secondary" style={{ color: 'var(--status-error)' }}>
                <Trash2 size={13} style={{ marginRight: 6 }} /> Clear History
              </button>
            </div>
          </div>

          {/* App Info Footer */}
          <div className="settings-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--status-success)' }} />
              100% Offline &middot; Zero Telemetry &middot; Local Only
            </div>
            <button
              onClick={() => {
                setSettingsOpen(false);
                setAboutOpen(true);
              }}
              className="btn-text"
              style={{ fontSize: 'var(--text-xs)' }}
            >
              <Info size={13} style={{ marginRight: 4 }} /> About Carrel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
