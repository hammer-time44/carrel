import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWorkspaceStore } from './store/workspace-store';
import { TitleBar } from './components/shell/TitleBar';
import { Rail } from './components/shell/Rail';
import { TabBar } from './components/shell/TabBar';
import { SidePanel } from './components/shell/SidePanel';
import { SplitPane } from './components/shell/SplitPane';
import { CommandPalette } from './components/shell/CommandPalette';
import { SettingsModal } from './components/shell/SettingsModal';
import { AboutModal } from './components/shell/AboutModal';
import { FileEntry } from '../common/types';
import { Eye, EyeOff, X } from 'lucide-react';
import { openFileDialog, openDroppedFile } from './utils/file-opener';

export const App: React.FC = () => {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const activateTab = useWorkspaceStore((s) => s.activateTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const isZenMode = useWorkspaceStore((s) => s.isZenMode);
  const toggleZenMode = useWorkspaceStore((s) => s.toggleZenMode);
  const toastMessage = useWorkspaceStore((s) => s.toastMessage);
  const toastAction = useWorkspaceStore((s) => s.toastAction);
  const hideToast = useWorkspaceStore((s) => s.hideToast);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const setCommandPaletteOpen = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const loadSavedSession = useWorkspaceStore((s) => s.loadSavedSession);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(false);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore session / initial launch files
  useEffect(() => {
    const init = async () => {
      try {
        if (window.studyApi) {
          const initial = await window.studyApi.initialFiles();
          if (initial && initial.length) {
            initial.forEach((e) => addTab(e));
          } else {
            await loadSavedSession();
          }
        }
      } catch (err) {
        console.error('Error during initial files load', err);
      }
    };
    init();
  }, [addTab, loadSavedSession]);

  // IPC listeners for open-paths and file-changed
  useEffect(() => {
    if (!window.studyApi) return;

    const unsubs = [
      window.studyApi.onOpenPaths((entries: FileEntry[]) => {
        entries.forEach((e) => addTab(e));
      }),
      window.studyApi.onFileChanged((filePath: string) => {
        const matching = tabs.find((t) => t.path === filePath);
        if (matching) {
          showToast(`"${matching.name}" was modified externally and refreshed.`);
          activateTab(matching.id);
        }
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub && unsub());
    };
  }, [tabs, addTab, activateTab, showToast]);

  // Auto-hiding HUD logic for Zen Mode
  const handleMouseMove = useCallback(() => {
    if (!isZenMode) return;
    setIsHudVisible(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setIsHudVisible(false);
    }, 2800);
  }, [isZenMode]);

  useEffect(() => {
    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      // Zen Mode: Ctrl/Cmd + \ on all platforms
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === '\\') {
        e.preventDefault();
        toggleZenMode();
        return;
      }

      // F11 Zen Mode on Windows/Linux only (on macOS F11 is OS reserved)
      if (e.key === 'F11' && !navigator.userAgent.includes('Mac')) {
        e.preventDefault();
        toggleZenMode();
        return;
      }

      if (isInput) return;

      // Command Palette: Ctrl/Cmd + K
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Open Files: Ctrl/Cmd + O
      if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openFileDialog().then((entries) => {
          if (entries) {
            entries.forEach((ent) => {
              if (ent.error) {
                showToast(ent.error);
              } else {
                addTab(ent);
              }
            });
          }
        });
        return;
      }

      // Close Tab: Ctrl/Cmd + W
      if (mod && e.key.toLowerCase() === 'w' && activeTabId) {
        e.preventDefault();
        closeTab(activeTabId);
        return;
      }

      // Tab cycling with Ctrl+Tab / Ctrl+Shift+Tab on ALL platforms
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        if (tabs.length > 1) {
          const curIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = (curIndex + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length;
          activateTab(tabs[nextIndex].id);
        }
        return;
      }

      // Jump to tab 1-9 (Ctrl/Cmd + 1..9)
      if (mod && /^[1-9]$/.test(e.key)) {
        const num = parseInt(e.key, 10);
        const targetTab = num === 9 ? tabs[tabs.length - 1] : tabs[num - 1];
        if (targetTab) {
          e.preventDefault();
          activateTab(targetTab.id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, activateTab, closeTab, addTab, toggleZenMode, setCommandPaletteOpen]);

  // Window drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      for (const file of Array.from(e.dataTransfer.files)) {
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

  const hasTabs = tabs.length > 0;
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div
      id="app-container"
      className={`${!hasTabs ? 'no-tabs' : ''} ${isZenMode ? 'zen-mode' : ''}`}
      onMouseMove={handleMouseMove}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TitleBar />
      <Rail />
      <TabBar />
      <SidePanel />

      <main id="viewport-area">
        <SplitPane />
      </main>

      {/* Auto-Hiding Focus HUD */}
      {isZenMode && (
        <div className={`zen-floating-hud ${isHudVisible ? 'visible' : 'faded'}`}>
          <span className="zen-hud-title">{activeTab?.name || 'Carrel'}</span>
          <div className="hud-sep" />
          <button
            className="hud-btn"
            onClick={toggleZenMode}
            title="Exit Focus Mode (Ctrl+\\ or Esc)"
          >
            <EyeOff size={14} style={{ marginRight: 4 }} /> Exit Focus
          </button>
        </div>
      )}

      {/* Global Modals */}
      <CommandPalette />
      <SettingsModal />
      <AboutModal />

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-modal">
            Drop .pdf or .pptx files to open in Carrel
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container" role="status">
          <span>{toastMessage}</span>
          {toastAction ? (
            <button
              onClick={() => {
                toastAction.run();
                hideToast();
              }}
              className="toast-action-btn"
            >
              {toastAction.label}
            </button>
          ) : (
            <button onClick={hideToast} className="toast-close-btn">
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
