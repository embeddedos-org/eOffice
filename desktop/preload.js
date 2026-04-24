const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('eoffice', {
  platform: process.platform,
  isDesktop: true,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getVersion: () => ipcRenderer.invoke('get-version'),
  openApp: (appId) => ipcRenderer.invoke('open-app', appId),
  goHome: () => ipcRenderer.invoke('go-home'),
});
