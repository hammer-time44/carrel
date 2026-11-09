import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { Pin, X, Plus } from 'lucide-react';
import { openFileDialog } from '../../utils/file-opener';

export const TabBar: React.FC = () => {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const activateTab = useWorkspaceStore((s) => s.activateTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const togglePinTab = useWorkspaceStore((s) => s.togglePinTab);
  const reorderTabs = useWorkspaceStore((s) => s.reorderTabs);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const isZenMode = useWorkspaceStore((s) => s.isZenMode);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleOpenFiles = async () => {
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
    } catch (err) {
      console.error('Error opening file dialog', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderTabs(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  if (isZenMode) return null;

  return (
    <nav id="tabbar-area" aria-label="Open Document Tabs">
      <div className="tab-list">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const badgeClass = tab.ext === 'pdf' ? 'badge-pdf' : 'badge-pptx';

          return (
            <div
              key={tab.id}
              className={`tab-item ${isActive ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => activateTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(tab.id);
                }
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  activateTab(tab.id);
                }
              }}
            >
              {/* Kind Badge */}
              <span className={`tab-ext-badge ${badgeClass}`}>{tab.ext.toUpperCase()}</span>

              {/* Title */}
              <span className="tab-name" title={tab.path || tab.name}>
                {tab.name}
              </span>

              {/* Pin Icon */}
              <button
                className={`tab-pin-btn ${tab.isPinned ? 'is-pinned' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTab(tab.id);
                }}
                title={tab.isPinned ? 'Unpin Tab' : 'Pin Tab'}
                aria-label={tab.isPinned ? 'Unpin Tab' : 'Pin Tab'}
              >
                <Pin size={11} />
              </button>

              {/* Close Tab Button */}
              <button
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close Tab (Ctrl+W)"
                aria-label={`Close ${tab.name}`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        className="tab-add-btn"
        onClick={handleOpenFiles}
        title="Open PDF or PPTX (Ctrl+O)"
        aria-label="Open document"
      >
        <Plus size={15} />
      </button>
    </nav>
  );
};
