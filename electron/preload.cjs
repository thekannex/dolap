// Arayüze yalnızca güncelleme işlemlerini açar (Node erişimi verilmez).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dolapUpdate', {
  getState: () => ipcRenderer.invoke('update:state'),
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  openPage: () => ipcRenderer.invoke('update:open-page'),
  onState: (cb) => {
    const handler = (_event, state) => cb(state);
    ipcRenderer.on('update:state', handler);
    return () => ipcRenderer.removeListener('update:state', handler);
  },
});
