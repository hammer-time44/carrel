const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const evidenceDir = path.join(__dirname, '..', 'docs', 'evidence', 'phase-0');
fs.mkdirSync(evidenceDir, { recursive: true });

const SUPPORTED = ['pdf', 'docx', 'pptx', 'xlsx', 'xls', 'csv'];
const extOf = (p) => path.extname(p).slice(1).toLowerCase();
const isSupported = (p) => SUPPORTED.includes(extOf(p));

function readEntry(p) {
  return { path: path.resolve(p), name: path.basename(p), data: fs.readFileSync(p) };
}

let win;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // offscreen/headless
    frame: false,
    backgroundColor: '#141414',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Mock dialogs & file reads for IPC
  ipcMain.handle('file:read', async (_e, p) => {
    try {
      if (!isSupported(p)) return null;
      return readEntry(p);
    } catch {
      return null;
    }
  });

  const sampleFiles = [
    'tests/fixtures/sample.docx',
    'tests/fixtures/sample.pptx',
    'tests/fixtures/sample.xlsx',
    'tests/fixtures/sample.pdf',
    'tests/fixtures/sample.csv'
  ].map(readEntry);

  ipcMain.handle('app:initial-files', async () => sampleFiles);

  ipcMain.on('win:ctl', () => {});

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  console.log('Window loaded. Waiting for renderer to load initial files...');
  await sleep(2500);

  // Capture overall window
  const imgInit = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '01-initial-tabs.png'), imgInit.toPNG());
  console.log('Saved 01-initial-tabs.png');

  // Switch tabs and capture each viewer
  // Tab 1: docx
  await win.webContents.executeJavaScript(`window.__sw.activate(1)`);
  await sleep(1000);
  let img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '02-docx-viewer.png'), img.toPNG());
  console.log('Saved 02-docx-viewer.png');

  // Tab 2: pptx
  await win.webContents.executeJavaScript(`window.__sw.activate(2)`);
  await sleep(1500);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '03-pptx-viewer.png'), img.toPNG());
  console.log('Saved 03-pptx-viewer.png');

  // Tab 3: xlsx
  await win.webContents.executeJavaScript(`window.__sw.activate(3)`);
  await sleep(1000);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '04-xlsx-viewer.png'), img.toPNG());
  console.log('Saved 04-xlsx-viewer.png');

  // Tab 4: pdf
  await win.webContents.executeJavaScript(`window.__sw.activate(4)`);
  await sleep(2000);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '05-pdf-viewer.png'), img.toPNG());
  console.log('Saved 05-pdf-viewer.png');

  // Tab 5: csv
  await win.webContents.executeJavaScript(`window.__sw.activate(5)`);
  await sleep(1000);
  img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(evidenceDir, '06-csv-viewer.png'), img.toPNG());
  console.log('Saved 06-csv-viewer.png');

  console.log('Phase 0 automated visual inspection complete!');
  app.quit();
});

