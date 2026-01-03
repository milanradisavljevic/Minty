const { contextBridge } = require('electron');

// Minimal preload - nur was wirklich nötig ist
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform
});

console.log('[Electron Preload] Initialized');
