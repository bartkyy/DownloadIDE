let editor;
let openFiles = {}; // { path: { model, name } }
let activePath = null;

require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('monaco-editor'), {
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 14
  });

  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); triggerSave(); }
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); triggerOpen(); }
  });

  loadFolder('./bin'); 
});

async function triggerOpenFolder() {
  const folderPath = await window.api.openDirectoryDialog();
  if (folderPath) {
    loadFolder(folderPath); // Wykorzystujemy istniejącą funkcję loadFolder
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

// Zaktualizowana funkcja tworzenia zakładki z przyciskiem zamknięcia
function createNewModel(content, path, name) {
  const model = monaco.editor.createModel(content, undefined, monaco.Uri.file(path));
  openFiles[path] = { model, name };
  
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.id = `tab-${path}`;
  
  // Kontener na nazwę pliku
  const nameSpan = document.createElement('span');
  nameSpan.innerText = name;
  nameSpan.onclick = (e) => { e.stopPropagation(); switchTab(path); };
  
  // Przycisk zamykania
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

// Nowa funkcja zamykania zakładki
function closeTab(path) {
  // 1. Usuń model z Monaco, aby zwolnić pamięć
  if (openFiles[path]) {
    openFiles[path].model.dispose();
    delete openFiles[path];
  }

  // 2. Usuń element DOM zakładki
  const tabElement = document.getElementById(`tab-${path}`);
  if (tabElement) tabElement.remove();

  // 3. Logika przełączania po zamknięciu
  const remainingPaths = Object.keys(openFiles);
  if (activePath === path) {
    if (remainingPaths.length > 0) {
      switchTab(remainingPaths[remainingPaths.length - 1]);
    } else {
      activePath = null;
      editor.setModel(monaco.editor.createModel('', 'plaintext')); // Pusty edytor
      document.getElementById('file-info').innerText = 'Brak pliku';
    }
  }
}

function switchTab(path) {
  activePath = path;
  editor.setModel(openFiles[path].model);
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${path}`).classList.add('active');
}

async function triggerSave() {
  if (!activePath) return;
  const content = editor.getValue();
  const savedPath = await window.api.saveFile({ filePath: activePath, content });
  if (savedPath) console.log("Zapisano: " + savedPath);
}