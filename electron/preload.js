const { contextBridge, ipcRenderer } = require('electron');

// Expose safe API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Data persistence
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),

  // Photos - stored as files on disk, not base64 in JSON
  savePhoto: (args) => ipcRenderer.invoke('save-photo', args),
  loadPhoto: (filename) => ipcRenderer.invoke('load-photo', filename),

  // File attachments
  saveFile: (args) => ipcRenderer.invoke('save-file', args),

  // Report
  exportReport: (html) => ipcRenderer.invoke('export-report', html),
  printReport: (html) => ipcRenderer.invoke('print-report', html),

  // Utility
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  resetData: () => ipcRenderer.invoke('reset-data'),
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Is running in Electron?
  isElectron: true,
});
