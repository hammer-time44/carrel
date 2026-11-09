import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { List, ChevronLeft, ChevronRight } from 'lucide-react';

export const SidePanel: React.FC = () => {
  const outline = useWorkspaceStore((s) => s.outline);
  const activeOutlineIndex = useWorkspaceStore((s) => s.activeOutlineIndex);
  const setActiveOutlineIndex = useWorkspaceStore((s) => s.setActiveOutlineIndex);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const isZenMode = useWorkspaceStore((s) => s.isZenMode);

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isZenMode || tabs.length === 0) return null;

  if (isCollapsed) {
    return (
      <div className="sidepanel-collapsed-strip">
        <button
          className="sidepanel-collapse-btn"
          onClick={() => setIsCollapsed(false)}
          title="Expand Document Outline"
          aria-label="Expand Outline"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  const handleOutlineClick = (target: number, index: number) => {
    setActiveOutlineIndex(index);
    // Find slot for PDF or filmstrip card for PPTX
    const pdfSlot = document.getElementById(`pdf-page-slot-${target}`);
    if (pdfSlot) {
      pdfSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside id="panel-area" aria-label="Document Outline">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <List size={14} style={{ color: 'var(--text-muted)' }} />
          <span className="panel-header-title">Document Outline</span>
        </div>
        <button
          className="sidepanel-collapse-btn"
          onClick={() => setIsCollapsed(true)}
          title="Collapse Panel"
          aria-label="Collapse Panel"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="panel-content">
        {outline.length === 0 ? (
          <div className="panel-empty-hint">No outline entries for this document</div>
        ) : (
          <div className="outline-list">
            {outline.map((item, idx) => (
              <button
                key={item.id}
                className={`outline-item-btn ${idx === activeOutlineIndex ? 'active' : ''}`}
                style={{ paddingLeft: `${Math.max(12, item.level * 14)}px` }}
                onClick={() => handleOutlineClick(item.target, idx)}
              >
                <span className="outline-item-text">{item.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
