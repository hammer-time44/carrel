// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { processBrowserFile } from '../src/renderer/utils/file-opener';

describe('file-opener utility', () => {
  it('accepts valid PDF files and verifies PDF magic bytes header', async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
    const file = new File([pdfBytes], 'report.pdf', { type: 'application/pdf' });

    const entry = await processBrowserFile(file);
    expect(entry.error).toBeUndefined();
    expect(entry.name).toBe('report.pdf');
    expect(entry.data).toBeInstanceOf(Uint8Array);
    expect(entry.data.length).toBe(pdfBytes.length);
  });

  it('rejects invalid PDF missing %PDF- magic bytes header', async () => {
    const fakeBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    const file = new File([fakeBytes], 'fake.pdf', { type: 'application/pdf' });

    const entry = await processBrowserFile(file);
    expect(entry.error).toContain("missing '%PDF-' header signature");
    expect(entry.data.length).toBe(0);
  });

  it('accepts valid PPTX files with ZIP magic bytes header', async () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]); // PK\x03\x04
    const file = new File([zipBytes], 'deck.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });

    const entry = await processBrowserFile(file);
    expect(entry.error).toBeUndefined();
    expect(entry.name).toBe('deck.pptx');
    expect(entry.data).toBeInstanceOf(Uint8Array);
  });

  it('rejects non-goal file types (e.g. docx, xlsx, txt) with clear error', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'document.docx');
    const entry = await processBrowserFile(file);
    expect(entry.error).toContain('Unsupported file type ".docx"');
  });

  it('rejects oversized files exceeding 500MB', async () => {
    const fakeOversizedFile = {
      name: 'huge.pdf',
      size: 501 * 1024 * 1024,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File;

    const entry = await processBrowserFile(fakeOversizedFile);
    expect(entry.error).toContain('exceeds 500MB maximum limit');
  });
});

