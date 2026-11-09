import { DocumentKind } from './types';

export const SUPPORTED_EXTENSIONS = ['pdf', 'pptx'] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const EXTENSION_KINDS: Record<string, DocumentKind> = {
  pdf: 'pdf',
  pptx: 'slides',
};

export const KIND_COLORS: Record<DocumentKind, string> = {
  pdf: '#e05656',
  slides: '#e08a3c',
};

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB safety limit

export const STORAGE_KEYS = {
  SESSION: 'zc.session.v1',
  RECENT: 'zc.recent.v1',
  SETTINGS: 'zc.settings.v1',
  POSITIONS: 'zc.positions.v1',
} as const;
