import React from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { Columns, Square, Command, Eye, Settings, Minus, SquareCheck, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const splitLayout = useWorkspaceStore((s) => s.splitLayout);
  const toggleSplit = useWorkspaceStore((s) => s.toggleSplit);
  const isZenMode = useWorkspaceStore((s) => s.isZenMode);
  const toggleZenMode = useWorkspaceStore((s) => s.toggleZenMode);
  const setCommandPaletteOpen = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const setSettingsOpen = useWorkspaceStore((s) => s.setSettingsOpen);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleWindowControl = (action: 'close' | 'minimize' | 'maximize') => {
    window.studyApi?.windowControl(action);
  };

  const titleText = activeTab ? activeTab.name : 'Carrel';

  return (
    <header
      id="titlebar-area"
      className={isZenMode ? 'zen-hidden' : ''}
      onDoubleClick={() => handleWindowControl('maximize')}
    >
      {/* Window Controls */}
      <div className="win-dots">
        <button
          className="dot"
          data-ctl="close"
          onClick={() => handleWindowControl('close')}
          title="Close Window"
          aria-label="Close"
        />
        <button
          className="dot"
          data-ctl="minimize"
          onClick={() => handleWindowControl('minimize')}
          title="Minimize Window"
          aria-label="Minimize"
        />
        <button
          className="dot"
          data-ctl="maximize"
          onClick={() => handleWindowControl('maximize')}
          title="Maximize Window"
          aria-label="Maximize"
        />
      </div>

      {/* Active Document Title */}
      <div className="title-center">
        <span className="app-title-badge">Carrel</span>
        {activeTab && <span className="title-doc-name">&middot; {titleText}</span>}
      </div>

      {/* Quick Action Buttons */}
      <div className="title-actions">
        {tabs.length > 1 && (
          <button
            className={`title-btn ${splitLayout !== 'single' ? 'active' : ''}`}
            onClick={toggleSplit}
            title={splitLayout === 'single' ? 'Split View Side-by-Side (Ctrl+\\)' : 'Single View'}
            aria-label="Toggle Split View"
          >
            {splitLayout === 'single' ? <Columns size={14} /> : <Square size={14} />}
          </button>
        )}

        <button
          className={`title-btn ${isZenMode ? 'active' : ''}`}
          onClick={toggleZenMode}
          title="Focus Mode: Hide chrome for full immersion (Ctrl+\\ or F11)"
          aria-label="Toggle Focus Mode"
        >
          <Eye size={14} />
          <span style={{ fontSize: 'var(--text-xs)' }}>Focus</span>
        </button>

        <button
          className="title-btn"
          onClick={() => setCommandPaletteOpen(true)}
          title="Command Palette (Ctrl+K)"
          aria-label="Command Palette"
        >
          <Command size={13} />
          <kbd>Ctrl K</kbd>
        </button>

        <button
          className="title-btn icon-only"
          onClick={() => setSettingsOpen(true)}
          title="Preferences"
          aria-label="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
