const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow, ipcMain } = require('electron');

// Configure logging
autoUpdater.logger = require('electron').app.isPackaged ? null : console;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let updateWindow = null;

/**
 * Initialize auto-updater with optional S3 config.
 * Falls back to GitHub Releases if S3 is not configured.
 */
function initAutoUpdater() {
  // S3 configuration (override via environment variables)
  if (process.env.EOFFICE_S3_BUCKET) {
    autoUpdater.setFeedURL({
      provider: 's3',
      bucket: process.env.EOFFICE_S3_BUCKET,
      region: process.env.EOFFICE_S3_REGION || 'us-east-1',
      path: 'desktop-releases',
      acl: 'public-read',
    });
  }
  // Otherwise uses the publish config from package.json (GitHub Releases)

  // Check for updates on startup (after 10 second delay)
  setTimeout(() => {
    checkForUpdates(true);
  }, 10000);

  // Check every 4 hours
  setInterval(() => {
    checkForUpdates(true);
  }, 4 * 60 * 60 * 1000);

  // --- Event Handlers ---

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('available', `Update v${info.version} available`);

    // Ask user if they want to download
    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      dialog.showMessageBox(mainWin, {
        type: 'info',
        title: 'Update Available',
        message: `eOffice v${info.version} is available (current: v${require('./package.json').version})`,
        detail: info.releaseNotes
          ? `Release notes:\n${typeof info.releaseNotes === 'string' ? info.releaseNotes : info.releaseNotes.map(n => n.note).join('\n')}`
          : 'A new version is available.',
        buttons: ['Download Now', 'Later'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
          sendStatusToWindow('downloading', 'Downloading update...');
        }
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    sendStatusToWindow('up-to-date', 'You are running the latest version');
  });

  autoUpdater.on('download-progress', (progress) => {
    sendStatusToWindow('downloading', `Downloading: ${Math.round(progress.percent)}%`, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('ready', `v${info.version} ready to install`);

    const mainWin = BrowserWindow.getFocusedWindow();
    if (mainWin) {
      dialog.showMessageBox(mainWin, {
        type: 'info',
        title: 'Update Ready',
        message: `eOffice v${info.version} has been downloaded.`,
        detail: 'The update will be installed when you restart the app.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
    }
  });

  autoUpdater.on('error', (err) => {
    const message = err.message || 'Unknown error';
    // Don't show dialog for network errors during silent checks
    if (!message.includes('net::ERR')) {
      sendStatusToWindow('error', `Update error: ${message}`);
    }
  });

  // --- IPC Handlers ---

  ipcMain.handle('check-for-updates', () => checkForUpdates(false));
  ipcMain.handle('get-update-status', () => autoUpdater.currentVersion?.version || 'unknown');
}

function checkForUpdates(silent) {
  try {
    autoUpdater.checkForUpdates();
  } catch (err) {
    if (!silent) {
      console.error('Update check failed:', err.message);
    }
  }
}

function sendStatusToWindow(status, message, data = {}) {
  const allWindows = BrowserWindow.getAllWindows();
  for (const win of allWindows) {
    win.webContents.send('update-status', { status, message, ...data });
  }
}

module.exports = { initAutoUpdater };
