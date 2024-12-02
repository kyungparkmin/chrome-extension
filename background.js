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
