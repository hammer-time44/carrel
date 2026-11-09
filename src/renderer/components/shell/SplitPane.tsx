import React, { useState, useCallback, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspace-store';
import { ViewerHost } from '../viewers/ViewerHost';
import { EmptyState } from './EmptyState';

export const SplitPane: React.FC = () => {
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const secondaryTabId = useWorkspaceStore((s) => s.secondaryTabId);
  const splitLayout = useWorkspaceStore((s) => s.splitLayout);
  const activePane = useWorkspaceStore((s) => s.activePane);
  const setActivePane = useWorkspaceStore((s) => s.setActivePane);

  const [leftWidthPercent, setLeftWidthPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const secondaryTab =
    tabs.find((t) => t.id === secondaryTabId) || tabs.find((t) => t.id !== activeTabId);

  // Keyboard shortcut (F6) to switch active pane focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F6' && splitLayout === 'vertical') {
        e.preventDefault();
        setActivePane(activePane === 'primary' ? 'secondary' : 'primary');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [splitLayout, activePane, setActivePane]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const totalWidth = window.innerWidth;
      const minPx = 260;
      const clientX = Math.max(minPx, Math.min(totalWidth - minPx, e.clientX));
      const newPercent = (clientX / totalWidth) * 100;
      setLeftWidthPercent(newPercent);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!tabs.length || !activeTab) {
    return <EmptyState />;
  }

  if (splitLayout === 'single' || !secondaryTab || tabs.length < 2) {
    return (
      <div className="single-pane-host">
        <ViewerHost tab={activeTab} isActive={true} />
      </div>
    );
  }

  return (
    <div className="split-view-container">
      {/* Primary Left Pane */}
      <div
        className={`split-pane-half ${activePane === 'primary' ? 'is-active-pane' : ''}`}
        style={{ width: `${leftWidthPercent}%` }}
        onClick={() => setActivePane('primary')}
        tabIndex={0}
        role="region"
        aria-label="Primary Document Pane"
      >
        <div className="pane-focus-strip" />
        <ViewerHost tab={activeTab} isActive={activePane === 'primary'} />
      </div>

      {/* Resizable Divider */}
      <div
        className={`split-divider-handle ${isDragging ? 'is-dragging' : ''}`}
        onMouseDown={() => setIsDragging(true)}
        title="Drag to resize panes"
      >
        <div className="divider-grip" />
      </div>

      {/* Secondary Right Pane */}
      <div
        className={`split-pane-half ${activePane === 'secondary' ? 'is-active-pane' : ''}`}
        style={{ width: `${100 - leftWidthPercent}%` }}
        onClick={() => setActivePane('secondary')}
        tabIndex={0}
        role="region"
        aria-label="Secondary Document Pane"
      >
        <div className="pane-focus-strip" />
        <ViewerHost tab={secondaryTab} isActive={activePane === 'secondary'} />
      </div>
    </div>
  );
};
