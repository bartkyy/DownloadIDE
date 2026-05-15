let editor;
let openFiles = {}; // { path: { model, name } }
let activePath = null;

// Funkcja pomocnicza do bezpiecznych ID (usuwa znaki typu :, \, /)
const getSafeId = (path) => "tab-" + path.replace(/[^a-zA-Z0-9]/g, '_');

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('monaco-editor'), {
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 14
  });

  // Obsługa komunikatów z Menu (Proces Główny -> Preload -> Renderer)
  window.api.onMenuOpen(() => triggerOpen());
  window.api.onMenuOpenFolder(() => triggerOpenFolder());
  window.api.onMenuSave(() => triggerSave());

  loadFolder('./'); 
});

async function triggerOpenFolder() {
  const folderPath = await window.api.openDirectoryDialog();
  if (folderPath) {
    loadFolder(folderPath);
  }
}

async function loadFolder(path) {
  const files = await window.api.readDir(path);
  const tree = document.getElementById('file-tree');
  tree.innerHTML = '';
  files.forEach(f => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerText = (f.isDirectory ? '📁 ' : '📄 ') + f.name;
    div.onclick = () => f.isDirectory ? loadFolder(f.path) : openFileFromPath(f.path, f.name);
    tree.appendChild(div);
  });
}

async function openFileFromPath(path, name) {
  if (!openFiles[path]) {
    const file = await window.api.openPath(path);
    createNewModel(file.content, file.filePath, file.fileName);
  }
  switchTab(path);
}

async function triggerOpen() {
  const file = await window.api.openDialog();
  if (file) {
    if (!openFiles[file.filePath]) {
      createNewModel(file.content, file.filePath, file.fileName);
    }
    switchTab(file.filePath);
  }
}

function createNewModel(content, path, name) {
  const model = monaco.editor.createModel(content, undefined, monaco.Uri.file(path));
  openFiles[path] = { model, name };
  
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.id = getSafeId(path); // Używamy bezpiecznego ID
  
  const nameSpan = document.createElement('span');
  nameSpan.innerText = name;
  nameSpan.onclick = (e) => { e.stopPropagation(); switchTab(path); };
  
  const closeBtn = document.createElement('div');
  closeBtn.className = 'close-tab';
  closeBtn.innerText = '✕';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    closeTab(path);
  };

  tab.appendChild(nameSpan);
  tab.appendChild(closeBtn);
  document.getElementById('tabs').appendChild(tab);
}

function closeTab(path) {
  // 1. Usuń element z DOM używając bezpiecznego ID
  const tabElement = document.getElementById(getSafeId(path));
  if (tabElement) {
    tabElement.remove();
  }

  // 2. Usuń model i dane pliku
  if (openFiles[path]) {
    openFiles[path].model.dispose();
    delete openFiles[path];
  }

  // 3. Logika przełączania zakładek
  const remainingPaths = Object.keys(openFiles);
  if (activePath === path) {
    if (remainingPaths.length > 0) {
      // Przełącz na ostatnią otwartą zakładkę
      switchTab(remainingPaths[remainingPaths.length - 1]);
    } else {
      // Jeśli to była ostatnia zakładka, wyczyść edytor
      activePath = null;
      const emptyModel = monaco.editor.createModel('', 'plaintext');
      editor.setModel(emptyModel);
    }
  }
}

function switchTab(path) {
  if (!openFiles[path]) return;
  
  activePath = path;
  editor.setModel(openFiles[path].model);
  
  // Aktualizacja stylów zakładek
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const currentTab = document.getElementById(getSafeId(path));
  if (currentTab) {
    currentTab.classList.add('active');
  }
}

async function triggerSave() {
  if (!activePath) return;
  const content = editor.getValue();
  const savedPath = await window.api.saveFile({ filePath: activePath, content });
  if (savedPath) console.log("Zapisano pomyślnie: " + savedPath);
}
