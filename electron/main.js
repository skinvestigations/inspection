const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Data storage path - saves in user's Documents folder
const dataDir = path.join(os.homedir(), 'Documents', 'AircraftInspections');
const dataFile = path.join(dataDir, 'inspection_data.json');
const photosDir = path.join(dataDir, 'photos');
const filesDir = path.join(dataDir, 'attachments');

// Ensure directories exist
function ensureDirectories() {
  [dataDir, photosDir, filesDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Aircraft Condition Inspection',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#f0f4f8',
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  ensureDirectories();
  createWindow();
  app.on('activate', () => { if (!mainWindow) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──────────────────────────────────────────────

// Load inspection data
ipcMain.handle('load-data', async () => {
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf8');
      return { success: true, data: JSON.parse(raw) };
    }
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Save inspection data
ipcMain.handle('save-data', async (event, data) => {
  try {
    ensureDirectories();
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Save photo to disk (returns filename only, not base64)
ipcMain.handle('save-photo', async (event, { itemId, base64data, filename, mimeType }) => {
  try {
    ensureDirectories();
    const ext = filename.split('.').pop() || 'jpg';
    const safeName = `${itemId}_${Date.now()}.${ext}`;
    const fullPath = path.join(photosDir, safeName);
    const b64 = base64data.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(fullPath, Buffer.from(b64, 'base64'));
    return { success: true, filename: safeName, path: fullPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Load photo (returns base64)
ipcMain.handle('load-photo', async (event, filename) => {
  try {
    const fullPath = path.join(photosDir, filename);
    if (!fs.existsSync(fullPath)) return { success: false, error: 'File not found' };
    const data = fs.readFileSync(fullPath);
    const ext = filename.split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    return { success: true, data: `data:${mime};base64,${data.toString('base64')}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Save attachment file
ipcMain.handle('save-file', async (event, { itemId, base64data, filename }) => {
  try {
    ensureDirectories();
    const safeName = `${itemId}_${Date.now()}_${filename}`;
    const fullPath = path.join(filesDir, safeName);
    const b64 = base64data.replace(/^data:[^;]+;base64,/, '');
    fs.writeFileSync(fullPath, Buffer.from(b64, 'base64'));
    return { success: true, filename: safeName, originalName: filename };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Export HTML report to chosen location
ipcMain.handle('export-report', async (event, htmlContent) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Inspection Report',
      defaultPath: path.join(os.homedir(), 'Documents', `inspection_report_${new Date().toISOString().slice(0,10)}.html`),
      filters: [{ name: 'HTML Report', extensions: ['html'] }],
    });
    if (result.canceled) return { success: false, canceled: true };
    fs.writeFileSync(result.filePath, htmlContent, 'utf8');
    shell.openPath(result.filePath);
    return { success: true, filePath: result.filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Print report
ipcMain.handle('print-report', async (event, htmlContent) => {
  const printWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false } });
  await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  printWin.webContents.print({ silent: false, printBackground: true }, (success) => {
    printWin.close();
  });
  return { success: true };
});

// Open data folder in Explorer
ipcMain.handle('open-data-folder', async () => {
  shell.openPath(dataDir);
  return { success: true };
});

// Reset all data
ipcMain.handle('reset-data', async () => {
  try {
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Get app version
ipcMain.handle('get-version', async () => {
  return app.getVersion();
});
