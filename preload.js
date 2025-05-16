const { contextBridge, ipcRenderer } = require('electron');

// Don't try to require compromise in the preload script
// We'll use the browser-loaded version instead

contextBridge.exposeInMainWorld('electronAPI', {
    // Data storage
    loadYuiData: () => ipcRenderer.invoke('load-yui-data'),
    saveYuiData: (data) => ipcRenderer.invoke('save-yui-data', data),
    loadSettings: () => ipcRenderer.invoke('load-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    resetAllData: () => ipcRenderer.invoke('reset-all-data'),
    
    // Gemini API Call
    callGemini: (params) => ipcRenderer.invoke('call-gemini-api', params),

    // Logging
    logMessage: (level, message, ...args) => ipcRenderer.invoke('log-message', level, message, ...args),
    readLogFile: () => ipcRenderer.invoke('read-log-file')
});