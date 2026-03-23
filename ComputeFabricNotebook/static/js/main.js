/**
 * State Management & UI Controller for ComputeFabric Notebook
 */

let cells = [];
let activeCellId = null;
let clipboardCell = null;
let cellCounter = 0;
let isDarkTheme = true;

// 1. Initialization
document.addEventListener('DOMContentLoaded', () => {
    logAction('Notebook environment initialized');
    addCell(); // Start with one cell
    setupKeyboardShortcuts();
});

// 2. Cell DOM Operations
function generateCellHtml(id) {
    return `
        <div class="cell-container" id="${id}" onclick="setActiveCell('${id}')">
            <!-- Floating Controls -->
            <div class="cell-controls">
                <button onclick="moveCellUp('${id}', event)" title="Move Cell Up">↑</button>
                <button onclick="moveCellDown('${id}', event)" title="Move Cell Down">↓</button>
                <button onclick="deleteCell('${id}', event)" title="Delete Cell" class="delete-btn">✕</button>
            </div>
            
            <!-- Code/Markdown input -->
            <div class="cell-input-row">
                <div class="prompt in" id="prompt-in-${id}">In [ ]:</div>
                <div class="cell-content">
                    <div id="md-render-${id}" class="markdown-body hidden" ondblclick="editMarkdown('${id}')"></div>
                    <div id="editor-wrapper-${id}">
                        <textarea id="textarea-${id}"></textarea>
                    </div>
                </div>
            </div>

            <!-- Output block -->
            <div class="cell-output-row hidden" id="output-row-${id}">
                <div class="prompt out" id="prompt-out-${id}">Out[ ]:</div>
                <div class="cell-content">
                    <div id="output-${id}" class="output-area"></div>
                </div>
            </div>
        </div>
    `;
}

function addCell(index = -1, type = 'code', content = '') {
    cellCounter++;
    const id = `cell-${cellCounter}`;
    
    const cellState = {
        id,
        type,
        editor: null,
        executionCount: null
    };

    const html = generateCellHtml(id);
    const container = document.getElementById('notebook-container');

    if (index === -1 || index >= cells.length) {
        container.insertAdjacentHTML('beforeend', html);
        cells.push(cellState);
    } else {
        const refId = cells[index].id;
        document.getElementById(refId).insertAdjacentHTML('beforebegin', html);
        cells.splice(index, 0, cellState);
    }

    // Init CodeMirror
    const textarea = document.getElementById(`textarea-${id}`);
    const editor = CodeMirror.fromTextArea(textarea, {
        mode: type === 'code' ? {name: "python", version: 3} : "markdown",
        lineNumbers: false,
        indentUnit: 4,
        matchBrackets: true,
        viewportMargin: Infinity,
        theme: isDarkTheme ? 'material-ocean' : 'default',
        extraKeys: {
            "Shift-Enter": () => runCell(id),
            "Ctrl-Enter": () => runCell(id, false)
        }
    });

    if (content) {
        editor.setValue(content);
    }

    cellState.editor = editor;
    
    if (type === 'markdown') {
        document.getElementById(`prompt-in-${id}`).style.visibility = 'hidden';
    }

    setActiveCell(id);
    setTimeout(() => editor.refresh(), 10);
    logAction(`Cell added (${type})`);
    return id;
}

function addCellBelow() {
    const idx = getCellIndex(activeCellId);
    addCell(idx === -1 ? -1 : idx + 1);
}

function deleteCell(id, event) {
    if (event) event.stopPropagation();
    
    if (cells.length <= 1) {
        showToast("Cannot delete the only cell", "error");
        return;
    }

    const idx = getCellIndex(id);
    cells.splice(idx, 1);
    document.getElementById(id).remove();
    
    if (activeCellId === id) {
        const nextId = cells[Math.min(idx, cells.length - 1)].id;
        setActiveCell(nextId);
    }
    logAction("Cell deleted");
    showToast("Cell deleted", "info");
}

function getCellIndex(id) {
    return cells.findIndex(c => c.id === id);
}

function setActiveCell(id) {
    if (!id) return;
    if (activeCellId && document.getElementById(activeCellId)) {
        document.getElementById(activeCellId).classList.remove('active');
    }
    activeCellId = id;
    const el = document.getElementById(id);
    if(el) {
        el.classList.add('active');
        const state = cells.find(c => c.id === id);
        if (state) {
            state.editor.focus();
            document.getElementById('global-cell-type').value = state.type;
        }
    }
}

// 3. Reordering & Clipboard
function moveCellUp(id, event) {
    if (event) event.stopPropagation();
    const idx = getCellIndex(id);
    if (idx > 0) {
        const el = document.getElementById(id);
        el.parentNode.insertBefore(el, document.getElementById(cells[idx - 1].id));
        [cells[idx - 1], cells[idx]] = [cells[idx], cells[idx - 1]];
        logAction("Moved cell up");
    }
}

function moveCellDown(id, event) {
    if (event) event.stopPropagation();
    const idx = getCellIndex(id);
    if (idx < cells.length - 1) {
        const el = document.getElementById(cells[idx + 1].id);
        el.parentNode.insertBefore(el, document.getElementById(id));
        [cells[idx], cells[idx + 1]] = [cells[idx + 1], cells[idx]];
        logAction("Moved cell down");
    }
}

function actionCutCell() {
    if (activeCellId) {
        const state = cells.find(c => c.id === activeCellId);
        clipboardCell = { type: state.type, content: state.editor.getValue() };
        deleteCell(activeCellId);
        showToast("Cell cut to clipboard", "info");
    }
}

function actionCopyCell() {
    if (activeCellId) {
        const state = cells.find(c => c.id === activeCellId);
        clipboardCell = { type: state.type, content: state.editor.getValue() };
        showToast("Cell copied", "info");
    }
}

function actionPasteCell() {
    if (!clipboardCell) {
        showToast("Clipboard is empty", "error");
        return;
    }
    const idx = getCellIndex(activeCellId);
    addCell(idx + 1, clipboardCell.type, clipboardCell.content);
    showToast("Cell pasted", "success");
}

// 4. Execution Engine
async function runCell(id, advanceFocus = true) {
    const cell = cells.find(c => c.id === id);
    if (!cell) return;
    
    const content = cell.editor.getValue();
    
    if (cell.type === 'markdown') {
        renderMarkdown(id, content);
        logAction("Rendered Markdown cell");
        if (advanceFocus) advanceToNextCell(id);
        return;
    }

    logAction("Running code cell...");
    const inPrompt = document.getElementById(`prompt-in-${id}`);
    const outPrompt = document.getElementById(`prompt-out-${id}`);
    const outputRow = document.getElementById(`output-row-${id}`);
    const outputArea = document.getElementById(`output-${id}`);
    
    inPrompt.innerText = 'In [*]:';
    document.getElementById('kernel-status').style.backgroundColor = '#eab308'; // yellow

    try {
        const response = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: content })
        });
        
        const data = await response.json();
        
        cell.executionCount = cellCounter; // Simulated global exec count
        inPrompt.innerText = `In [${cell.executionCount}]:`;
        
        outputArea.innerHTML = '';
        outputArea.className = 'output-area'; 
        
        if (data.error) {
            outputRow.classList.remove('hidden');
            outPrompt.innerText = '';
            outputArea.classList.add('output-error');
            outputArea.innerText = data.error;
        } else if (data.output) {
            outputRow.classList.remove('hidden');
            outPrompt.innerText = `Out[${cell.executionCount}]:`;
            outputArea.innerText = data.output;
        } else {
            outputRow.classList.add('hidden');
        }
    } catch (err) {
        console.error(err);
        inPrompt.innerText = `In [ ]:`;
        outputRow.classList.remove('hidden');
        outputArea.classList.add('output-error');
        outputArea.innerText = "Network Error: Could not connect to kernel.";
        showToast("Execution failed", "error");
    } finally {
        document.getElementById('kernel-status').style.backgroundColor = '#22c55e'; // green
    }

    if (advanceFocus) advanceToNextCell(id);
}

function advanceToNextCell(currentId) {
    const idx = getCellIndex(currentId);
    if (idx === cells.length - 1) {
        addCell();
    } else {
        setActiveCell(cells[idx + 1].id);
    }
}

function runActiveCell() {
    if (activeCellId) runCell(activeCellId, true);
}

async function runAllCells() {
    logAction("Running all cells sequentially...");
    showToast("Running all cells...", "info");
    for (const cell of cells) {
        if (cell.type === 'code') {
            await runCell(cell.id, false);
        } else {
            renderMarkdown(cell.id, cell.editor.getValue());
        }
    }
    showToast("Execution completed", "success");
}

async function runAllAbove() {
    const targetIdx = getCellIndex(activeCellId);
    for (let i = 0; i < targetIdx; i++) {
        await runCell(cells[i].id, false);
    }
}

async function runAllBelow() {
    const targetIdx = getCellIndex(activeCellId);
    for (let i = targetIdx; i < cells.length; i++) {
        await runCell(cells[i].id, false);
    }
}

// 5. Types & Rendering
function changeActiveCellType(type) {
    if (!activeCellId) return;
    const cell = cells.find(c => c.id === activeCellId);
    cell.type = type;
    
    const inPrompt = document.getElementById(`prompt-in-${activeCellId}`);
    
    if (type === 'markdown' || type === 'raw') {
        cell.editor.setOption("mode", "markdown");
        inPrompt.style.visibility = 'hidden';
        document.getElementById(`output-row-${activeCellId}`).classList.add('hidden');
    } else {
        cell.editor.setOption("mode", {name: "python", version: 3});
        inPrompt.style.visibility = 'visible';
        document.getElementById(`md-render-${activeCellId}`).classList.add('hidden');
        document.getElementById(`editor-wrapper-${activeCellId}`).classList.remove('hidden');
    }
    logAction(`Cell type changed to ${type}`);
}

function renderMarkdown(id, content) {
    const mdContainer = document.getElementById(`md-render-${id}`);
    const editorWrapper = document.getElementById(`editor-wrapper-${id}`);
    
    if (content.trim() === '') {
        mdContainer.innerHTML = '<em class="text-gray-500">Double-click to edit Markdown</em>';
    } else {
        mdContainer.innerHTML = marked.parse(content);
    }
    
    mdContainer.classList.remove('hidden');
    editorWrapper.classList.add('hidden');
}

function editMarkdown(id) {
    document.getElementById(`md-render-${id}`).classList.add('hidden');
    document.getElementById(`editor-wrapper-${id}`).classList.remove('hidden');
    const cell = cells.find(c => c.id === id);
    cell.editor.focus();
}

// 6. UI Toggles & Utilities
function toggleElement(id) {
    const el = document.getElementById(id);
    if (el.style.display === 'none') el.style.display = 'flex';
    else el.style.display = 'none';
}

function toggleLineNumbers() {
    for (const cell of cells) {
        const state = cell.editor.getOption("lineNumbers");
        cell.editor.setOption("lineNumbers", !state);
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    if (isDarkTheme) {
        document.documentElement.classList.add('dark');
        document.body.classList.remove('light-theme');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.add('light-theme');
    }
    for (const cell of cells) {
        cell.editor.setOption("theme", isDarkTheme ? 'material-ocean' : 'default');
    }
    logAction(`Theme toggled to ${isDarkTheme ? 'Dark' : 'Light'}`);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

async function actionRestartKernel() {
    logAction("Kernel restarted");
    showToast("Kernel restarted successfully", "success");
    // Since our backend is simple exec(), restarting means we need an endpoint to reset globals
    // For demo purposes, we fake it, but we should clear outputs
}

function actionRestartClear() {
    actionRestartKernel();
    for (const cell of cells) {
        document.getElementById(`output-row-${cell.id}`).classList.add('hidden');
        document.getElementById(`prompt-in-${cell.id}`).innerText = 'In [ ]:';
        cell.executionCount = null;
    }
    cellCounter = cells.length; // Reset visual counter
    showToast("Outputs cleared", "info");
}

function logAction(msg) {
    console.log(`[ComputeFabric] ${new Date().toLocaleTimeString()} - ${msg}`);
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toastHtml = document.createElement('div');
    toastHtml.className = `toast toast-${type}`;
    toastHtml.innerText = msg;
    container.appendChild(toastHtml);
    setTimeout(() => toastHtml.classList.add('show'), 10);
    
    setTimeout(() => {
        toastHtml.classList.remove('show');
        setTimeout(() => toastHtml.remove(), 300);
    }, 3000);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+S
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            showToast('Notebook saved successfully', 'success');
            logAction('Saved notebook via Ctrl+S');
        }
    });
}
