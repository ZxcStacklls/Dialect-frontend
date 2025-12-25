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
          className={`titlebar-button w-11 h-8 mx-0.5 my-1 rounded-lg flex items-center justify-center group ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm hover:shadow-lg hover:shadow-white/5'
              : 'text-gray-500 hover:text-gray-900 hover:bg-black/5 hover:shadow-lg hover:shadow-black/5'
          }`}
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          title="Свернуть"
        >
          <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <line x1="6" y1="12" x2="18" y2="12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Кнопка развернуть/восстановить */}
        <button
          onClick={handleMaximize}
          className={`titlebar-button w-11 h-8 mx-0.5 my-1 rounded-lg flex items-center justify-center group ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm hover:shadow-lg hover:shadow-white/5'
              : 'text-gray-500 hover:text-gray-900 hover:bg-black/5 hover:shadow-lg hover:shadow-black/5'
          }`}
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          title={isMaximized ? "Восстановить" : "Развернуть"}
        >
          {isMaximized ? (
            /* Иконка восстановления - два окна */
            <svg className="w-[10px] h-[10px] transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 10 10">
              {/* Заднее окно */}
              <path d="M3 0.5h5.5a1 1 0 0 1 1 1V7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              {/* Переднее окно */}
              <rect x="0.5" y="3" width="6" height="6" rx="0.5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            /* Иконка развернуть - одно окно */
            <svg className="w-[10px] h-[10px] transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Кнопка закрыть */}
        <button
          onClick={handleClose}
          className={`titlebar-button w-11 h-8 mx-0.5 my-1 rounded-lg flex items-center justify-center group ${
            isDark
              ? 'text-gray-400 hover:text-white hover:bg-gradient-to-br hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:shadow-red-500/30'
              : 'text-gray-500 hover:text-white hover:bg-gradient-to-br hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:shadow-red-500/30'
          }`}
          style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          title="Закрыть"
        >
          <svg className="w-4 h-4 transition-all duration-200 group-hover:scale-110 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <line x1="7" y1="7" x2="17" y2="17" strokeLinecap="round" />
            <line x1="17" y1="7" x2="7" y2="17" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TitleBar