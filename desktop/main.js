const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function getBrowserPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'browser');
  }
  return path.join(__dirname, '..', 'browser');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'eOffice Suite',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev && process.env.EOFFICE_DEV_URL) {
    mainWindow.loadURL(process.env.EOFFICE_DEV_URL);
  } else {
    const browserDir = getBrowserPath();
    mainWindow.loadFile(path.join(browserDir, 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Handle navigation to app pages within the browser folder
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    // Allow navigation within browser folder (relative links like email.html, edocs.html)
    if (url.startsWith('file://')) {
      return; // Allow local file navigation
    }
    // Open external URLs in system browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
});

// IPC handlers
ipcMain.handle('open-external', (_event, url) => shell.openExternal(url));
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('open-app', (_event, appId) => {
  const browserDir = getBrowserPath();
  const appFile = path.join(browserDir, `${appId}.html`);
  if (mainWindow) {
    mainWindow.loadFile(appFile);
  }
});
ipcMain.handle('go-home', () => {
  const browserDir = getBrowserPath();
  if (mainWindow) {
    mainWindow.loadFile(path.join(browserDir, 'index.html'));
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
