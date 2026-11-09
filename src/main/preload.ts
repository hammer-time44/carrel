import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { FileEntry, StudyApi } from '../common/types';

const api: StudyApi = {
  openDialog: () => ipcRenderer.invoke('dialog:open'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  initialFiles: () => ipcRenderer.invoke('app:initial-files'),
  windowControl: (action: 'close' | 'minimize' | 'maximize' | 'restore') => {
    ipcRenderer.send('win:ctl', action);
  },
  onOpenPaths: (cb: (entries: FileEntry[]) => void) => {
    const handler = (_e: unknown, entries: FileEntry[]) => cb(entries);
    ipcRenderer.on('open-paths', handler);
    return () => {
      ipcRenderer.removeListener('open-paths', handler);
    };
  },
  onFileChanged: (cb: (filePath: string) => void) => {
    const handler = (_e: unknown, filePath: string) => cb(filePath);
    ipcRenderer.on('file:changed', handler);
    return () => {
      ipcRenderer.removeListener('file:changed', handler);
    };
  },
  pathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },
  showInFolder: (filePath: string) => ipcRenderer.invoke('shell:show-item', filePath),
  getSystemInfo: () => ipcRenderer.invoke('app:system-info'),
};

contextBridge.exposeInMainWorld('studyApi', api);
