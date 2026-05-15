const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Używamy wersji z obietnicami

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Otwórz Plik', accelerator: 'CmdOrCtrl+O', click: () => win.webContents.send('menu:open-file') },
        { label: 'Otwórz Folder', click: () => win.webContents.send('menu:open-folder') },
        { type: 'separator' },
        { label: 'Zapisz', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('menu:save-file') },
        { type: 'separator' },
        { role: 'quit', label: 'Wyjdź' }
      ]
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    {
      label: 'View',
      submenu: [ { role: 'reload' }, { role: 'toggleDevTools' } ]
    },
    {
      label: 'Kompiler',
      submenu: [{label: 'Coming soon'}]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  win.loadFile('index.html');
}

// --- OBSŁUGA KOMUNIKACJI (IPC) ---

// Czytanie zawartości folderu
ipcMain.handle('dir:read', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.map(f => ({
      name: f.name,
      path: path.join(dirPath, f.name),
      isDirectory: f.isDirectory()
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
});

// Otwieranie konkretnego pliku
ipcMain.handle('file:open', async (event, filePath) => {
  const content = await fs.readFile(filePath, 'utf-8');
  return { content, filePath, fileName: path.basename(filePath) };
});

// Wywołanie systemowego okna wyboru pliku
ipcMain.handle('dialog:open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog();
  if (canceled) return null;
  const content = await fs.readFile(filePaths[0], 'utf-8');
  return { content, filePath: filePaths[0], fileName: path.basename(filePaths[0]) };
});

// Wywołanie systemowego okna wyboru folderu
ipcMain.handle('dialog:open-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (canceled) return null;
  return filePaths[0];
});

// Zapisywanie pliku
ipcMain.handle('file:save', async (event, { filePath, content }) => {
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
});

app.whenReady().then(createWindow);
