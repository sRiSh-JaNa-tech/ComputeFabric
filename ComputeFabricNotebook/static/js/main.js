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
async function runCell(id, advanceFocus = true, nodeId = 'current') {
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
        const url = nodeId === 'current' ? '/api/execute' : `/api/execute/${nodeId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: content })
        });
        
        const data = await response.json();
        
        cell.executionCount = cellCounter; // Simulated global exec count
        inPrompt.innerText = `In [${cell.executionCount}]:`;
        
        outputArea.innerHTML = '';
        outputArea.className = 'output-area'; 
        
        const hasOutput = data.output && data.output.trim().length > 0;
        const hasImages = data.images && data.images.length > 0;
        const hasError = !!data.error;

        if (hasError) {
            outputRow.classList.remove('hidden');
            outPrompt.innerText = '';
            outputArea.classList.add('output-error');
            outputArea.textContent = data.error;
        } else if (hasOutput || hasImages) {
            outputRow.classList.remove('hidden');
            outPrompt.innerText = `Out[${cell.executionCount}]:`;
            
            // Render text output first
            if (hasOutput) {
                const textBlock = document.createElement('pre');
                textBlock.className = 'output-text';
                textBlock.textContent = data.output;
                outputArea.appendChild(textBlock);
            }
            
            // Render images
            if (hasImages) {
                data.images.forEach((imgBase64) => {
                    const imgWrapper = document.createElement('div');
                    imgWrapper.className = 'output-image';
                    const img = document.createElement('img');
                    img.src = `data:image/png;base64,${imgBase64}`;
                    img.alt = 'Plot output';
                    imgWrapper.appendChild(img);
                    outputArea.appendChild(imgWrapper);
                });
            }
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

// 7. Agents Modal
async function fetchAndShowAgents() {
    showToast("Fetching active agents...", "info");
    
    try {
        const response = await fetch('http://localhost:5380/available');
        if (!response.ok) throw new Error("Failed to fetch");
        const json = await response.json();
        
        const agents = json.agents || [];
        showAgentsModal(agents);
    } catch (err) {
        console.error(err);
        showToast("Error connecting to CommServer.", "error");
    }
}

function showAgentsModal(agents) {
    const existing = document.getElementById('agents-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'agents-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 overflow-y-auto font-sans opacity-0 transition-opacity duration-300';
    
    let html = `
        <div class="bg-jupyter-panel border border-jupyter-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col transform scale-95 transition-transform duration-300 m-auto mt-20" id="agents-modal-box">
            <div class="flex items-center justify-between px-6 py-4 border-b border-jupyter-border bg-jupyter-panel/90 rounded-t-xl sticky top-0 z-10 backdrop-blur-md shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <svg class="w-5 h-5 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </div>
                    <h2 class="text-xl font-semibold text-white tracking-tight">Active Agents <span class="bg-jupyter-hover text-jupyter-textMuted px-2.5 py-0.5 rounded-full text-xs ml-2 align-middle font-mono border border-jupyter-border/50">${agents.length}</span></h2>
                </div>
                <button onclick="closeAgentsModal()" class="text-jupyter-textMuted hover:text-white p-2 rounded-lg hover:bg-jupyter-hover transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-1 flex flex-col gap-6 custom-scrollbar">
    `;

    if (agents.length === 0) {
        html += `
            <div class="flex flex-col items-center justify-center py-16 text-jupyter-textMuted">
                <svg class="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                <p class="text-lg font-medium">No Agents Connected</p>
                <p class="text-sm mt-1">Start comm_server nodes to see them instantly appear here.</p>
            </div>
        `;
    } else {
        agents.forEach((agent) => {
            const specs = agent.specs || {};
            const cpu = specs.CPU || {};
            const ram = specs.RAM || {};
            const os = specs.OS || {};
            const disk = (specs.Disk && specs.Disk.length > 0) ? specs.Disk[0] : {};

            const lastSeenDate = new Date(agent.lastSeen || Date.now()).toLocaleTimeString();

            html += `
                <div class="bg-jupyter-bg/50 border border-jupyter-border/50 rounded-xl overflow-hidden hover:border-jupyter-accent/40 transition-colors shadow-sm group">
                        <div class="bg-jupyter-panel/50 px-4 py-3 border-b border-jupyter-border/50 flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                                <h3 class="font-mono font-medium text-white/90">${agent.nodeId}</h3>
                            </div>
                            <div class="flex items-center gap-4">
                                <button onclick="runRemoteOnNode('${agent.nodeId}')" class="text-[11px] bg-jupyter-accent/20 hover:bg-jupyter-accent text-jupyter-accent hover:text-white px-2 py-1 rounded border border-jupyter-accent/30 transition-all font-medium uppercase tracking-wider">
                                    Run Active Cell
                                </button>
                                <div class="text-[11px] text-jupyter-textMuted font-mono">Last Ping: ${lastSeenDate}</div>
                            </div>
                        </div>
                    
                    <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm z-50">
                        <div class="bg-jupyter-panel/30 border border-jupyter-border/30 rounded-lg p-3">
                            <div class="text-xs text-jupyter-textMuted font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                                CPU Processor
                            </div>
                            <p class="text-white/80 font-medium">${cpu.manufacturer || 'Unknown'} ${cpu.brand || ''}</p>
                            <p class="text-jupyter-textMuted mt-1">${cpu.cores || '?'} Cores @ ${cpu.speed || '?'}GHz</p>
                        </div>

                        <div class="bg-jupyter-panel/30 border border-jupyter-border/30 rounded-lg p-3">
                            <div class="text-xs text-jupyter-textMuted font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                                Operating System
                            </div>
                            <p class="text-white/80 font-medium">${os.distro || 'Unknown OS'} ${os.release || ''}</p>
                            <p class="text-jupyter-textMuted mt-1">${os.platform || '?'} (${os.arch || '?'})</p>
                        </div>

                        <div class="bg-jupyter-panel/30 border border-jupyter-border/30 rounded-lg p-3">
                            <div class="text-xs text-jupyter-textMuted font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                                Memory (RAM)
                            </div>
                            <p class="text-white/80 font-medium">${ram.total ? Math.round(ram.total / (1024 ** 3)) + ' GB Total' : 'Unknown'}</p>
                            <p class="text-jupyter-textMuted mt-1">${ram.free ? Math.round(ram.free / (1024 ** 3)) + ' GB Free' : 'Unknown'}</p>
                        </div>
                        
                            <p class="text-jupyter-textMuted mt-1">${disk.size ? Math.round(disk.size / (1024 ** 3)) + ' GB Capacity' : 'Unknown (' + (disk.type || 'Drive') + ')'}</p>
                        </div>

                        <div class="bg-jupyter-panel/30 border border-jupyter-border/30 rounded-lg p-3">
                            <div class="text-xs text-jupyter-textMuted font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <svg class="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.414 8.414c5.858-5.857 15.356-5.857 21.213 0"></path></svg>
                                Network (WiFi)
                            </div>
                            <p class="text-white/80 font-medium">${specs.WiFi?.ssid || 'Ethernet/Other'}</p>
                            <p class="text-jupyter-textMuted mt-1">Signal: ${specs.WiFi?.signal || 'N/A'}</p>
                        </div>

                        <div class="bg-jupyter-panel/30 border border-jupyter-border/30 rounded-lg p-3">
                            <div class="text-xs text-jupyter-textMuted font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <svg class="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                Connection Speed
                            </div>
                            <p class="text-white/80 font-medium">${specs.Speed?.download || 'Pending...'}</p>
                            <p class="text-jupyter-textMuted mt-1">Upload: ${specs.Speed?.upload || 'Pending...'}</p>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('agents-modal-box').classList.remove('scale-95');
        document.getElementById('agents-modal-box').classList.add('scale-100');
    });
}

function closeAgentsModal() {
    const modal = document.getElementById('agents-modal');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    document.getElementById('agents-modal-box').classList.remove('scale-100');
    document.getElementById('agents-modal-box').classList.add('scale-95');
    
    setTimeout(() => {
        modal.remove();
    }, 300);
}
function runRemoteOnNode(nodeId) {
    if (!activeCellId) {
        showToast("No active cell to run", "error");
        return;
    }
    closeAgentsModal();
    runCell(activeCellId, true, nodeId);
}
