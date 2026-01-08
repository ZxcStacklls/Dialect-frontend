const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// Проверяем, существует ли production сборка
const distPath = path.join(__dirname, '../dist/index.html')
const hasProductionBuild = fs.existsSync(distPath)

// Используем dev-сервер только если явно указано USE_DEV_SERVER=true
// Иначе используем production сборку (если она есть)
const useDevServer = process.env.USE_DEV_SERVER === 'true'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/nayte_icon.png'),
    frame: false, // Убираем стандартную рамку Windows
    titleBarStyle: 'hidden', // Скрываем стандартный titlebar
    backgroundColor: '#111827', // Цвет фона до загрузки контента
    fullscreenable: false, // Отключаем возможность полноэкранного режима
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    show: false, // Не показывать окно до полной загрузки
  })

  // Скрываем меню для дополнительной защиты
  mainWindow.setMenuBarVisibility(false)

  // Загружаем приложение
  if (useDevServer) {
    // В режиме разработки загружаем из Vite dev server (только если явно указано)
    mainWindow.loadURL('http://localhost:3000')
    // DevTools отключены - можно открыть вручную через F12 или Ctrl+Shift+I
    // mainWindow.webContents.openDevTools()
  } else {
    // По умолчанию загружаем из production сборки
    const indexPath = path.join(__dirname, '../dist/index.html')
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath)
    } else {
      // Если сборки нет, показываем ошибку
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
          document.body.innerHTML = \`
            <div style="
              width: 100%;
              height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: linear-gradient(to bottom right, #111827, #1f2937, #111827);
              color: white;
              padding: 20px;
              text-align: center;
            ">
              <h1 style="font-size: 24px; margin-bottom: 16px;">Сборка не найдена</h1>
              <p style="margin-bottom: 8px; color: #9ca3af;">
                Production сборка не найдена в папке dist/
              </p>
              <p style="margin-bottom: 16px; color: #9ca3af; font-size: 14px;">
                Запустите: <code style="background: #1f2937; padding: 2px 6px; border-radius: 4px;">npm run build</code>
              </p>
            </div>
          \`
        `).catch(console.error)
      })
    }
  }

  // Показываем окно когда готово
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Фокус на окне
    mainWindow.focus()
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

  // Блокируем полноэкранный режим (F11) - усиленная защита
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Блокируем F11 для перехода в полноэкранный режим
    if (input.key === 'F11' || input.key === 'f11' || input.keyCode === 122) {
      event.preventDefault()
      return false
    }
    // Также блокируем Alt+Enter (альтернативный способ)
    if (input.alt && (input.key === 'Enter' || input.keyCode === 13)) {
      event.preventDefault()
      return false
    }
  })

  // Дополнительная защита от полноэкранного режима
  mainWindow.on('enter-full-screen', () => {
    mainWindow.setFullScreen(false)
  })

  mainWindow.on('enter-html-full-screen', () => {
    mainWindow.setFullScreen(false)
  })

  mainWindow.on('will-enter-full-screen', () => {
    mainWindow.setFullScreen(false)
  })

  // Блокируем через webContents события - внедряем скрипт в DOM
  mainWindow.webContents.on('dom-ready', () => {
    // Внедряем скрипт для блокировки F11 в DOM
    mainWindow.webContents.executeJavaScript(`
      (function() {
        // Блокируем F11 через обработчики событий
        const blockF11 = function(e) {
          if (e.key === 'F11' || e.keyCode === 122) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
          }
        };
        
        // Добавляем обработчики с capture фазой (самый ранний этап)
        document.addEventListener('keydown', blockF11, { capture: true, passive: false });
        document.addEventListener('keyup', blockF11, { capture: true, passive: false });
        window.addEventListener('keydown', blockF11, { capture: true, passive: false });
        window.addEventListener('keyup', blockF11, { capture: true, passive: false });
        
        // Блокируем через fullscreen API
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen = function() {
            console.warn('Fullscreen is disabled');
            return Promise.reject(new Error('Fullscreen is disabled'));
          };
        }
        
        if (document.exitFullscreen) {
          const originalExitFullscreen = document.exitFullscreen;
          document.exitFullscreen = function() {
            console.warn('Fullscreen is disabled');
            return Promise.reject(new Error('Fullscreen is disabled'));
          };
        }
        
        // Блокируем webkit fullscreen
        if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen = function() {
            console.warn('Fullscreen is disabled');
            return Promise.reject(new Error('Fullscreen is disabled'));
          };
        }
        
        // Блокируем moz fullscreen
        if (document.documentElement.mozRequestFullScreen) {
          document.documentElement.mozRequestFullScreen = function() {
            console.warn('Fullscreen is disabled');
            return Promise.reject(new Error('Fullscreen is disabled'));
          };
        }
        
        // Блокируем ms fullscreen
        if (document.documentElement.msRequestFullscreen) {
          document.documentElement.msRequestFullscreen = function() {
            console.warn('Fullscreen is disabled');
            return Promise.reject(new Error('Fullscreen is disabled'));
          };
        }
      })();
    `).catch(console.error)
  })

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (useDevServer) {
      console.error('Failed to load. Make sure Vite dev server is running on http://localhost:3000')
      console.error('Error code:', errorCode, 'Description:', errorDescription)
      
      // Показываем окно с ошибкой
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = \`
          <div style="
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(to bottom right, #111827, #1f2937, #111827);
            color: white;
            padding: 20px;
            text-align: center;
          ">
            <h1 style="font-size: 24px; margin-bottom: 16px;">Не удалось загрузить приложение</h1>
            <p style="margin-bottom: 8px; color: #9ca3af;">
              Убедитесь, что dev-сервер запущен на http://localhost:3000
            </p>
            <p style="margin-bottom: 16px; color: #9ca3af; font-size: 14px;">
              Запустите: <code style="background: #1f2937; padding: 2px 6px; border-radius: 4px;">npm run dev</code>
            </p>
            <button
              onclick="window.location.reload()"
              style="
                padding: 10px 20px;
                background: #0ea5e9;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
              "
            >
              Перезагрузить
            </button>
          </div>
        \`
      `).catch(console.error)
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

