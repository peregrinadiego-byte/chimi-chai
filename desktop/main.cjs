const { app, BrowserWindow } = require('electron');
const path = require('node:path');

// On some Ubuntu Wayland sessions Electron can lose keyboard input after a
// native dialog closes. X11 keeps focus stable for the packaged desktop app.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform', 'x11');
  app.commandLine.appendSwitch('disable-features', 'WaylandWindowDecorations');
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'EZ-APU Studio',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  window.webContents.on('did-finish-load', () => {
    window.focus();
    window.webContents.focus();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
