import { z } from 'zod';

export const IpcReadFileSchema = z.object({
  path: z.string().min(1, 'File path cannot be empty').max(4096),
});

export const IpcWindowControlSchema = z.object({
  action: z.enum(['close', 'minimize', 'maximize', 'restore']),
});

export const IpcShowInFolderSchema = z.object({
  path: z.string().min(1, 'File path cannot be empty').max(4096),
});
