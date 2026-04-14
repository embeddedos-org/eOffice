const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('eoffice', {
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getVersion: () => ipcRenderer.invoke('get-version'),
});
