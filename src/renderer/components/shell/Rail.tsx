import React from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { Plus, Eye, Columns, Settings, FileText, Presentation } from 'lucide-react';

export const Rail: React.FC = () => {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const activateTab = useWorkspaceStore((s) => s.activateTab);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const isZenMode = useWorkspaceStore((s) => s.isZenMode);
  const toggleZenMode = useWorkspaceStore((s) => s.toggleZenMode);
  const toggleSplit = useWorkspaceStore((s) => s.toggleSplit);
  const splitLayout = useWorkspaceStore((s) => s.splitLayout);
  const setSettingsOpen = useWorkspaceStore((s) => s.setSettingsOpen);

  const handlePickFiles = async () => {
    try {
      if (window.studyApi) {
        const entries = await window.studyApi.openDialog();
        if (entries && entries.length) {
          entries.forEach((e) => addTab(e));
        }
      }
    } catch (e) {
      console.error('Error opening dialog', e);
    }
  };

  const handleFilterClick = (ext: 'pdf' | 'pptx') => {
    const matching = tabs.filter((t) => t.ext === ext);
    if (!matching.length) {
      handlePickFiles();
      return;
    }
    const active = tabs.find((t) => t.id === activeTabId);
    if (active && active.ext === ext) {
      const idx = matching.indexOf(active);
      activateTab(matching[(idx + 1) % matching.length].id);
    } else {
      activateTab(matching[0].id);
    }
  };

  if (isZenMode) return null;

  return (
    <nav id="rail-area" aria-label="Activity Rail">
      {/* Open Button */}
      <button
        className="rail-action-btn"
        onClick={handlePickFiles}
        title="Open PDF or PPTX (Ctrl+O)"
        aria-label="Open Document"
      >
        <Plus size={18} />
      </button>

      <div className="rail-divider" />

      {/* PDF Filter */}
      <button
        className="rail-action-btn"
        onClick={() => handleFilterClick('pdf')}
        title="PDF Documents"
        aria-label="PDF Documents"
      >
        <FileText size={18} style={{ color: 'var(--pdf-color)' }} />
      </button>

      {/* PPTX Filter */}
      <button
        className="rail-action-btn"
        onClick={() => handleFilterClick('pptx')}
        title="PowerPoint Presentations"
        aria-label="PowerPoint Presentations"
      >
        <Presentation size={18} style={{ color: 'var(--pptx-color)' }} />
      </button>

      <div style={{ flex: 1 }} />

      {/* Split view toggle */}
      {tabs.length > 1 && (
        <button
          className={`rail-action-btn ${splitLayout !== 'single' ? 'active' : ''}`}
          onClick={toggleSplit}
          title="Toggle Split View"
          aria-label="Toggle Split View"
        >
          <Columns size={17} />
        </button>
      )}

      {/* Focus mode button */}
      <button
        className="rail-action-btn"
        onClick={toggleZenMode}
        title="Enter Focus Mode (Ctrl+\\ or F11)"
        aria-label="Focus Mode"
      >
        <Eye size={17} />
      </button>

      {/* Settings */}
      <button
        className="rail-action-btn"
        onClick={() => setSettingsOpen(true)}
        title="Settings"
        aria-label="Settings"
      >
        <Settings size={17} />
      </button>
    </nav>
  );
};
