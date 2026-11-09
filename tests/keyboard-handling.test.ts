// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWorkspaceStore } from '../src/renderer/store/workspace-store';

describe('Keyboard Navigation & Input Safeguards', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    useWorkspaceStore.setState({
      tabs: [
        { id: 'tab-1', path: '/doc.pdf', name: 'doc.pdf', ext: 'pdf', kind: 'pdf', lastAccessed: 1 },
        { id: 'tab-2', path: '/deck.pptx', name: 'deck.pptx', ext: 'pptx', kind: 'slides', lastAccessed: 2 },
      ],
      activeTabId: 'tab-1',
      isZenMode: false,
      isCommandPaletteOpen: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects when an input element has active focus', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const activeEl = document.activeElement;
    const isInput =
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).isContentEditable);

    expect(isInput).toBe(true);

    input.blur();
    expect(document.activeElement?.tagName).not.toBe('INPUT');
  });

  it('safely differentiates text typing from navigation keys', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    let navigationTriggered = false;

    // Simulate navigation handler
    const handleNavigationKey = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) {
        return; // safeguard: skip navigation
      }

      if (e.key === 'ArrowRight' || e.key === 'j' || e.key === 'k') {
        navigationTriggered = true;
      }
    };

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    handleNavigationKey(event);
    expect(navigationTriggered).toBe(false);

    textarea.blur();
    handleNavigationKey(event);
    expect(navigationTriggered).toBe(true);
  });

  it('handles Ctrl+\\ Zen Mode toggle', () => {
    const store = useWorkspaceStore.getState();
    expect(store.isZenMode).toBe(false);

    store.toggleZenMode();
    expect(useWorkspaceStore.getState().isZenMode).toBe(true);

    store.toggleZenMode();
    expect(useWorkspaceStore.getState().isZenMode).toBe(false);
  });
});
