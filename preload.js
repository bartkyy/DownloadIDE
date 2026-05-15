const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readDir: (path) => ipcRenderer.invoke('dir:read', path),
  openPath: (path) => ipcRenderer.invoke('file:open', path),
  openDialog: () => ipcRenderer.invoke('dialog:open-file'),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:open-dir'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),

  onMenuOpen: (callback) => ipcRenderer.on('menu:open-file', () => callback()),
  onMenuOpenFolder: (callback) => ipcRenderer.on('menu:open-folder', () => callback()),
  onMenuSave: (callback) => ipcRenderer.on('menu:save-file', () => callback())
});
