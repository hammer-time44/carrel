import { app, BrowserWindow, ipcMain, Menu, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { FileService } from './services/file-service';
import { DialogService } from './services/dialog-service';
import {
  IpcReadFileSchema,
  IpcWindowControlSchema,
  IpcShowInFolderSchema,
} from '../common/ipc-schemas';
import { FileEntry } from '../common/types';

let mainWindow: BrowserWindow | null = null;
const fileService = new FileService();
const dialogService = new DialogService(fileService);

async function parseArgvFiles(argv: string[]): Promise<FileEntry[]> {
  const args = argv.slice(app.isPackaged ? 1 : 2);
  const entries: FileEntry[] = [];
  for (const a of args) {
    if (!a.startsWith('-') && fileService.isExtensionSupported(a)) {
      const entry = await fileService.readEntry(a);
      entries.push(entry);
    }
  }
  return entries;
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 780,
    minHeight: 500,
    frame: false,
    backgroundColor: '#0a0a0c',
    title: 'Carrel',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // HARD CONSTRAINT 1: Deny all navigation. No web browsing.
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  // HARD CONSTRAINT 1: Deny all window.open / popups / new window requests.
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Developer tools toggle via F12 in dev
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      win.webContents.toggleDevTools();
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const prodHtml = path.join(__dirname, '..', '..', 'dist', 'index.html');
    const fallbackHtml = path.join(app.getAppPath(), 'dist', 'index.html');
    if (fs.existsSync(prodHtml)) {
      win.loadFile(prodHtml);
    } else if (fs.existsSync(fallbackHtml)) {
      win.loadFile(fallbackHtml);
    } else {
      win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', async (_e, argv) => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    const files = await parseArgvFiles(argv);
    if (files.length) {
      mainWindow.webContents.send('open-paths', files);
    }
  });

  app.on('open-file', async (e, filePath) => {
    e.preventDefault();
    if (mainWindow && fileService.isExtensionSupported(filePath)) {
      const entry = await fileService.readEntry(filePath);
      mainWindow.webContents.send('open-paths', [entry]);
    }
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.carrel.app');
    }
    if (process.platform !== 'darwin') Menu.setApplicationMenu(null);

    // Hardened strict Content-Security-Policy header
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const connectSrc = isDev ? "connect-src 'self' ws://localhost:* http://localhost:*;" : "connect-src 'none';";

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self' 'wasm-unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            connectSrc + " " +
            "object-src 'none'; " +
            "base-uri 'none'; " +
            "form-action 'none';"
          ],
        },
      });
    });

    // Notify renderer on external file changes
    fileService.onFileChange((filePath) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('file:changed', filePath);
      }
    });

    mainWindow = createWindow();

    // End-to-end smoke test mode
    if (process.argv.includes('--smoke-test')) {
      mainWindow.webContents.once('did-finish-load', async () => {
        try {
          console.log('[SmokeTest] Window loaded successfully.');
          await new Promise((r) => setTimeout(r, 1000));

          const hasStudyApi = await mainWindow!.webContents.executeJavaScript('!!window.studyApi');
          if (!hasStudyApi) throw new Error('window.studyApi is missing');

          const pdfPath = path.join(app.getAppPath(), 'tests', 'fixtures', 'sample.pdf');
          const pdfEntry = await fileService.readEntry(pdfPath);
          if (!pdfEntry || !pdfEntry.data.length || pdfEntry.error) {
            throw new Error(`Failed to read sample.pdf: ${pdfEntry?.error}`);
          }
          console.log(`[SmokeTest] Verified PDF loading: ${pdfEntry.name} (${pdfEntry.data.length} bytes)`);

          const pptxPath = path.join(app.getAppPath(), 'tests', 'fixtures', 'sample.pptx');
          const pptxEntry = await fileService.readEntry(pptxPath);
          if (!pptxEntry || !pptxEntry.data.length || pptxEntry.error) {
            throw new Error(`Failed to read sample.pptx: ${pptxEntry?.error}`);
          }
          console.log(`[SmokeTest] Verified PPTX loading: ${pptxEntry.name} (${pptxEntry.data.length} bytes)`);

          const corruptedPath = path.join(app.getAppPath(), 'tests', 'fixtures', 'corrupted.pdf');
          const corruptedEntry = await fileService.readEntry(corruptedPath);
          if (!corruptedEntry?.error) {
            throw new Error('Corrupted PDF did not produce validation error');
          }
          console.log(`[SmokeTest] Verified rejection of corrupted file: ${corruptedEntry.error}`);

          console.log('[SmokeTest] ALL SMOKE TEST CHECKS PASSED.');
          app.quit();
          process.exit(0);
        } catch (err) {
          console.error('[SmokeTest] FAILED:', err);
          app.quit();
          process.exit(1);
        }
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    fileService.dispose();
    if (process.platform !== 'darwin') app.quit();
  });
}

// -------------------------------------------------------------
// Hardened Typed IPC Handlers with Zod Schema Validation
// -------------------------------------------------------------

ipcMain.handle('dialog:open', async () => {
  return dialogService.openFiles(mainWindow);
});

ipcMain.handle('file:read', async (_e, rawPath) => {
  const parsed = IpcReadFileSchema.safeParse({ path: rawPath });
  if (!parsed.success) {
    return {
      path: typeof rawPath === 'string' ? rawPath : '',
      name: '',
      data: new Uint8Array(),
      error: 'Invalid file path supplied to read handler',
    };
  }
  const entry = await fileService.readEntry(parsed.data.path);
  if (!entry.error) {
    fileService.watchFile(parsed.data.path);
  }
  return entry;
});

ipcMain.handle('app:initial-files', async () => {
  return parseArgvFiles(process.argv);
});

ipcMain.on('win:ctl', (_e, rawAction) => {
  const parsed = IpcWindowControlSchema.safeParse({ action: rawAction });
  if (!parsed.success || !mainWindow) return;
  const { action } = parsed.data;
  if (action === 'close') mainWindow.close();
  else if (action === 'minimize') mainWindow.minimize();
  else if (action === 'maximize') {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  } else if (action === 'restore') mainWindow.unmaximize();
});

ipcMain.handle('shell:show-item', async (_e, rawPath) => {
  const parsed = IpcShowInFolderSchema.safeParse({ path: rawPath });
  if (parsed.success && fs.existsSync(parsed.data.path)) {
    shell.showItemInFolder(parsed.data.path);
  }
});

ipcMain.handle('app:system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
  };
});
