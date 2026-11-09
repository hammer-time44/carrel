// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../src/renderer/store/workspace-store';
import { STORAGE_KEYS } from '../src/common/constants';

describe('WorkspaceStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      tabs: [],
      activeTabId: null,
      secondaryTabId: null,
      activePane: 'primary',
      splitLayout: 'single',
      isZenMode: false,
      recentPaths: [],
      outline: [],
      activeOutlineIndex: 0,
      toastMessage: null,
      isCommandPaletteOpen: false,
      isSettingsOpen: false,
      isAboutOpen: false,
    });
  });

  it('adds supported .pdf and .pptx tabs correctly', () => {
    const store = useWorkspaceStore.getState();

    const pdfId = store.addTab({
      path: '/docs/lecture.pdf',
      name: 'lecture.pdf',
    });
    expect(pdfId).not.toBeNull();

    const pptxId = store.addTab({
      path: '/slides/deck.pptx',
      name: 'deck.pptx',
    });
    expect(pptxId).not.toBeNull();

    const state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(2);
    expect(state.tabs[0].ext).toBe('pdf');
    expect(state.tabs[1].ext).toBe('pptx');
    expect(state.activeTabId).toBe(pptxId);
  });

  it('rejects unsupported file types with toast notice', () => {
    const store = useWorkspaceStore.getState();

    const docxId = store.addTab({
      path: '/docs/notes.docx',
      name: 'notes.docx',
    });
    expect(docxId).toBeNull();

    const state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(0);
    expect(state.toastMessage).toContain('only .pdf and .pptx are supported');
  });

  it('activates existing tab instead of duplicating', () => {
    const store = useWorkspaceStore.getState();

    const id1 = store.addTab({ path: '/docs/paper.pdf', name: 'paper.pdf' });
    store.addTab({ path: '/slides/slides.pptx', name: 'slides.pptx' });

    // Open paper.pdf again
    const idAgain = store.addTab({ path: '/docs/paper.pdf', name: 'paper.pdf' });
    expect(idAgain).toBe(id1);

    const state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(2);
    expect(state.activeTabId).toBe(id1);
  });

  it('closes tab and updates active tab cleanly', () => {
    const store = useWorkspaceStore.getState();

    const id1 = store.addTab({ path: '/doc1.pdf', name: 'doc1.pdf' });
    const id2 = store.addTab({ path: '/doc2.pdf', name: 'doc2.pdf' });

    expect(useWorkspaceStore.getState().activeTabId).toBe(id2);

    store.closeTab(id2!);
    const state = useWorkspaceStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.activeTabId).toBe(id1);
  });

  it('handles tab reordering and pinning', () => {
    const store = useWorkspaceStore.getState();

    const id1 = store.addTab({ path: '/1.pdf', name: '1.pdf' });
    const id2 = store.addTab({ path: '/2.pdf', name: '2.pdf' });
    const id3 = store.addTab({ path: '/3.pdf', name: '3.pdf' });

    store.reorderTabs(0, 2);
    let state = useWorkspaceStore.getState();
    expect(state.tabs[2].id).toBe(id1);

    // Toggle pin on id3 (should move to front)
    store.togglePinTab(id3!);
    state = useWorkspaceStore.getState();
    expect(state.tabs[0].id).toBe(id3);
    expect(state.tabs[0].isPinned).toBe(true);
  });

  it('toggles split view between single and vertical', () => {
    const store = useWorkspaceStore.getState();

    store.addTab({ path: '/left.pptx', name: 'left.pptx' });
    store.addTab({ path: '/right.pdf', name: 'right.pdf' });

    expect(useWorkspaceStore.getState().splitLayout).toBe('single');

    store.toggleSplit();
    expect(useWorkspaceStore.getState().splitLayout).toBe('vertical');
    expect(useWorkspaceStore.getState().secondaryTabId).not.toBeNull();

    store.toggleSplit();
    expect(useWorkspaceStore.getState().splitLayout).toBe('single');
  });

  it('persists and restores session cleanly from storage', async () => {
    const store = useWorkspaceStore.getState();

    store.addTab({ path: '/first.pdf', name: 'first.pdf' });
    store.addTab({ path: '/second.pptx', name: 'second.pptx' });

    // Session saved to localStorage
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.tabs.length).toBe(2);

    // Clear state in memory
    useWorkspaceStore.setState({ tabs: [], activeTabId: null });

    // Mock window.studyApi to simulate files existing
    window.studyApi = {
      readFile: async (p: string) => ({
        path: p,
        name: p.split('/').pop() || '',
        data: new Uint8Array([1, 2, 3]),
      }),
    } as unknown as typeof window.studyApi;

    await store.loadSavedSession();

    const restoredState = useWorkspaceStore.getState();
    expect(restoredState.tabs.length).toBe(2);
    expect(restoredState.tabs[0].name).toBe('first.pdf');
    expect(restoredState.tabs[1].name).toBe('second.pptx');
  });
});
