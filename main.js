const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('save-backup', async (_, { data, suggestedName }) => {
  const backupDir = path.join(app.getPath('documents'), 'ClassroomConnectBackups');
  fs.mkdirSync(backupDir, { recursive: true });

  const safeName = (suggestedName || `backup-${Date.now()}`)
    .replace(/[^a-z0-9-_@.]/gi, '-')
    .slice(0, 80);
  const filename = `${safeName}.json`;
  const filepath = path.join(backupDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  return filepath;
});

ipcMain.handle('manual-backup-dialog', async (_, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Save Backup',
    defaultPath: `${payload.defaultName}.json`,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  });

  if (canceled || !filePath) return { canceled: true };

  fs.writeFileSync(filePath, JSON.stringify(payload.data, null, 2), 'utf8');
  return { canceled: false, filePath };
});
