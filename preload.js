const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readDir: (path) => ipcRenderer.invoke('dir:read', path),
  openPath: (path) => ipcRenderer.invoke('file:open', path),
  openDialog: () => ipcRenderer.invoke('dialog:open-file'),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:open-dir'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  runCompiler: (code) => ipcRenderer.invoke('run-compiler', code),
  onMenuOpen: (callback) => ipcRenderer.on('menu:open-file', () => callback()),
  onMenuOpenFolder: (callback) => ipcRenderer.on('menu:open-folder', () => callback()),
  onMenuSave: (callback) => ipcRenderer.on('menu:save-file', () => callback()),
  onMenuRunCompiler: (callback) => ipcRenderer.on('menu:run-compiler', () => callback()),
  onMenuOpenProject: (callback) => ipcRenderer.on('menu:open-project', () => callback()),
  setProjectRoot: (path) => ipcRenderer.invoke('set-project-root', path),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:open-dir'),
  onToggleConsole: (callback) => ipcRenderer.on('menu:toggle-console', () => callback())
});