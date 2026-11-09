import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { FileService } from '../src/main/services/file-service';

describe('FileService', () => {
  let fileService: FileService;
  const fixturesDir = path.join(__dirname, 'fixtures');

  beforeEach(() => {
    fileService = new FileService();
  });

  afterEach(() => {
    fileService.dispose();
  });

  it('strictly identifies supported extensions (pdf and pptx only)', () => {
    expect(fileService.isExtensionSupported('doc.pdf')).toBe(true);
    expect(fileService.isExtensionSupported('doc.PDF')).toBe(true);
    expect(fileService.isExtensionSupported('deck.pptx')).toBe(true);
    expect(fileService.isExtensionSupported('deck.PPTX')).toBe(true);

    // Non-goal formats must be rejected
    expect(fileService.isExtensionSupported('report.docx')).toBe(false);
    expect(fileService.isExtensionSupported('data.xlsx')).toBe(false);
    expect(fileService.isExtensionSupported('sheet.csv')).toBe(false);
    expect(fileService.isExtensionSupported('script.js')).toBe(false);
    expect(fileService.isExtensionSupported('binary.exe')).toBe(false);
  });

  it('validates authentic PDF files by magic bytes', async () => {
    const validPdfPath = path.join(fixturesDir, 'sample.pdf');
    const res = await fileService.validateFile(validPdfPath);
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('pdf');
  });

  it('validates encrypted (password-protected) PDF as valid PDF structure', async () => {
    const encryptedPdfPath = path.join(fixturesDir, 'encrypted.pdf');
    const res = await fileService.validateFile(encryptedPdfPath);
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('pdf');

    const entry = await fileService.readEntry(encryptedPdfPath);
    expect(entry.error).toBeUndefined();
    expect(entry.data.length).toBeGreaterThan(0);
  });

  it('rejects corrupted PDF files missing %PDF- header with clear error', async () => {
    const corruptedPdfPath = path.join(fixturesDir, 'corrupted.pdf');
    const res = await fileService.validateFile(corruptedPdfPath);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("missing '%PDF-' header signature");
  });

  it('validates authentic PPTX files (ZIP container with presentation.xml)', async () => {
    const validPptxPath = path.join(fixturesDir, 'sample.pptx');
    const res = await fileService.validateFile(validPptxPath);
    expect(res.valid).toBe(true);
    expect(res.kind).toBe('slides');
  });

  it('rejects corrupted PPTX missing presentation.xml with clear error', async () => {
    const corruptedPptxPath = path.join(fixturesDir, 'corrupted.pptx');
    const res = await fileService.validateFile(corruptedPptxPath);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('ppt/presentation.xml');
  });

  it('rejects unsupported extensions during validation with informative error', async () => {
    const res = await fileService.validateFile('readme.txt', Buffer.from('hello'));
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Unsupported file type');
  });

  it('rejects buffers exceeding maximum file size limit (500MB)', async () => {
    const fakeOversizedBuffer = {
      length: 501 * 1024 * 1024,
      subarray: () => Buffer.from('%PDF-1.4'),
    } as unknown as Buffer;

    const res = await fileService.validateFile('big.pdf', fakeOversizedBuffer);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds 500MB maximum limit');
  });

  it('safely reads valid file entry returning byte array and metadata', async () => {
    const validPdfPath = path.join(fixturesDir, 'sample.pdf');
    const entry = await fileService.readEntry(validPdfPath);
    expect(entry.error).toBeUndefined();
    expect(entry.name).toBe('sample.pdf');
    expect(entry.data).toBeInstanceOf(Uint8Array);
    expect(entry.data.length).toBeGreaterThan(0);
    expect(entry.size).toBe(entry.data.length);
  });

  it('returns clean error in FileEntry when reading non-existent file', async () => {
    const entry = await fileService.readEntry(path.join(fixturesDir, 'ghost-file.pdf'));
    expect(entry.error).toContain('File not found');
    expect(entry.data.length).toBe(0);
  });
});
