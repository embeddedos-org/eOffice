const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

const APP_LIST = [
  { id: 'email', name: 'eMail', icon: '✉️', category: 'Communication' },
  { id: 'edocs', name: 'eDocs', icon: '📝', category: 'Documents' },
  { id: 'enotes', name: 'eNotes', icon: '📒', category: 'Documents' },
  { id: 'esheets', name: 'eSheets', icon: '📊', category: 'Documents' },
  { id: 'eslides', name: 'eSlides', icon: '📽️', category: 'Documents' },
  { id: 'edb', name: 'eDB', icon: '🗄️', category: 'Data' },
  { id: 'edrive', name: 'eDrive', icon: '☁️', category: 'Storage' },
  { id: 'econnect', name: 'eConnect', icon: '💬', category: 'Communication' },
  { id: 'eforms', name: 'eForms', icon: '📋', category: 'Collaboration' },
  { id: 'esway', name: 'eSway', icon: '🎨', category: 'Collaboration' },
  { id: 'eplanner', name: 'ePlanner', icon: '📅', category: 'Collaboration' },
  { id: 'launcher', name: 'Launcher', icon: '🚀', category: 'System' },
];

function getAppDistPath(appId) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, `${appId}-app`);
  }
  return path.join(__dirname, '..', 'apps', appId, 'dist');
}

function getBrowserPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'browser');
  }
  return path.join(__dirname, '..', 'browser');
}

function hasReactBuild(appId) {
  const distPath = getAppDistPath(appId);
  return fs.existsSync(path.join(distPath, 'index.html'));
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

  const menuTemplate = [
    {
      label: 'eOffice',
      submenu: [
        { label: '🚀 Home (Launcher)', click: () => loadApp('launcher') },
        { type: 'separator' },
        { label: 'About eOffice', click: () => showAbout() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Apps',
      submenu: APP_LIST.filter(a => a.id !== 'launcher').map(appInfo => ({
        label: `${appInfo.icon} ${appInfo.name}`,
        click: () => loadApp(appInfo.id),
      })),
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

  // Default: load the launcher or email
  loadApp('email');

  mainWindow.on('closed', () => { mainWindow = null; });
}

function loadApp(appId) {
  // Try to load the full React app from dist/
  if (hasReactBuild(appId)) {
    const distPath = getAppDistPath(appId);
    mainWindow.loadFile(path.join(distPath, 'index.html'));
  } else if (appId === 'launcher') {
    // Launcher: try browser fallback
    const browserDir = getBrowserPath();
    mainWindow.loadFile(path.join(browserDir, 'index.html'));
  } else {
    // Fallback to browser HTML version
    const browserDir = getBrowserPath();
    const htmlFile = path.join(browserDir, `${appId}.html`);
    if (fs.existsSync(htmlFile)) {
      mainWindow.loadFile(htmlFile);
    } else {
      // Try the React app dist anyway
      const distPath = getAppDistPath(appId);
      mainWindow.loadFile(path.join(distPath, 'index.html'));
    }
  }

  const appInfo = APP_LIST.find(a => a.id === appId);
  const name = appInfo ? appInfo.name : appId;
  mainWindow.setTitle(`${name} — eOffice Suite`);
}

function showAbout() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About eOffice Suite',
    message: 'eOffice Suite v1.0.0',
    detail: 'AI-powered office productivity suite with eBot.\n\n12 apps: eMail, eDocs, eNotes, eSheets, eSlides, eDB, eDrive, eConnect, eForms, eSway, ePlanner + Launcher.\n\n© 2026 EoS Project',
  });
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
ipcMain.handle('open-app', (_event, appId) => loadApp(appId));
ipcMain.handle('go-home', () => loadApp('launcher'));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
