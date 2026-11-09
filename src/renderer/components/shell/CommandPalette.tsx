import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { useSettingsStore, AppTheme } from '../../store/settings-store';
import { openFileDialog } from '../../utils/file-opener';
import {
  Search,
  FileText,
  Presentation,
  Columns,
  Eye,
  Sun,
  Moon,
  Laptop,
  FolderOpen,
  Trash2,
  X,
} from 'lucide-react';

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Tabs' | 'Recent' | 'Actions';
  shortcut?: string;
  icon: React.ReactNode;
  run: () => void;
}

export const CommandPalette: React.FC = () => {
  const isCommandPaletteOpen = useWorkspaceStore((s) => s.isCommandPaletteOpen);
  const setCommandPaletteOpen = useWorkspaceStore((s) => s.setCommandPaletteOpen);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activateTab = useWorkspaceStore((s) => s.activateTab);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const toggleSplit = useWorkspaceStore((s) => s.toggleSplit);
  const toggleZenMode = useWorkspaceStore((s) => s.toggleZenMode);
  const recentPaths = useWorkspaceStore((s) => s.recentPaths);
  const clearRecentPaths = useWorkspaceStore((s) => s.clearRecentPaths);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isCommandPaletteOpen]);

  // Build items list
  const allItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];

    // Open tabs
    tabs.forEach((t) => {
      items.push({
        id: `tab-${t.id}`,
        title: t.name,
        subtitle: t.path || 'Open Document',
        category: 'Tabs',
        icon:
          t.ext === 'pdf' ? (
            <FileText size={15} style={{ color: 'var(--pdf-color)' }} />
          ) : (
            <Presentation size={15} style={{ color: 'var(--pptx-color)' }} />
          ),
        run: () => {
          activateTab(t.id);
          setCommandPaletteOpen(false);
        },
      });
    });

    // Recent files
    recentPaths.forEach((p) => {
      if (!tabs.some((t) => t.path === p)) {
        const name = p.split(/[\\/]/).pop() || p;
        const isPdf = p.toLowerCase().endsWith('.pdf');
        items.push({
          id: `recent-${p}`,
          title: name,
          subtitle: p,
          category: 'Recent',
          icon: isPdf ? (
            <FileText size={15} style={{ color: 'var(--pdf-color)' }} />
          ) : (
            <Presentation size={15} style={{ color: 'var(--pptx-color)' }} />
          ),
          run: async () => {
            if (window.studyApi) {
              const entry = await window.studyApi.readFile(p);
              if (entry) addTab(entry);
            }
            setCommandPaletteOpen(false);
          },
        });
      }
    });

    // Core actions
    items.push({
      id: 'action-zen',
      title: 'Toggle Focus Mode',
      subtitle: 'Hide all UI chrome for distraction-free study',
      category: 'Actions',
      shortcut: 'Ctrl + \\',
      icon: <Eye size={15} />,
      run: () => {
        toggleZenMode();
        setCommandPaletteOpen(false);
      },
    });

    if (tabs.length > 1) {
      items.push({
        id: 'action-split',
        title: 'Toggle Side-by-Side Split View',
        subtitle: 'View two documents concurrently',
        category: 'Actions',
        icon: <Columns size={15} />,
        run: () => {
          toggleSplit();
          setCommandPaletteOpen(false);
        },
      });
    }

    items.push({
      id: 'action-open',
      title: 'Open Document...',
      subtitle: 'Browse local .pdf or .pptx files',
      category: 'Actions',
      shortcut: 'Ctrl + O',
      icon: <FolderOpen size={15} />,
      run: async () => {
        setCommandPaletteOpen(false);
        const entries = await openFileDialog();
        if (entries && entries.length) entries.forEach((e) => addTab(e));
      },
    });

    items.push({
      id: 'action-theme-dark',
      title: 'Theme: Dark',
      subtitle: 'Surfaces #0A0A0C / #121216',
      category: 'Actions',
      icon: <Moon size={15} />,
      run: () => {
        setTheme('dark');
        setCommandPaletteOpen(false);
      },
    });

    items.push({
      id: 'action-theme-light',
      title: 'Theme: Warm Paper (Light)',
      subtitle: 'Warm parchment tones for daytime reading',
      category: 'Actions',
      icon: <Sun size={15} />,
      run: () => {
        setTheme('light');
        setCommandPaletteOpen(false);
      },
    });

    items.push({
      id: 'action-theme-system',
      title: 'Theme: Follow System',
      subtitle: 'Match OS dark or light appearance',
      category: 'Actions',
      icon: <Laptop size={15} />,
      run: () => {
        setTheme('system');
        setCommandPaletteOpen(false);
      },
    });

    items.push({
      id: 'action-clear-recent',
      title: 'Clear Recent Documents History',
      subtitle: 'Remove cached document paths from disk',
      category: 'Actions',
      icon: <Trash2 size={15} />,
      run: () => {
        clearRecentPaths();
        setCommandPaletteOpen(false);
      },
    });

    return items;
  }, [tabs, recentPaths, activateTab, addTab, toggleSplit, toggleZenMode, setTheme, clearRecentPaths, setCommandPaletteOpen]);

  // Filter items fuzzy
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
  }, [allItems, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="palette-backdrop"
      onClick={() => setCommandPaletteOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div className="palette-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="palette-input-wrapper">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Search commands, open tabs, or recent files..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button
            className="palette-close-btn"
            onClick={() => setCommandPaletteOpen(false)}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        <div className="palette-list" role="listbox">
          {filteredItems.length === 0 ? (
            <div className="palette-empty">No matching commands or files</div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`palette-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => item.run()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="palette-item-icon">{item.icon}</div>
                  <div className="palette-item-text">
                    <span className="palette-item-title">{item.title}</span>
                    {item.subtitle && <span className="palette-item-sub">{item.subtitle}</span>}
                  </div>
                  {item.shortcut && <kbd className="palette-shortcut">{item.shortcut}</kbd>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
