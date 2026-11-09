import { FileEntry } from '../../common/types';
import { MAX_FILE_SIZE_BYTES, SUPPORTED_EXTENSIONS } from '../../common/constants';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04

export async function processBrowserFile(file: File): Promise<FileEntry> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext as 'pdf' | 'pptx')) {
    return {
      path: file.name,
      name: file.name,
      data: new Uint8Array(0),
      error: `Unsupported file type ".${ext || 'unknown'}". Carrel only accepts .pdf and .pptx files.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      path: file.name,
      name: file.name,
      data: new Uint8Array(0),
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 500MB maximum limit.`,
    };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Magic bytes check
  if (ext === 'pdf') {
    const isPdf = PDF_MAGIC.every((b, idx) => bytes[idx] === b);
    if (!isPdf) {
      return {
        path: file.name,
        name: file.name,
        data: new Uint8Array(0),
        error: `Invalid PDF document: missing '%PDF-' header signature.`,
      };
    }
  } else if (ext === 'pptx') {
    const isZip = ZIP_MAGIC.every((b, idx) => bytes[idx] === b);
    if (!isZip) {
      return {
        path: file.name,
        name: file.name,
        data: new Uint8Array(0),
        error: `Invalid PPTX document: missing valid ZIP package header.`,
      };
    }
  }

  return {
    path: file.name,
    name: file.name,
    data: bytes,
    size: file.size,
    lastModified: file.lastModified,
  };
}

export async function openFileDialog(): Promise<FileEntry[]> {
  if (window.studyApi) {
    try {
      const results = await window.studyApi.openDialog();
      return results || [];
    } catch (e) {
      console.error('Error invoking native openDialog:', e);
    }
  }

  // Fallback for browser / preview environment: dynamic file input
  return new Promise<FileEntry[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    input.multiple = true;
    input.style.display = 'none';

    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) {
        resolve([]);
        return;
      }

      const entries: FileEntry[] = [];
      for (const file of Array.from(files)) {
        const entry = await processBrowserFile(file);
        entries.push(entry);
      }
      document.body.removeChild(input);
      resolve(entries);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve([]);
    };

    document.body.appendChild(input);
    input.click();
  });
}

export async function openDroppedFile(file: File): Promise<FileEntry> {
  const filePath = window.studyApi?.pathForFile(file);
  if (filePath && window.studyApi) {
    return await window.studyApi.readFile(filePath);
  }
  return await processBrowserFile(file);
}

