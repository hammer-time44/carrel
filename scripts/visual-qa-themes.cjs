const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const evidenceDir = path.join(__dirname, '..', 'docs', 'evidence', 'phase-4');
fs.mkdirSync(evidenceDir, { recursive: true });

function readEntry(p) {
  const resolved = path.resolve(p);
  const stat = fs.statSync(resolved);
  return {
    path: resolved,
    name: path.basename(resolved),
    data: new Uint8Array(fs.readFileSync(resolved)),
    lastModified: stat.mtimeMs,
    size: stat.size
  };
}

let win;
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1320,
    height: 840,
    show: false,
    frame: false,
    backgroundColor: '#141414',
    webPreferences: {
      preload: path.join(__dirname, '..', 'dist-electron', 'main', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const sampleFiles = [
    'tests/fixtures/sample.docx',
    'tests/fixtures/sample.xlsx',
    'tests/fixtures/sample.pdf'
  ].map(readEntry);

  ipcMain.handle('app:initial-files', async () => sampleFiles);
  ipcMain.handle('file:read', async (_e, p) => readEntry(p));
  ipcMain.handle('file:save', async (_e, p, data) => true);
  ipcMain.handle('dialog:open', async () => []);
  ipcMain.handle('app:system-info', async () => ({ platform: 'win32', arch: 'x64', version: '0.1.0' }));
  ipcMain.on('win:ctl', () => {});

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  await win.loadFile(indexPath);
  await sleep(3000);

  // 1. Dark Theme (1320x840)
  let img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '01-dark-theme-1320x840.png'), img.toPNG());
  console.log('Saved 01-dark-theme-1320x840.png');

  // 2. Light Theme (1320x840)
  await win.webContents.executeJavaScript(`
    document.documentElement.setAttribute('data-theme', 'light');
  `);
  await sleep(600);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '02-light-theme-1320x840.png'), img.toPNG());
  console.log('Saved 02-light-theme-1320x840.png');

  // 3. High-Contrast Theme (1320x840)
  await win.webContents.executeJavaScript(`
    document.documentElement.setAttribute('data-theme', 'high-contrast');
  `);
  await sleep(600);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '03-high-contrast-1320x840.png'), img.toPNG());
  console.log('Saved 03-high-contrast-1320x840.png');

  // Switch back to dark theme
  await win.webContents.executeJavaScript(`
    document.documentElement.setAttribute('data-theme', 'dark');
  `);

  // 4. Compact Window Size (1024x768)
  win.setSize(1024, 768);
  await sleep(600);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '04-compact-1024x768.png'), img.toPNG());
  console.log('Saved 04-compact-1024x768.png');

  // 5. Smallest Window Size (800x600)
  win.setSize(800, 600);
  await sleep(600);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '05-small-800x600.png'), img.toPNG());
  console.log('Saved 05-small-800x600.png');

  console.log('Phase 4 Visual QA inspection completed successfully!');
  app.quit();
});

