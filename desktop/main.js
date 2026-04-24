const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

function getEmailAppPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'email-app');
  }
  return path.join(__dirname, '..', 'apps', 'email', 'dist');
}

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

  // Build the application menu with all apps
  const menuTemplate = [
    {
      label: 'eOffice',
      submenu: [
        { label: 'Home (Launcher)', click: () => loadBrowserApp('index') },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Apps',
      submenu: [
        { label: '✉️ eMail (Full)', click: () => loadEmailApp() },
        { type: 'separator' },
        { label: '📝 eDocs', click: () => loadBrowserApp('edocs') },
        { label: '📒 eNotes', click: () => loadBrowserApp('enotes') },
        { label: '📊 eSheets', click: () => loadBrowserApp('esheets') },
        { label: '📽️ eSlides', click: () => loadBrowserApp('eslides') },
        { label: '🗄️ eDB', click: () => loadBrowserApp('edb') },
        { label: '☁️ eDrive', click: () => loadBrowserApp('edrive') },
        { label: '💬 eConnect', click: () => loadBrowserApp('econnect') },
        { label: '📋 eForms', click: () => loadBrowserApp('eforms') },
        { label: '🎨 eSway', click: () => loadBrowserApp('esway') },
        { label: '📅 ePlanner', click: () => loadBrowserApp('eplanner') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  // Default: load the full React eMail app
  loadEmailApp();

  mainWindow.on('closed', () => { mainWindow = null; });
}

function loadEmailApp() {
  const emailPath = getEmailAppPath();
  mainWindow.loadFile(path.join(emailPath, 'index.html'));
  mainWindow.setTitle('eMail — eOffice Suite');
}

function loadBrowserApp(appId) {
  const browserDir = getBrowserPath();
  mainWindow.loadFile(path.join(browserDir, `${appId}.html`));
  const names = {
    index: 'Launcher', edocs: 'eDocs', enotes: 'eNotes', esheets: 'eSheets',
    eslides: 'eSlides', email: 'eMail', edb: 'eDB', edrive: 'eDrive',
    econnect: 'eConnect', eforms: 'eForms', esway: 'eSway', eplanner: 'ePlanner',
  };
  mainWindow.setTitle(`${names[appId] || appId} — eOffice Suite`);
}

// Handle external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    if (url.startsWith('http://localhost')) return;
    event.preventDefault();
    shell.openExternal(url);
  });
});

// IPC handlers
ipcMain.handle('open-external', (_event, url) => shell.openExternal(url));
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('open-app', (_event, appId) => {
  if (appId === 'email') loadEmailApp();
  else loadBrowserApp(appId);
});
ipcMain.handle('go-home', () => loadBrowserApp('index'));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
