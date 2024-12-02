document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const methodSelect = document.getElementById('method');
    const urlInput = document.getElementById('url');
    const sendButton = document.getElementById('send');
    const tabButtons = document.querySelectorAll('.tab-button');
    const responseData = document.getElementById('response-data');
    const statusElement = document.getElementById('status');
    const timeElement = document.getElementById('time');
    const requestBody = document.getElementById('request-body');

    // Load saved state
    function loadSavedState() {
        chrome.storage.local.get(['savedState'], (result) => {
            if (result.savedState) {
                // Restore basic fields
                methodSelect.value = result.savedState.method || 'GET';
                urlInput.value = result.savedState.url || '';
                requestBody.value = result.savedState.body || '';
                
                // Restore headers
                if (result.savedState.headers && result.savedState.headers.length > 0) {
                    const headerContainer = document.querySelector('.headers-container');
                    headerContainer.innerHTML = ''; // Clear default row
                    
                    result.savedState.headers.forEach(header => {
                        const row = createHeaderRow(header.key, header.value);
                        headerContainer.appendChild(row);
                    });
                    
                    // Add an empty row if there are no headers
                    if (result.savedState.headers.length === 0) {
                        headerContainer.appendChild(createHeaderRow());
                    }
                }

                // Restore params
                if (result.savedState.params && result.savedState.params.length > 0) {
                    const paramsContainer = document.querySelector('.params-container');
                    paramsContainer.innerHTML = ''; // Clear default row
                    
                    result.savedState.params.forEach(param => {
                        const row = createParamRow(param.key, param.value);
                        paramsContainer.appendChild(row);
                    });
                    
                    // Add an empty row if there are no params
                    if (result.savedState.params.length === 0) {
                        paramsContainer.appendChild(createParamRow());
                    }
                }
            }
        });
    }

    // Create header row with optional initial values
    function createHeaderRow(key = '', value = '') {
        const row = document.createElement('div');
        row.className = 'header-row';
        row.innerHTML = `
            <input type="text" placeholder="Key" class="header-key" value="${key}" />
            <input type="text" placeholder="Value" class="header-value" value="${value}" />
            <button class="add-header">+</button>
        `;
        
        const addButton = row.querySelector('.add-header');
        addButton.addEventListener('click', () => {
            const newRow = createHeaderRow();
            row.parentNode.appendChild(newRow);
            addButton.textContent = '-';
            addButton.className = 'remove-header';
            addButton.onclick = () => {
                row.remove();
                saveState();
            };
        });
        
        return row;
    }

    // Create param row with optional initial values
    function createParamRow(key = '', value = '') {
        const row = document.createElement('div');
        row.className = 'param-row';
        row.innerHTML = `
            <input type="text" placeholder="Key" class="param-key" value="${key}" />
            <input type="text" placeholder="Value" class="param-value" value="${value}" />
            <button class="add-param">+</button>
        `;
        
        const addButton = row.querySelector('.add-param');
        addButton.addEventListener('click', () => {
            const newRow = createParamRow();
            row.parentNode.appendChild(newRow);
            addButton.textContent = '-';
            addButton.className = 'remove-param';
            addButton.onclick = () => {
                row.remove();
                saveState();
            };
        });
        
        return row;
    }

    // Save state function
    function saveState() {
        const state = {
            method: methodSelect.value,
            url: urlInput.value,
            body: requestBody.value,
            headers: [],
            params: []
        };

        // Save headers
        document.querySelectorAll('.header-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            if (key || value) {
                state.headers.push({ key, value });
            }
        });

        // Save params
        document.querySelectorAll('.param-row').forEach(row => {
            const key = row.querySelector('.param-key').value.trim();
            const value = row.querySelector('.param-value').value.trim();
            if (key || value) {
                state.params.push({ key, value });
            }
        });

        chrome.storage.local.set({ savedState: state });
    }

    // Add input event listeners to save state
    methodSelect.addEventListener('change', saveState);
    urlInput.addEventListener('input', saveState);
    requestBody.addEventListener('input', saveState);

    // Add input event listeners to all dynamic inputs
    document.addEventListener('input', (e) => {
        if (e.target.matches('.param-key, .param-value, .header-key, .header-value')) {
            saveState();
        }
    });

    // Initial load of saved state
    loadSavedState();

    // Tab handling
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active tab content
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(tabName)?.classList.add('active');
        });
    });

    // History functionality
    const historyList = document.querySelector('.history-list');
    const clearHistoryBtn = document.getElementById('clear-history');

    // Load history
    function loadHistory() {
        chrome.storage.local.get(['requestHistory'], (result) => {
            const history = result.requestHistory || [];
            historyList.innerHTML = '';
            
            history.forEach((item, index) => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                
                const time = new Date(item.timestamp);
                const timeString = time.toLocaleString();
                
                historyItem.innerHTML = `
                    <div class="history-item-content">
                        <div class="history-item-header">
                            <span class="history-method ${item.method.toLowerCase()}">${item.method}</span>
                            <span class="history-time">${timeString}</span>
                        </div>
                        <div class="history-url">${item.url}</div>
                        <div class="history-status ${item.status >= 200 && item.status < 300 ? 'success' : 'error'}">
                            Status: ${item.status} (${item.responseTime}ms)
                        </div>
                    </div>
                    <button class="delete-history-item" title="Delete this item">×</button>
                `;
                
                // 히스토리 항목 클릭 시 요청 복원
                const content = historyItem.querySelector('.history-item-content');
                content.addEventListener('click', () => {
                    restoreRequest(item);
                });
                
                // 삭제 버튼 클릭 시 해당 항목만 삭제
                const deleteBtn = historyItem.querySelector('.delete-history-item');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 부모 요소의 클릭 이벤트 방지
                    if (confirm('이 히스토리 항목을 삭제하시겠습니까?')) {
                        deleteHistoryItem(index);
                    }
                });
                
                historyList.appendChild(historyItem);
            });
        });
    }

    // 단일 히스토리 항목 삭제
    function deleteHistoryItem(index) {
        chrome.storage.local.get(['requestHistory'], (result) => {
            const history = result.requestHistory || [];
            history.splice(index, 1); // 해당 인덱스의 항목만 삭제
            chrome.storage.local.set({ requestHistory: history }, () => {
                loadHistory(); // 히스토리 목록 새로고침
            });
        });
    }

    // Clear all history
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all history?')) {
            chrome.storage.local.set({ requestHistory: [] }, () => {
                loadHistory();
            });
        }
    });

    // Save request to history
    function saveToHistory(request, response, responseTime) {
        chrome.storage.local.get(['requestHistory'], (result) => {
            const history = result.requestHistory || [];
            
            const historyItem = {
                method: request.method,
                url: request.url,
                headers: request.headers,
                body: request.body,
                params: request.params,
                status: response.status,
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            };
            
            history.unshift(historyItem);
            
            // Keep only last 50 requests
            if (history.length > 50) {
                history.pop();
            }
            
            chrome.storage.local.set({ requestHistory: history }, () => {
                loadHistory();
            });
        });
    }

    // Restore request from history
    function restoreRequest(historyItem) {
        // Restore method
        methodSelect.value = historyItem.method;
        
        // Restore URL
        urlInput.value = historyItem.url;
        
        // Restore headers
        const headerContainer = document.querySelector('.headers-container');
        headerContainer.innerHTML = '';
        if (historyItem.headers) {
            Object.entries(historyItem.headers).forEach(([key, value]) => {
                const row = createHeaderRow(key, value);
                headerContainer.appendChild(row);
            });
        }
        headerContainer.appendChild(createHeaderRow()); // Add empty row
        
        // Restore params
        const paramsContainer = document.querySelector('.params-container');
        paramsContainer.innerHTML = '';
        if (historyItem.params) {
            Object.entries(historyItem.params).forEach(([key, value]) => {
                const row = createParamRow(key, value);
                paramsContainer.appendChild(row);
            });
        }
        paramsContainer.appendChild(createParamRow()); // Add empty row
        
        // Restore body
        requestBody.value = historyItem.body || '';
        
        // Save restored state
        saveState();
    }

    // Load history on startup
    loadHistory();

    // Send request handler
    sendButton.addEventListener('click', async () => {
        const startTime = performance.now();
        
        // Collect request data
        const request = {
            method: methodSelect.value,
            url: urlInput.value,
            headers: {},
            params: {},
            body: requestBody.value
        };

        // Collect headers
        document.querySelectorAll('.header-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            if (key && value) {
                request.headers[key] = value;
            }
        });

        // Collect params
        const params = new URLSearchParams();
        document.querySelectorAll('.param-row').forEach(row => {
            const key = row.querySelector('.param-key').value.trim();
            const value = row.querySelector('.param-value').value.trim();
            if (key && value) {
                params.append(key, value);
                request.params[key] = value;
            }
        });

        // Add params to URL
        let finalUrl = request.url;
        const queryString = params.toString();
        if (queryString) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
        }

        try {
            const response = await fetch(finalUrl, {
                method: request.method,
                headers: request.headers,
                body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? request.body : null
            });

            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            // Update status and time
            statusElement.textContent = `${response.status} ${response.statusText}`;
            statusElement.style.backgroundColor = response.ok ? '#4CAF50' : '#f44336';
            timeElement.textContent = `${responseTime}ms`;

            // Display response
            const responseText = await response.text();
            try {
                const jsonResponse = JSON.parse(responseText);
                responseData.textContent = JSON.stringify(jsonResponse, null, 2);
            } catch {
                responseData.textContent = responseText;
            }

            // Save to history
            saveToHistory(request, response, responseTime);

        } catch (error) {
            statusElement.textContent = 'Error';
            statusElement.style.backgroundColor = '#f44336';
            responseData.textContent = error.message;
        }
    });

    // JWT Decoder
    function decodeJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT format');
            
            const payload = JSON.parse(atob(parts[1]));
            return JSON.stringify(payload, null, 2);
        } catch (error) {
            return 'Invalid JWT token';
        }
    }

    // Add JWT decoder functionality to Authorization header
    document.querySelectorAll('.header-row').forEach(row => {
        const keyInput = row.querySelector('.header-key');
        const valueInput = row.querySelector('.header-value');
        
        keyInput.addEventListener('change', () => {
            if (keyInput.value.toLowerCase() === 'authorization') {
                valueInput.addEventListener('change', () => {
                    const token = valueInput.value.replace('Bearer ', '');
                    console.log('Decoded JWT:', decodeJWT(token));
                });
            }
        });
    });

    // Export/Import functionality
    window.exportRequest = () => {
        const request = {
            method: methodSelect.value,
            url: urlInput.value,
            headers: {},
            params: {},
            body: requestBody.value
        };

        // Collect headers and params
        document.querySelectorAll('.header-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            if (key && value) request.headers[key] = value;
        });

        document.querySelectorAll('.param-row').forEach(row => {
            const key = row.querySelector('.param-key').value.trim();
            const value = row.querySelector('.param-value').value.trim();
            if (key && value) request.params[key] = value;
        });

        const blob = new Blob([JSON.stringify(request, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'api-request.json';
        a.click();
        
        URL.revokeObjectURL(url);
    };

    // Code generation functionality
    const modal = document.getElementById('code-modal');
    const generateCodeBtn = document.getElementById('generate-code');
    const closeBtn = document.querySelector('.close');
    const copyCodeBtn = document.getElementById('copy-code');
    const languageBtns = document.querySelectorAll('.language-btn');
    const generatedCodeElement = document.getElementById('generated-code');

    // Show modal
    generateCodeBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        generateCode('javascript'); // Default to JavaScript
    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Language selection
    languageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            languageBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            generateCode(btn.getAttribute('data-lang'));
        });
    });

    // Copy code
    copyCodeBtn.addEventListener('click', () => {
        const code = generatedCodeElement.textContent;
        navigator.clipboard.writeText(code).then(() => {
            const originalText = copyCodeBtn.textContent;
            copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyCodeBtn.textContent = originalText;
            }, 2000);
        });
    });

    function generateCode(language) {
        const url = urlInput.value;
        const method = methodSelect.value;
        const headers = {};
        let body = requestBody.value;

        // Collect headers
        document.querySelectorAll('.header-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            if (key && value) {
                headers[key] = value;
            }
        });

        // Collect query parameters
        const params = new URLSearchParams();
        document.querySelectorAll('.param-row').forEach(row => {
            const key = row.querySelector('.param-key').value.trim();
            const value = row.querySelector('.param-value').value.trim();
            if (key && value) {
                params.append(key, value);
            }
        });

        // Add query parameters to URL
        const queryString = params.toString();
        const finalUrl = queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url;

        // Try to parse body as JSON
        try {
            if (body) {
                body = JSON.parse(body);
            }
        } catch (e) {
            // If parsing fails, use as is
        }

        let code = '';
        
        if (language === 'javascript') {
            code = `// Using Fetch API
const options = {
    method: '${method}',
    headers: ${JSON.stringify(headers, null, 4)},
    ${body ? `body: JSON.stringify(${JSON.stringify(body, null, 4)})` : ''}
};

fetch('${finalUrl}', options)
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch(error => {
        console.error('Error:', error);
    });

// Using Axios
axios({
    method: '${method.toLowerCase()}',
    url: '${finalUrl}',
    headers: ${JSON.stringify(headers, null, 4)},
    ${body ? `data: ${JSON.stringify(body, null, 4)}` : ''}
})
    .then(response => {
        console.log('Success:', response.data);
    })
    .catch(error => {
        console.error('Error:', error);
    });`;
        } else if (language === 'python') {
            code = `# Using requests
import requests

url = '${finalUrl}'
headers = ${JSON.stringify(headers, null, 4)}
${body ? `data = ${JSON.stringify(body, null, 4)}` : ''}

response = requests.${method.toLowerCase()}(
    url,
    headers=headers,
    ${body ? 'json=data' : ''}
)

try:
    print('Status:', response.status_code)
    print('Response:', response.json())
except requests.exceptions.RequestException as e:
    print('Error:', e)

# Using httpx (async)
import httpx
import asyncio

async def make_request():
    async with httpx.AsyncClient() as client:
        response = await client.${method.toLowerCase()}(
            '${finalUrl}',
            headers=${JSON.stringify(headers, null, 4)},
            ${body ? `json=${JSON.stringify(body, null, 4)}` : ''}
        )
        return response

async def main():
    try:
        response = await make_request()
        print('Status:', response.status_code)
        print('Response:', response.json())
    except httpx.RequestError as e:
        print('Error:', e)

asyncio.run(main())`;
        }

        generatedCodeElement.textContent = code;
    }
});
