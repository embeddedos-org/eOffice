const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eoffice', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getVersion: () => ipcRenderer.invoke('get-version'),
  openApp: (appId) => ipcRenderer.invoke('open-app', appId),
  goHome: () => ipcRenderer.invoke('go-home'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  },
});
