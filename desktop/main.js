const { app, BrowserWindow, ipcMain, shell, Menu, session } = require('electron');
const { initAutoUpdater } = require('./auto-updater');
const { initDesktopSentry } = require('./sentry');
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

const VALID_APP_IDS = new Set(APP_LIST.map((a) => a.id));
const ALLOWED_EXTERNAL_SCHEMES = new Set(['https:', 'mailto:']);
const SERVER_PORT = process.env.EOFFICE_SERVER_PORT || '3001';

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

function isValidExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_EXTERNAL_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

function isAllowedNavigation(url) {
  try {
    const parsed = new URL(url);

    // Allow file:// only within the app's own directory
    if (parsed.protocol === 'file:') {
      const appDir = path.resolve(__dirname, '..');
      const filePath = path.resolve(decodeURIComponent(parsed.pathname));
      return filePath.startsWith(appDir);
    }

    // Allow only localhost on the specific server port
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.hostname === 'localhost' && parsed.port === SERVER_PORT;
    }

    return false;
  } catch {
    return false;
  }
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
      sandbox: true,
    },
  });

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob:; " +
          `connect-src 'self' http://localhost:${SERVER_PORT} ws://localhost:${SERVER_PORT}; ` +
          "font-src 'self'; " +
          "frame-ancestors 'none'",
        ],
      },
    });
  });

  const isProduction = app.isPackaged;

  const menuTemplate = [
    {
      label: 'eOffice',
      submenu: [
        { label: '🚀 Home (Launcher)', click: () => loadApp('launcher') },
        { type: 'separator' },
        { label: 'Check for Updates...', click: () => { const { autoUpdater } = require('electron-updater'); autoUpdater.checkForUpdates(); } },
        { label: 'About eOffice', click: () => showAbout() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Apps',
      submenu: APP_LIST.filter((a) => a.id !== 'launcher').map((appInfo) => ({
        label: `${appInfo.icon} ${appInfo.name}`,
        click: () => loadApp(appInfo.id),
      })),
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isProduction ? [] : [{ role: 'toggleDevTools' }]),
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  loadApp('email');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function loadApp(appId) {
  // Validate appId against whitelist
  if (!VALID_APP_IDS.has(appId)) {
    console.error(`Invalid app ID rejected: ${appId}`);
    return;
  }

  if (hasReactBuild(appId)) {
    const distPath = getAppDistPath(appId);
    mainWindow.loadFile(path.join(distPath, 'index.html'));
  } else if (appId === 'launcher') {
    const browserDir = getBrowserPath();
    mainWindow.loadFile(path.join(browserDir, 'index.html'));
  } else {
    const browserDir = getBrowserPath();
    const htmlFile = path.join(browserDir, `${appId}.html`);
    if (fs.existsSync(htmlFile)) {
      mainWindow.loadFile(htmlFile);
    } else {
      const distPath = getAppDistPath(appId);
      mainWindow.loadFile(path.join(distPath, 'index.html'));
    }
  }

  const appInfo = APP_LIST.find((a) => a.id === appId);
  const name = appInfo ? appInfo.name : appId;
  mainWindow.setTitle(`${name} — eOffice Suite`);
}

function showAbout() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About eOffice Suite',
    message: `eOffice Suite v${app.getVersion()}`,
    detail:
      'AI-powered office productivity suite with eBot.\n\n12 apps: eMail, eDocs, eNotes, eSheets, eSlides, eDB, eDrive, eConnect, eForms, eSway, ePlanner + Launcher.\n\n© 2026 EoS Project',
  });
}

// Restrict navigation to allowed URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      // If it's a valid external URL, open it externally
      if (isValidExternalUrl(url)) {
        shell.openExternal(url);
      }
    }
  });

  // Block new windows from opening — open valid external URLs instead
  contents.setWindowOpenHandler(({ url }) => {
    if (isValidExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
});

// IPC handlers with validation
ipcMain.handle('open-external', (_event, url) => {
  if (typeof url !== 'string' || !isValidExternalUrl(url)) {
    throw new Error('Invalid URL: only https: and mailto: schemes are allowed');
  }
  return shell.openExternal(url);
});

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('open-app', (_event, appId) => {
  if (typeof appId !== 'string' || !VALID_APP_IDS.has(appId)) {
    throw new Error('Invalid app ID');
  }
  loadApp(appId);
});

ipcMain.handle('go-home', () => loadApp('launcher'));

app.whenReady().then(() => {
  initDesktopSentry();
  createWindow();
  initAutoUpdater();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
