const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('--- STARTING ELECTRON SMOKE TEST ---');

// Prevent secondary instance logic from quitting smoke test
app.whenReady().then(async () => {
  try {
    const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
    if (!fs.existsSync(distIndex)) {
      console.error('FAIL: dist/index.html does not exist. Run npm run build first.');
      process.exit(1);
    }

    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', 'dist-electron', 'main', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    console.log('Loading dist/index.html...');
    await win.loadFile(distIndex);

    console.log('Window loaded successfully.');

    // Wait 1.5s for initial React render
    await new Promise((r) => setTimeout(r, 1500));

    // Evaluate title and elements in renderer
    const title = await win.webContents.executeJavaScript('document.title');
    console.log('Document title:', title);

    const hasAppContainer = await win.webContents.executeJavaScript(
      '!!document.getElementById("app-container")'
    );
    console.log('App container present:', hasAppContainer);

    if (!hasAppContainer) {
      throw new Error('App container not mounted in DOM');
    }

    // Verify preload API is securely exposed
    const hasStudyApi = await win.webContents.executeJavaScript('!!window.studyApi');
    console.log('window.studyApi exposed via contextBridge:', hasStudyApi);
    if (!hasStudyApi) {
      throw new Error('window.studyApi is missing in sandboxed window');
    }

    // Test opening sample PDF
    const pdfPath = path.join(__dirname, '..', 'tests', 'fixtures', 'sample.pdf');
    console.log('Testing reading sample.pdf via IPC...');
    const pdfEntry = await win.webContents.executeJavaScript(
      `window.studyApi.readFile(${JSON.stringify(pdfPath)})`
    );
    console.log('PDF entry read:', {
      name: pdfEntry?.name,
      byteLength: pdfEntry?.data?.length,
      hasError: !!pdfEntry?.error,
    });

    if (!pdfEntry || !pdfEntry.data || pdfEntry.data.length === 0 || pdfEntry.error) {
      throw new Error('Failed to read sample.pdf via studyApi.readFile');
    }

    // Test opening sample PPTX
    const pptxPath = path.join(__dirname, '..', 'tests', 'fixtures', 'sample.pptx');
    console.log('Testing reading sample.pptx via IPC...');
    const pptxEntry = await win.webContents.executeJavaScript(
      `window.studyApi.readFile(${JSON.stringify(pptxPath)})`
    );
    console.log('PPTX entry read:', {
      name: pptxEntry?.name,
      byteLength: pptxEntry?.data?.length,
      hasError: !!pptxEntry?.error,
    });

    if (!pptxEntry || !pptxEntry.data || pptxEntry.data.length === 0 || pptxEntry.error) {
      throw new Error('Failed to read sample.pptx via studyApi.readFile');
    }

    // Test opening corrupted PDF
    const corruptedPdfPath = path.join(__dirname, '..', 'tests', 'fixtures', 'corrupted.pdf');
    console.log('Testing reading corrupted.pdf via IPC (expect rejection)...');
    const corruptedEntry = await win.webContents.executeJavaScript(
      `window.studyApi.readFile(${JSON.stringify(corruptedPdfPath)})`
    );
    console.log('Corrupted PDF error returned:', corruptedEntry?.error);
    if (!corruptedEntry?.error) {
      throw new Error('Corrupted PDF did not return expected validation error');
    }

    console.log('\n--- ALL SMOKE TEST CHECKS PASSED SUCCESSFULLY ---');
    app.quit();
    process.exit(0);
  } catch (err) {
    console.error('SMOKE TEST FAILED:', err);
    app.quit();
    process.exit(1);
  }
});

