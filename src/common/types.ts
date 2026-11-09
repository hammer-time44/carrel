export type DocumentKind = 'pdf' | 'slides';

export interface FileEntry {
  path: string;
  name: string;
  data: Uint8Array;
  lastModified?: number;
  size?: number;
  error?: string;
}

export interface TabOutlineItem {
  id: string;
  title: string;
  level: number;
  target: number; // 1-based page number for PDF, 0-based slide index for PPTX
  extra?: string;
}

export interface TabItem {
  id: string;
  path: string;
  name: string;
  ext: 'pdf' | 'pptx';
  kind: DocumentKind;
  isPinned?: boolean;
  readingPosition?: {
    page?: number;
    slide?: number;
    zoom?: number;
  };
  lastAccessed: number;
}

export type SplitLayout = 'single' | 'vertical';

export interface SavedPosition {
  page?: number;
  slide?: number;
  zoom?: number;
  updatedAt: number;
}

export interface StudyApi {
  openDialog: () => Promise<FileEntry[]>;
  readFile: (path: string) => Promise<FileEntry>;
  initialFiles: () => Promise<FileEntry[]>;
  windowControl: (action: 'close' | 'minimize' | 'maximize' | 'restore') => void;
  onOpenPaths: (cb: (entries: FileEntry[]) => void) => () => void;
  onFileChanged: (cb: (filePath: string) => void) => () => void;
  pathForFile: (file: File) => string;
  showInFolder: (filePath: string) => Promise<void>;
  getSystemInfo: () => Promise<{ platform: string; arch: string; version: string }>;
}

declare global {
  interface Window {
    studyApi: StudyApi;
  }
}
