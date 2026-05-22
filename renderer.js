/**
 * renderer.js - Pełna implementacja logiki frontendowej IDE
 */

let editor;
let openFiles = {}; // { path: { model, name } }
let activePath = null;
let currentProjectRoot = null;

// Funkcja pomocnicza do tworzenia bezpiecznych ID dla zakładek
const getSafeId = (path) => "tab-" + path.replace(/[^a-zA-Z0-9]/g, '_');

// Inicjalizacja Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14
    });

    // Rejestracja listenerów API
    window.api.onMenuOpen(() => triggerOpen());
    window.api.onMenuOpenFolder(() => triggerOpenFolder());
    window.api.onMenuSave(() => triggerSave());
    window.api.onToggleConsole(() => toggleConsole());

    // Obsługa Otwórz Projekt
    window.api.onMenuOpenProject(async () => {
        const folderPath = await window.api.openDirectoryDialog();
        if (folderPath) {
            currentProjectRoot = folderPath;
            await window.api.setProjectRoot(folderPath);
            loadFolder(folderPath);
        }
    });

    // Obsługa Kompilacji (Bez automatycznego przeładowania drzewa plików)
    window.api.onMenuRunCompiler(async () => {
        const code = editor.getValue();
        const result = await window.api.runCompiler(code);
        
        const consoleOutput = document.getElementById('console-output');
        if (consoleOutput) {
            consoleOutput.innerText = result;
            document.getElementById('bottom-panel').style.display = 'block';
        }
        editor.focus();
    });
});

// --- Funkcje UI i Zarządzania ---

function toggleConsole() {
    const panel = document.getElementById('bottom-panel');
    panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
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

async function triggerOpenFolder() {
    const folderPath = await window.api.openDirectoryDialog();
    if (folderPath) loadFolder(folderPath);
}

function createNewModel(content, path, name) {
    const model = monaco.editor.createModel(content, undefined, monaco.Uri.file(path));
    openFiles[path] = { model, name };
    
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = getSafeId(path);
    
    const nameSpan = document.createElement('span');
    nameSpan.innerText = name;
    nameSpan.onclick = (e) => { e.stopPropagation(); switchTab(path); };
    
    const closeBtn = document.createElement('div');
    closeBtn.className = 'close-tab';
    closeBtn.innerText = '✕';
    closeBtn.onclick = (e) => { e.stopPropagation(); closeTab(path); };

    tab.appendChild(nameSpan);
    tab.appendChild(closeBtn);
    document.getElementById('tabs').appendChild(tab);
}

function switchTab(path) {
    if (!openFiles[path]) return;
    activePath = path;
    editor.setModel(openFiles[path].model);
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const currentTab = document.getElementById(getSafeId(path));
    if (currentTab) currentTab.classList.add('active');
}

function closeTab(path) {
    const tabElement = document.getElementById(getSafeId(path));
    if (tabElement) tabElement.remove();

    if (openFiles[path]) {
        openFiles[path].model.dispose();
        delete openFiles[path];
    }

    const remainingPaths = Object.keys(openFiles);
    if (activePath === path) {
        if (remainingPaths.length > 0) {
            switchTab(remainingPaths[remainingPaths.length - 1]);
        } else {
            activePath = null;
            editor.setModel(monaco.editor.createModel('', 'plaintext'));
        }
    }
}

async function triggerSave() {
    if (!activePath) return;
    const content = editor.getValue();
    const savedPath = await window.api.saveFile({ filePath: activePath, content });
    if (savedPath) console.log("Zapisano: " + savedPath);
}

// --- Resizing Sidebar ---
const sidebar = document.getElementById('sidebar');
const resizer = document.getElementById('resizer');

resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
});

function resize(e) {
    const newWidth = e.clientX; 
    if (newWidth > 100 && newWidth < 600) {
        sidebar.style.width = newWidth + 'px';
        sidebar.style.flex = '0 0 ' + newWidth + 'px';
        window.dispatchEvent(new Event('resize')); 
    }
}

function stopResize() {
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
}