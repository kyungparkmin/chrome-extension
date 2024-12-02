// Handle CORS issues
chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
        const headers = details.responseHeaders;
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].name.toLowerCase() === 'access-control-allow-origin') {
                headers[i].value = '*';
                break;
            }
        }
        return { responseHeaders: headers };
    },
    { urls: ['<all_urls>'] },
    ['blocking', 'responseHeaders']
);

// Handle environment variables
chrome.storage.local.get(['environments'], function(result) {
    if (!result.environments) {
        // Initialize with default environments
        chrome.storage.local.set({
            environments: {
                development: {
                    baseUrl: 'http://localhost:3000',
                    apiKey: ''
                },
                staging: {
                    baseUrl: 'https://staging-api.example.com',
                    apiKey: ''
                },
                production: {
                    baseUrl: 'https://api.example.com',
                    apiKey: ''
                }
            }
        });
    }
});

// Initialize history storage
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['requestHistory'], (result) => {
        if (!result.requestHistory) {
            chrome.storage.local.set({ requestHistory: [] });
        }
    });
});

// Handle history cleanup
chrome.alarms.create('cleanupHistory', { periodInMinutes: 1440 }); // Run daily

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupHistory') {
        cleanupOldHistory();
    }
});

function cleanupOldHistory() {
    chrome.storage.local.get(['requestHistory'], (result) => {
        if (result.requestHistory) {
            // Keep only last 30 days of history
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const filteredHistory = result.requestHistory.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate > thirtyDaysAgo;
            });
            
            chrome.storage.local.set({ requestHistory: filteredHistory });
        }
    });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getHistory') {
        chrome.storage.local.get(['requestHistory'], (result) => {
            sendResponse({ history: result.requestHistory || [] });
        });
        return true; // Will respond asynchronously
    }
});

// Handle request history
chrome.storage.local.get(['history'], function(result) {
    if (!result.history) {
        chrome.storage.local.set({ history: [] });
    }
});

// Handle favorites
chrome.storage.local.get(['favorites'], function(result) {
    if (!result.favorites) {
        chrome.storage.local.set({ favorites: [] });
    }
});
