const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  saveBackup: (payload) => ipcRenderer.invoke('save-backup', payload),
  manualBackupDialog: (payload) => ipcRenderer.invoke('manual-backup-dialog', payload)
});
