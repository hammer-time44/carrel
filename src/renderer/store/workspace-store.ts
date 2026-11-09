import { create } from 'zustand';
import { TabItem, DocumentKind, TabOutlineItem, SplitLayout, FileEntry } from '../../common/types';
import { STORAGE_KEYS, EXTENSION_KINDS, SUPPORTED_EXTENSIONS } from '../../common/constants';

interface WorkspaceState {
  tabs: TabItem[];
  activeTabId: string | null;
  secondaryTabId: string | null;
  activePane: 'primary' | 'secondary';
  splitLayout: SplitLayout;
  isZenMode: boolean;
  recentPaths: string[];
  outline: TabOutlineItem[];
  activeOutlineIndex: number;
  toastMessage: string | null;
  toastAction: { label: string; run: () => void } | null;
  isCommandPaletteOpen: boolean;
  isSettingsOpen: boolean;
  isAboutOpen: boolean;

  // Actions
  addTab: (entry: FileEntry | { path: string; name: string }) => string | null;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  setActivePane: (pane: 'primary' | 'secondary') => void;
  toggleSplit: () => void;
  setSplitLayout: (layout: SplitLayout, secondaryId?: string | null) => void;
  toggleZenMode: () => void;
  setZenMode: (zen: boolean) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  togglePinTab: (tabId: string) => void;
  updateTabPosition: (tabId: string, position: { page?: number; slide?: number; zoom?: number }) => void;
  setOutline: (items: TabOutlineItem[]) => void;
  setActiveOutlineIndex: (idx: number) => void;
  addRecentPath: (path: string) => void;
  clearRecentPaths: () => void;
  showToast: (msg: string, action?: { label: string; run: () => void }) => void;
  hideToast: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  loadSavedSession: () => Promise<void>;
  saveSession: () => void;
}

const getStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setStorage = <T>(key: string, val: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage error', e);
  }
};

/** In-memory cache for document byte buffers (e.g. browser drag & drop or file picker) */
export const tabDataCache = new Map<string, Uint8Array>();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  secondaryTabId: null,
  activePane: 'primary',
  splitLayout: 'single',
  isZenMode: false,
  recentPaths: getStorage<string[]>(STORAGE_KEYS.RECENT, []),
  outline: [],
  activeOutlineIndex: 0,
  toastMessage: null,
  toastAction: null,
  isCommandPaletteOpen: false,
  isSettingsOpen: false,
  isAboutOpen: false,

  addTab: (entry) => {
    const { tabs } = get();

    // Check if already open
    if (entry.path) {
      const existing = tabs.find((t) => t.path === entry.path);
      if (existing) {
        if (get().activePane === 'secondary' && get().splitLayout === 'vertical') {
          set({ secondaryTabId: existing.id });
        } else {
          set({ activeTabId: existing.id });
        }
        return existing.id;
      }
    }

    const rawExt = (entry.name.split('.').pop() || '').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(rawExt as 'pdf' | 'pptx')) {
      get().showToast(`Cannot open "${entry.name}": only .pdf and .pptx are supported.`);
      return null;
    }

    const ext = rawExt as 'pdf' | 'pptx';
    const kind: DocumentKind = EXTENSION_KINDS[ext] || 'pdf';
    const id = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newTab: TabItem = {
      id,
      path: entry.path,
      name: entry.name,
      ext,
      kind,
      isPinned: false,
      lastAccessed: Date.now(),
    };

    if ('data' in entry && entry.data && entry.data.length > 0) {
      tabDataCache.set(id, entry.data);
    }

    const newTabs = [...tabs, newTab];

    if (get().activePane === 'secondary' && get().splitLayout === 'vertical') {
      set({ tabs: newTabs, secondaryTabId: id });
    } else {
      set({ tabs: newTabs, activeTabId: id });
    }

    if (entry.path) {
      get().addRecentPath(entry.path);
    }

    get().saveSession();
    return id;
  },

  closeTab: (tabId: string) => {
    tabDataCache.delete(tabId);
    const { tabs, activeTabId, secondaryTabId } = get();
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (!tabToClose) return;

    const remaining = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;
    let nextSecondaryId = secondaryTabId;

    if (activeTabId === tabId) {
      const closedIndex = tabs.findIndex((t) => t.id === tabId);
      const nextTab = remaining[closedIndex] || remaining[closedIndex - 1] || null;
      nextActiveId = nextTab ? nextTab.id : null;
    }

    if (secondaryTabId === tabId) {
      nextSecondaryId = remaining.find((t) => t.id !== nextActiveId)?.id || null;
    }

    const nextSplit = remaining.length < 2 ? 'single' : get().splitLayout;

    set({
      tabs: remaining,
      activeTabId: nextActiveId,
      secondaryTabId: nextSecondaryId,
      splitLayout: nextSplit,
    });

    get().saveSession();
  },

  activateTab: (tabId: string) => {
    const { tabs, activePane, splitLayout } = get();
    const target = tabs.find((t) => t.id === tabId);
    if (!target) return;

    target.lastAccessed = Date.now();

    if (activePane === 'secondary' && splitLayout === 'vertical') {
      set({ secondaryTabId: tabId });
    } else {
      set({ activeTabId: tabId });
    }
    get().saveSession();
  },

  setActivePane: (pane) => {
    set({ activePane: pane });
  },

  toggleSplit: () => {
    const { splitLayout, tabs, activeTabId, secondaryTabId } = get();
    if (splitLayout === 'single') {
      if (tabs.length < 2) {
        get().showToast('Open at least 2 documents to enable split view.');
        return;
      }
      const otherTab = tabs.find((t) => t.id !== activeTabId);
      set({
        splitLayout: 'vertical',
        secondaryTabId: secondaryTabId && secondaryTabId !== activeTabId ? secondaryTabId : otherTab?.id || null,
      });
    } else {
      set({ splitLayout: 'single' });
    }
    get().saveSession();
  },

  setSplitLayout: (layout, secondaryId) => {
    const { tabs, activeTabId } = get();
    const nextSecondary = secondaryId !== undefined
      ? secondaryId
      : tabs.find((t) => t.id !== activeTabId)?.id || null;

    set({
      splitLayout: layout,
      secondaryTabId: nextSecondary,
    });
    get().saveSession();
  },

  toggleZenMode: () => {
    set((state) => ({ isZenMode: !state.isZenMode }));
  },

  setZenMode: (zen) => {
    set({ isZenMode: zen });
  },

  reorderTabs: (fromIndex, toIndex) => {
    const { tabs } = get();
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= tabs.length || toIndex >= tabs.length) {
      return;
    }
    const updated = [...tabs];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    set({ tabs: updated });
    get().saveSession();
  },

  togglePinTab: (tabId) => {
    set((state) => {
      const updated = state.tabs.map((t) =>
        t.id === tabId ? { ...t, isPinned: !t.isPinned } : t
      );
      // Sort pinned tabs to the front
      const pinned = updated.filter((t) => t.isPinned);
      const unpinned = updated.filter((t) => !t.isPinned);
      return { tabs: [...pinned, ...unpinned] };
    });
    get().saveSession();
  },

  updateTabPosition: (tabId, position) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              readingPosition: {
                ...t.readingPosition,
                ...position,
              },
            }
          : t
      ),
    }));
  },

  setOutline: (items) => {
    set({ outline: items, activeOutlineIndex: 0 });
  },

  setActiveOutlineIndex: (idx) => {
    set({ activeOutlineIndex: idx });
  },

  addRecentPath: (filePath: string) => {
    set((state) => {
      const filtered = state.recentPaths.filter((p) => p !== filePath);
      const updated = [filePath, ...filtered].slice(0, 30);
      setStorage(STORAGE_KEYS.RECENT, updated);
      return { recentPaths: updated };
    });
  },

  clearRecentPaths: () => {
    set({ recentPaths: [] });
    setStorage(STORAGE_KEYS.RECENT, []);
  },

  showToast: (msg, action) => {
    set({ toastMessage: msg, toastAction: action || null });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null, toastAction: null });
      }
    }, 4000);
  },

  hideToast: () => {
    set({ toastMessage: null, toastAction: null });
  },

  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setAboutOpen: (open) => set({ isAboutOpen: open }),

  loadSavedSession: async () => {
    try {
      const saved = getStorage<{
        tabs?: Array<{ path: string; name: string; isPinned?: boolean }>;
        activeTabId?: string;
        secondaryTabId?: string;
        splitLayout?: SplitLayout;
      }>(STORAGE_KEYS.SESSION, {});

      if (!saved.tabs || !saved.tabs.length) return;

      const validTabs: TabItem[] = [];
      let droppedCount = 0;

      for (const t of saved.tabs) {
        if (!t.path) continue;
        const ext = (t.name.split('.').pop() || '').toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext as 'pdf' | 'pptx')) {
          droppedCount++;
          continue;
        }

        // Verify if file still exists on disk
        if (window.studyApi) {
          const entry = await window.studyApi.readFile(t.path);
          if (entry.error) {
            droppedCount++;
            continue;
          }
        }

        const id = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        validTabs.push({
          id,
          path: t.path,
          name: t.name,
          ext: ext as 'pdf' | 'pptx',
          kind: EXTENSION_KINDS[ext] || 'pdf',
          isPinned: t.isPinned || false,
          lastAccessed: Date.now(),
        });
      }

      if (validTabs.length) {
        set({
          tabs: validTabs,
          activeTabId: validTabs[0].id,
          secondaryTabId: validTabs[1]?.id || null,
          splitLayout: saved.splitLayout && validTabs.length >= 2 ? saved.splitLayout : 'single',
        });
      }

      if (droppedCount > 0) {
        get().showToast(
          `${droppedCount} file${droppedCount > 1 ? 's' : ''} no longer exist and were removed from session.`
        );
      }
    } catch (err) {
      console.warn('Could not restore saved session', err);
    }
  },

  saveSession: () => {
    const { tabs, activeTabId, secondaryTabId, splitLayout } = get();
    const minimalTabs = tabs.map((t) => ({
      path: t.path,
      name: t.name,
      isPinned: t.isPinned,
    }));
    setStorage(STORAGE_KEYS.SESSION, {
      tabs: minimalTabs,
      activeTabId,
      secondaryTabId,
      splitLayout,
    });
  },
}));
