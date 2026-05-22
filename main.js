const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

let win;
// 1. Deklaracja zmiennej globalnej na samej górze
let currentProjectRoot = null;

const compilerPath = app.isPackaged
    ? path.join(process.resourcesPath, 'kompiler.exe')
    : path.join(__dirname, 'kompiler.exe');

function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false
    }
  });

  const menu = Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'Otwórz Plik', click: () => win.webContents.send('menu:open-file') },
      { label: 'Otwórz Folder', click: () => win.webContents.send('menu:open-folder') },
      { label: 'Otwórz Projekt', click: () => win.webContents.send('menu:open-project') },
      { type: 'separator' },
      { label: 'Zapisz', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('menu:save-file') }
    ]},
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }] },
    {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { label: 'Pokaż/Ukryj Konsolę', accelerator: 'Ctrl+`', click: () => win.webContents.send('menu:toggle-console') }
    ]
    },
    {
      label: 'Kompilator',
      submenu: [
        { label: 'Uruchom (F5)', accelerator: 'F5', click: () => win.webContents.send('menu:run-compiler') }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
  win.loadFile('index.html');
}

// HANDLERY
ipcMain.handle('set-project-root', (event, folderPath) => {
    currentProjectRoot = folderPath;
    console.log("Projekt ustawiony na:", currentProjectRoot);
    return currentProjectRoot;
});

ipcMain.handle('dir:read', async (event, dirPath) => {
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    return files.map(f => ({ name: f.name, path: path.join(dirPath, f.name), isDirectory: f.isDirectory() }));
  } catch (err) { return []; }
});

ipcMain.handle('file:open', async (event, filePath) => {
  return { content: fs.readFileSync(filePath, 'utf8'), filePath, fileName: path.basename(filePath) };
});

ipcMain.handle('dialog:open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (canceled) return null;
  return { content: fs.readFileSync(filePaths[0], 'utf8'), filePath: filePaths[0], fileName: path.basename(filePaths[0]) };
});

ipcMain.handle('dialog:open-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('file:save', async (event, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
});

ipcMain.handle('run-compiler', async (event, code) => {
    const projectDir = currentProjectRoot || __dirname;
    const sourceFilePath = path.join(projectDir, 'temp.txt');
    fs.writeFileSync(sourceFilePath, code, 'utf8');

    return new Promise((resolve) => {
        const command = `"${compilerPath}" "${sourceFilePath}"`;
        
        exec(command, { cwd: projectDir, shell: true }, (err, stdout, stderr) => {
            if (win) win.focus();
            resolve(err ? stderr : stdout);
        });
    });
})

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});