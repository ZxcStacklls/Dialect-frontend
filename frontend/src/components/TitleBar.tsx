import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'

// Заглушка для обратной совместимости
export const TitleBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

const TitleBar = () => {
  const { theme } = useTheme()
  const [isMaximized, setIsMaximized] = useState(false)
  const [currentPath, setCurrentPath] = useState(() => {
    const hash = window.location.hash
    return hash ? hash.slice(1) : '/'
  })
  
  const getCurrentPath = () => {
    const hash = window.location.hash
    return hash ? hash.slice(1) : '/'
  }
  
  useEffect(() => {
    const updatePath = () => {
      const newPath = getCurrentPath()
      setCurrentPath(prevPath => {
        if (prevPath !== newPath) {
          return newPath
        }
        return prevPath
      })
    }
    
    updatePath()
    window.addEventListener('hashchange', updatePath)
    window.addEventListener('popstate', updatePath)
    
    const interval = setInterval(() => {
      const newPath = getCurrentPath()
      setCurrentPath(prevPath => {
        if (prevPath !== newPath) {
          return newPath
        }
        return prevPath
      })
    }, 200)
    
    return () => {
      window.removeEventListener('hashchange', updatePath)
      window.removeEventListener('popstate', updatePath)
      clearInterval(interval)
    }
  }, [])
  
  const hash = window.location.hash
  const path = hash ? hash.slice(1) : '/'
  const effectivePath = path || currentPath
  const isAuthPage = effectivePath === '/login' || effectivePath === '/signup'
  const isDark = isAuthPage ? true : theme === 'dark'

  useEffect(() => {
    if (!window.electron) return

    const checkMaximized = async () => {
      if (window.electron?.isMaximized) {
        const maximized = await window.electron.isMaximized()
        setIsMaximized(maximized)
      }
    }

    checkMaximized()

    if (window.electron?.onWindowMaximized) {
      window.electron.onWindowMaximized((maximized) => {
        setIsMaximized(maximized)
      })
    }
  }, [])

  const handleMinimize = () => {
    if (window.electron) {
      window.electron.minimize?.()
    }
  }

  const handleMaximize = async () => {
    if (window.electron) {
      await window.electron.maximize?.()
    }
  }

  const handleClose = () => {
    if (window.electron) {
      window.electron.close?.()
    }
  }

  return (
    <div 
      className={`titlebar flex items-center justify-between backdrop-blur-xl h-10 select-none ${
        isDark
          ? 'bg-gray-900/90'
          : 'bg-white/90'
      }`}
      style={{
        transition: 'background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Левая часть - Drag область */}
      <div className="flex-1 drag-region cursor-move" />

      {/* Правая часть - Кнопки управления */}
      <div className="flex items-center h-full no-drag">
        {/* Кнопка свернуть */}
        <button
          onClick={handleMinimize}
          className={`titlebar-button w-12 h-full flex items-center justify-center ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
          style={{
            transition: 'background-color 0.2s ease, color 0.2s ease'
          }}
          title="Свернуть"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Кнопка развернуть/восстановить */}
        <button
          onClick={handleMaximize}
          className={`titlebar-button w-12 h-full flex items-center justify-center ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
          }`}
          style={{
            transition: 'background-color 0.2s ease, color 0.2s ease'
          }}
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
          className={`titlebar-button w-12 h-full flex items-center justify-center ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-[#E81123]' // E81123 - стандартный красный цвет Windows
              : 'text-gray-500 hover:text-white hover:bg-[#E81123]'
          }`}
          style={{
            transition: 'background-color 0.2s ease, color 0.2s ease'
          }}
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