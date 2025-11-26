const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/appicon_gradient.png'),
    frame: false, // Убираем стандартную рамку Windows
    titleBarStyle: 'hidden', // Скрываем стандартный titlebar
    backgroundColor: '#111827', // Цвет фона до загрузки контента
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    show: false, // Не показывать окно до полной загрузки
  })

  // Загружаем приложение
  if (isDev) {
    // В режиме разработки загружаем из Vite dev server
    mainWindow.loadURL('http://localhost:3000')
    // Открываем DevTools в режиме разработки
    mainWindow.webContents.openDevTools()
  } else {
    // В production загружаем из собранных файлов
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Показываем окно когда готово
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Фокус на окне
    if (isDev) {
      mainWindow.focus()
    }
  })

  // Отслеживаем изменения размера окна для обновления состояния в renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false)
  })

  // Обработка закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', () => {
    if (isDev) {
      console.error('Failed to load. Make sure Vite dev server is running on http://localhost:3000')
    }
  })
}

// Когда Electron готов, создаем окно
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // На macOS пересоздаем окно при клике на иконку в dock
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Выходим когда все окна закрыты (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC обработчики для безопасной коммуникации
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

// Обработчики управления окном
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize()
  }
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close()
  }
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
})

