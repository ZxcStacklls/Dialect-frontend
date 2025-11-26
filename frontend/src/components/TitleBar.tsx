import { useEffect, useState } from 'react'
import { isElectron } from '../utils/platform'

const TitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!isElectron() || !window.electron) return

    // Проверяем состояние окна при загрузке
    const checkMaximized = async () => {
      if (window.electron?.isMaximized) {
        const maximized = await window.electron.isMaximized()
        setIsMaximized(maximized)
      }
    }

    checkMaximized()

    // Слушаем события изменения размера окна от Electron
    if (window.electron?.onWindowMaximized) {
      window.electron.onWindowMaximized((maximized) => {
        setIsMaximized(maximized)
      })
    }
  }, [])

  if (!isElectron()) {
    return null // В Web версии не показываем titlebar
  }

  const handleMinimize = () => {
    if (window.electron) {
      window.electron.minimize?.()
    }
  }

  const handleMaximize = async () => {
    if (window.electron) {
      await window.electron.maximize?.()
      // Состояние обновится через событие от Electron
    }
  }

  const handleClose = () => {
    if (window.electron) {
      window.electron.close?.()
    }
  }

  return (
    <div className="titlebar flex items-center justify-between bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50 h-10 px-4 select-none shadow-lg">
      {/* Левая часть - Drag область с логотипом */}
      <div className="flex items-center gap-3 flex-1 drag-region cursor-move">
        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
          <img
            src="/appicon_gradient.png"
            alt="Dialect"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/appicon_default.png'
            }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-200">Dialect</span>
      </div>

      {/* Правая часть - Кнопки управления */}
      <div className="flex items-center gap-0.5 no-drag">
        {/* Кнопка свернуть */}
        <button
          onClick={handleMinimize}
          className="titlebar-button w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 rounded-sm"
          title="Свернуть"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Кнопка развернуть/восстановить */}
        <button
          onClick={handleMaximize}
          className="titlebar-button w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 rounded-sm"
          title={isMaximized ? "Восстановить" : "Развернуть"}
        >
          {isMaximized ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          )}
        </button>

        {/* Кнопка закрыть */}
        <button
          onClick={handleClose}
          className="titlebar-button w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600/80 transition-all duration-200 rounded-sm"
          title="Закрыть"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar

