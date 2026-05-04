const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "IDE",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

// Obsługa drzewa plików
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    return files.map(f => ({
      name: f.name,
      path: path.join(dirPath, f.name),
      isDirectory: f.isDirectory()
    }));
  } catch (err) {
    return [];
  }
});

// main.js - dodaj to do reszty ipcMain
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled) return null;
  return filePaths[0]; // Zwraca ścieżkę do wybranego folderu
});

// Otwieranie pliku przez dialog
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Kod źródłowy', extensions: ['js', 'html', 'css','kern', 'json', 'txt'] }]
  });
  if (canceled) return null;
  const content = fs.readFileSync(filePaths[0], 'utf8');
  return { content, filePath: filePaths[0], fileName: path.basename(filePaths[0]) };
});

// Otwieranie pliku ze ścieżki (z drzewa)
ipcMain.handle('file:openPath', async (event, filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  return { content, filePath, fileName: path.basename(filePath) };
});

// Zapisywanie pliku
ipcMain.handle('file:save', async (event, { filePath, content }) => {
  let savePath = filePath;
  if (!savePath) {
    const { canceled, filePath: newPath } = await dialog.showSaveDialog();
    if (canceled) return null;
    savePath = newPath;
  }
  fs.writeFileSync(savePath, content);
  return savePath;
});

app.whenReady().then(createWindow);