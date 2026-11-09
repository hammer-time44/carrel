import { BrowserWindow, dialog } from 'electron';
import { FileEntry } from '../../common/types';
import { FileService } from './file-service';

export class DialogService {
  constructor(private fileService: FileService) {}

  public async openFiles(win: BrowserWindow | null): Promise<FileEntry[]> {
    if (!win) return [];
    const res = await dialog.showOpenDialog(win, {
      title: 'Open Document - Carrel',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Supported Documents (*.pdf, *.pptx)', extensions: ['pdf', 'pptx'] },
        { name: 'PDF Documents (*.pdf)', extensions: ['pdf'] },
        { name: 'PowerPoint Presentations (*.pptx)', extensions: ['pptx'] },
      ],
    });

    if (res.canceled || !res.filePaths.length) return [];

    const entries: FileEntry[] = [];
    for (const p of res.filePaths) {
      const entry = await this.fileService.readEntry(p);
      if (entry) {
        if (!entry.error) {
          this.fileService.watchFile(p);
        }
        entries.push(entry);
      }
    }
    return entries;
  }
}
