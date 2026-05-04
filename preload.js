const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readDir: (path) => ipcRenderer.invoke('read-dir', path),
  openDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  openPath: (path) => ipcRenderer.invoke('file:openPath', path),
  saveFile: (data) => ipcRenderer.invoke('file:save', data)
});