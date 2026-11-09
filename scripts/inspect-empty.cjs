const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const evidenceDir = path.join(__dirname, '..', 'docs', 'evidence', 'phase-0');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    frame: false,
    backgroundColor: '#141414',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  ipcMain.handle('app:initial-files', async () => []);
  ipcMain.handle('file:read', async () => null);

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 1000));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '00-empty-state.png'), img.toPNG());
  console.log('Saved 00-empty-state.png');
  app.quit();
});

