import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { FileEntry } from '../../common/types';
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../../common/constants';

export class FileService {
  private watchers = new Map<string, fs.FSWatcher>();
  private fileChangeListeners: Array<(filePath: string) => void> = [];

  public isExtensionSupported(filePath: string): boolean {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
  }

  public async validateFile(
    filePath: string,
    buffer?: Buffer
  ): Promise<{ valid: boolean; error?: string; kind?: 'pdf' | 'slides' }> {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (ext !== 'pdf' && ext !== 'pptx') {
      return {
        valid: false,
        error: `Unsupported file type ".${ext || 'unknown'}". Carrel opens .pdf and .pptx files only.`,
      };
    }

    let data: Buffer;
    if (buffer) {
      data = buffer;
    } else {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: `File not found: ${filePath}` };
      }
      data = fs.readFileSync(filePath);
    }

    if (data.length > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size (${(data.length / (1024 * 1024)).toFixed(1)}MB) exceeds 500MB maximum limit.`,
      };
    }

    if (ext === 'pdf') {
      // PDF header validation: must contain %PDF- in the first 1024 bytes
      const headerStr = data.subarray(0, Math.min(1024, data.length)).toString('latin1');
      if (!headerStr.includes('%PDF-')) {
        return {
          valid: false,
          error: `Invalid PDF file: missing '%PDF-' header signature.`,
        };
      }
      return { valid: true, kind: 'pdf' };
    }

    if (ext === 'pptx') {
      // PPTX magic bytes validation: must start with ZIP signature (0x50, 0x4B)
      if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b) {
        return {
          valid: false,
          error: `Invalid PPTX file: missing ZIP container header.`,
        };
      }

      try {
        const zip = await JSZip.loadAsync(data);
        const hasContentTypes = zip.file('[Content_Types].xml') !== null;
        const hasPresentation = zip.file('ppt/presentation.xml') !== null;

        if (!hasContentTypes || !hasPresentation) {
          const missing = [
            !hasContentTypes ? '[Content_Types].xml' : null,
            !hasPresentation ? 'ppt/presentation.xml' : null,
          ]
            .filter(Boolean)
            .join(' and ');
          return {
            valid: false,
            error: `Invalid PPTX file: missing required package parts (${missing}).`,
          };
        }
        return { valid: true, kind: 'slides' };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          valid: false,
          error: `Corrupted PPTX container: ${msg}`,
        };
      }
    }

    return { valid: false, error: 'Unsupported format' };
  }

  public async readEntry(filePath: string): Promise<FileEntry> {
    const resolved = path.resolve(filePath);
    const fileName = path.basename(resolved);

    try {
      if (!fs.existsSync(resolved)) {
        return {
          path: resolved,
          name: fileName,
          data: new Uint8Array(),
          error: `File not found: ${resolved}`,
        };
      }

      const stat = fs.statSync(resolved);
      if (!stat.isFile()) {
        return {
          path: resolved,
          name: fileName,
          data: new Uint8Array(),
          error: `Path is not a regular file: ${resolved}`,
        };
      }

      if (stat.size > MAX_FILE_SIZE_BYTES) {
        return {
          path: resolved,
          name: fileName,
          data: new Uint8Array(),
          lastModified: stat.mtimeMs,
          size: stat.size,
          error: `File size (${(stat.size / (1024 * 1024)).toFixed(1)}MB) exceeds 500MB limit.`,
        };
      }

      const buffer = fs.readFileSync(resolved);
      const validation = await this.validateFile(resolved, buffer);
      if (!validation.valid) {
        return {
          path: resolved,
          name: fileName,
          data: new Uint8Array(),
          lastModified: stat.mtimeMs,
          size: stat.size,
          error: validation.error,
        };
      }

      return {
        path: resolved,
        name: fileName,
        data: new Uint8Array(buffer),
        lastModified: stat.mtimeMs,
        size: stat.size,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        path: resolved,
        name: fileName,
        data: new Uint8Array(),
        error: `Error reading file: ${msg}`,
      };
    }
  }

  public watchFile(filePath: string): void {
    const resolved = path.resolve(filePath);
    if (this.watchers.has(resolved) || !fs.existsSync(resolved)) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    try {
      const watcher = fs.watch(resolved, (eventType) => {
        if (eventType === 'change') {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            this.notifyChange(resolved);
          }, 300);
        }
      });
      this.watchers.set(resolved, watcher);
    } catch (e) {
      console.warn(`[FileService] Could not watch file: ${resolved}`, e);
    }
  }

  public unwatchFile(filePath: string): void {
    const resolved = path.resolve(filePath);
    const watcher = this.watchers.get(resolved);
    if (watcher) {
      watcher.close();
      this.watchers.delete(resolved);
    }
  }

  public onFileChange(listener: (filePath: string) => void): () => void {
    this.fileChangeListeners.push(listener);
    return () => {
      this.fileChangeListeners = this.fileChangeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(filePath: string) {
    for (const listener of this.fileChangeListeners) {
      listener(filePath);
    }
  }

  public dispose() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    this.fileChangeListeners = [];
  }
}
