import sys
import re

js_path = r"c:/Users/srish/Desktop/ComputeFabric/ComputeFabricNotebook/static/js/main.js"
html_path = r"c:/Users/srish/Desktop/ComputeFabric/ComputeFabricNotebook/templates/index.html"

with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

# 1. Initialization - add loadBuffer()
init_target = """document.addEventListener('DOMContentLoaded', () => {
    logAction('Notebook environment initialized');
    addCell(); // Start with one cell"""
init_replacement = """document.addEventListener('DOMContentLoaded', () => {
    logAction('Notebook environment initialized');
    if (!loadBuffer()) {
        addCell(); // Start with one cell
    }"""
js_content = js_content.replace(init_target, init_replacement)

# 2. addCell definition and state object
addcell_target = """function addCell(index = -1, type = 'code', content = '') {
    cellCounter++;
    const id = `cell-${cellCounter}`;
    
    const cellState = {
        id,
        type,
        editor: null,
        executionCount: null
    };"""
addcell_replacement = """function addCell(index = -1, type = 'code', content = '', restoreState = null) {
    let id;
    if (restoreState) {
        id = restoreState.id;
        const num = parseInt(id.replace('cell-', ''));
        if (num > cellCounter) cellCounter = num;
    } else {
        cellCounter++;
        id = `cell-${cellCounter}`;
    }
    
    const cellState = {
        id,
        type,
        editor: null,
        executionCount: restoreState ? restoreState.executionCount : null,
        lastAgent: restoreState ? restoreState.lastAgent : null,
        lastResult: restoreState ? restoreState.lastResult : null
    };"""
js_content = js_content.replace(addcell_target, addcell_replacement)

# 3. addCell end - restore attributes and bind change event
addcellend_target = """    if (type === 'markdown') {
        document.getElementById(`prompt-in-${id}`).style.visibility = 'hidden';
    }

    setActiveCell(id);
    updateAllAgentDropdowns();
    setTimeout(() => editor.refresh(), 10);
    logAction(`Cell added (${type})`);
    return id;"""
addcellend_replacement = """    if (type === 'markdown') {
        document.getElementById(`prompt-in-${id}`).style.visibility = 'hidden';
    }

    if (restoreState) {
        if (restoreState.executionCount) {
            document.getElementById(`prompt-in-${id}`).innerText = `In [${restoreState.executionCount}]:`;
        }
        if (restoreState.lastResult) {
            renderOutputs(id, restoreState.lastResult, restoreState.executionCount);
        }
    }

    // Bind change listener to buffer but prevent execution loop if this is a restore
    editor.on('change', () => !restoreState && saveBuffer());

    setActiveCell(id);
    updateAllAgentDropdowns();
    
    if (restoreState && restoreState.type === 'markdown') {
        renderMarkdown(id, restoreState.content);
    }
    
    setTimeout(() => editor.refresh(), 10);
    logAction(`Cell added (${type})`);
    
    if (!restoreState) saveBuffer();
    return id;"""
js_content = js_content.replace(addcellend_target, addcellend_replacement)

# 4. deleteCell - saveBuffer trigger
delcell_target = """    logAction("Cell deleted");
    showToast("Cell deleted", "info");
}"""
delcell_replacement = """    logAction("Cell deleted");
    showToast("Cell deleted", "info");
    saveBuffer();
}"""
js_content = js_content.replace(delcell_target, delcell_replacement)

# 5. moveCellUp / moveCellDown - saveBuffer trigger
js_content = js_content.replace('logAction("Moved cell up");\n    }', 'logAction("Moved cell up");\n        saveBuffer();\n    }')
js_content = js_content.replace('logAction("Moved cell down");\n    }', 'logAction("Moved cell down");\n        saveBuffer();\n    }')

# 6. runCell text parsing
runcell_target = """        const data = await response.json();
        
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
        }"""
runcell_replacement = """        const data = await response.json();
        
        cell.executionCount = cellCounter; // Simulated global exec count
        cell.lastAgent = nodeId;
        cell.lastResult = data;
        
        inPrompt.innerText = `In [${cell.executionCount}]:`;
        
        renderOutputs(id, data, cell.executionCount);
        saveBuffer();"""
js_content = js_content.replace(runcell_target, runcell_replacement)

runcell_mk_target = """    if (cell.type === 'markdown') {
        renderMarkdown(id, content);
        logAction("Rendered Markdown cell");
        if (advanceFocus) advanceToNextCell(id);"""
runcell_mk_replacement = """    if (cell.type === 'markdown') {
        renderMarkdown(id, content);
        logAction("Rendered Markdown cell");
        saveBuffer();
        if (advanceFocus) advanceToNextCell(id);"""
js_content = js_content.replace(runcell_mk_target, runcell_mk_replacement)

# Type change event
change_target = """    }
    logAction(`Cell type changed to ${type}`);
}"""
change_replacement = """    }
    logAction(`Cell type changed to ${type}`);
    saveBuffer();
}"""
js_content = js_content.replace(change_target, change_replacement)

# 7. Add Persistence and Export logics block at end
persistence_block = """

// 8. Persistence & Export
function saveBuffer() {
    const state = {
        cellCounter,
        cells: cells.map(c => ({
            id: c.id,
            type: c.type,
            content: c.editor ? c.editor.getValue() : '',
            executionCount: c.executionCount,
            lastAgent: c.lastAgent,
            lastResult: c.lastResult
        }))
    };
    sessionStorage.setItem('computefabric_buffer', JSON.stringify(state));
}

function loadBuffer() {
    const raw = sessionStorage.getItem('computefabric_buffer');
    if (!raw) return false;
    try {
        const state = JSON.parse(raw);
        if (!state.cells || state.cells.length === 0) return false;
        
        state.cells.forEach(c => {
            addCell(-1, c.type, c.content, c);
        });
        
        cellCounter = state.cellCounter || cellCounter;
        return true;
    } catch {
        return false;
    }
}

function renderOutputs(id, data, executionCount) {
    const outputRow = document.getElementById(`output-row-${id}`);
    const outputArea = document.getElementById(`output-${id}`);
    const outPrompt = document.getElementById(`prompt-out-${id}`);
    
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
        outPrompt.innerText = `Out[${executionCount}]:`;
        
        if (hasOutput) {
            const textBlock = document.createElement('pre');
            textBlock.className = 'output-text';
            textBlock.textContent = data.output;
            outputArea.appendChild(textBlock);
        }
        
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
}

function downloadIpynb() {
    const notebook = {
        cells: [],
        metadata: {
            computefabric: {
                created_at: new Date().toISOString()
            }
        },
        nbformat: 4,
        nbformat_minor: 5
    };

    cells.forEach(c => {
        const cellData = {
            cell_type: c.type === 'code' ? 'code' : 'markdown',
            metadata: {
                computefabric_agent: c.lastAgent || "local"
            },
            source: c.editor.getValue().split('\\n').map((l, i, a) => l + (i < a.length - 1 ? '\\n' : ''))
        };
        
        if (c.type === 'code') {
            cellData.execution_count = c.executionCount || null;
            cellData.outputs = [];
            
            if (c.lastResult) {
                if (c.lastResult.error) {
                    cellData.outputs.push({
                        output_type: "error",
                        ename: "Error",
                        evalue: "Execution Error",
                        traceback: c.lastResult.error.split('\\n')
                    });
                }
                if (c.lastResult.output) {
                    cellData.outputs.push({
                        output_type: "stream",
                        name: "stdout",
                        text: c.lastResult.output.split('\\n').map((l, i, a) => l + (i < a.length - 1 ? '\\n' : ''))
                    });
                }
                if (c.lastResult.images && c.lastResult.images.length > 0) {
                    c.lastResult.images.forEach(img => {
                         cellData.outputs.push({
                             output_type: "display_data",
                             data: { "image/png": img },
                             metadata: {}
                         });
                    });
                }
            }
        }
        notebook.cells.push(cellData);
    });

    const blob = new Blob([JSON.stringify(notebook, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ComputeFabric.ipynb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logAction("Notebook exported to .ipynb");
}
"""
js_content += persistence_block

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"JS patched: {js_path}")

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

html_content = html_content.replace(
    'onclick="logAction(\\\'Notebook saved\\\')">Save Notebook</button>',
    'onclick="downloadIpynb()">Save Notebook</button>'
)
html_content = html_content.replace(
    '''onclick="logAction('Notebook saved'); showToast('Notebook saved successfully', 'success')"''',
    '''onclick="downloadIpynb()"'''
)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML patched: {html_path}")
