const { contextBridge, ipcRenderer } = require('electron')

// Безопасно экспортируем API в renderer процесс
contextBridge.exposeInMainWorld('electron', {
  // Информация о платформе
  platform: process.platform,
  
  // IPC методы
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Управление окном
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Слушатели событий окна
  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (_, isMaximized) => {
      callback(isMaximized)
    })
  },
  
  // Утилиты
  isElectron: true,
})

// Также добавляем флаг для проверки в коде
window.isElectron = true

