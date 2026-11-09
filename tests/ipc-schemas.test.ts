import { describe, it, expect } from 'vitest';
import {
  IpcReadFileSchema,
  IpcWindowControlSchema,
  IpcShowInFolderSchema,
} from '../src/common/ipc-schemas';

describe('IPC Zod Schemas Validation', () => {
  it('validates IpcReadFileSchema', () => {
    expect(IpcReadFileSchema.safeParse({ path: '/valid/file.pdf' }).success).toBe(true);
    expect(IpcReadFileSchema.safeParse({ path: 'C:\\Users\\doc.pptx' }).success).toBe(true);
    expect(IpcReadFileSchema.safeParse({ path: '' }).success).toBe(false);
    expect(IpcReadFileSchema.safeParse({ path: 123 }).success).toBe(false);
  });

  it('validates IpcWindowControlSchema', () => {
    expect(IpcWindowControlSchema.safeParse({ action: 'close' }).success).toBe(true);
    expect(IpcWindowControlSchema.safeParse({ action: 'minimize' }).success).toBe(true);
    expect(IpcWindowControlSchema.safeParse({ action: 'maximize' }).success).toBe(true);
    expect(IpcWindowControlSchema.safeParse({ action: 'restore' }).success).toBe(true);
    expect(IpcWindowControlSchema.safeParse({ action: 'destroy' }).success).toBe(false);
    expect(IpcWindowControlSchema.safeParse({ action: 'unknown' }).success).toBe(false);
  });

  it('validates IpcShowInFolderSchema', () => {
    expect(IpcShowInFolderSchema.safeParse({ path: '/valid/file.pdf' }).success).toBe(true);
    expect(IpcShowInFolderSchema.safeParse({ path: '' }).success).toBe(false);
    expect(IpcShowInFolderSchema.safeParse({}).success).toBe(false);
  });
});
