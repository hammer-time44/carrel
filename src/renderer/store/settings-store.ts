import { create } from 'zustand';
import { STORAGE_KEYS } from '../../common/constants';
import { SavedPosition } from '../../common/types';

export type AppTheme = 'dark' | 'light' | 'system';

interface SettingsState {
  theme: AppTheme;
  invertImagesBack: boolean;
  positions: Record<string, SavedPosition>;

  // Actions
  setTheme: (theme: AppTheme) => void;
  setInvertImagesBack: (invert: boolean) => void;
  savePosition: (key: string, position: { page?: number; slide?: number; zoom?: number }) => void;
  getPosition: (key: string) => SavedPosition | undefined;
  clearHistory: () => void;
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

const savedSettings = getStorage<{ theme?: AppTheme; invertImagesBack?: boolean }>(
  STORAGE_KEYS.SETTINGS,
  { theme: 'dark', invertImagesBack: false }
);

const savedPositions = getStorage<Record<string, SavedPosition>>(STORAGE_KEYS.POSITIONS, {});

function applyThemeToDocument(theme: AppTheme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Initial theme application
applyThemeToDocument(savedSettings.theme || 'dark');

// Follow system theme changes if set to system
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const current = useSettingsStore.getState().theme;
  if (current === 'system') {
    applyThemeToDocument('system');
  }
});

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: savedSettings.theme || 'dark',
  invertImagesBack: savedSettings.invertImagesBack || false,
  positions: savedPositions,

  setTheme: (theme) => {
    set({ theme });
    applyThemeToDocument(theme);
    setStorage(STORAGE_KEYS.SETTINGS, {
      theme,
      invertImagesBack: get().invertImagesBack,
    });
  },

  setInvertImagesBack: (invertImagesBack) => {
    set({ invertImagesBack });
    setStorage(STORAGE_KEYS.SETTINGS, {
      theme: get().theme,
      invertImagesBack,
    });
  },

  savePosition: (key, pos) => {
    set((state) => {
      const updated = {
        ...state.positions,
        [key]: {
          ...pos,
          updatedAt: Date.now(),
        },
      };
      setStorage(STORAGE_KEYS.POSITIONS, updated);
      return { positions: updated };
    });
  },

  getPosition: (key) => {
    return get().positions[key];
  },

  clearHistory: () => {
    set({ positions: {} });
    setStorage(STORAGE_KEYS.POSITIONS, {});
  },
}));
