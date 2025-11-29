import React, { useEffect, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isClosing, setIsClosing] = useState(false)
  const [progress, setProgress] = useState(100)
  const duration = toast.duration || 5000

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => onClose(toast.id), 300) // Ждем окончания анимации закрытия
  }, [toast.id, onClose])

  useEffect(() => {
    const startTime = Date.now()
    const endTime = startTime + duration

    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const newProgress = (remaining / duration) * 100
      
      setProgress(newProgress)

      if (now >= endTime) {
        clearInterval(timer)
        handleClose()
      }
    }, 10)

    return () => clearInterval(timer)
  }, [duration, handleClose])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-gray-800 border-green-500/30 shadow-green-500/10'
      case 'error':
        return 'bg-gray-800 border-red-500/30 shadow-red-500/10'
      case 'warning':
        return 'bg-gray-800 border-yellow-500/30 shadow-yellow-500/10'
      default:
        return 'bg-gray-800 border-blue-500/30 shadow-blue-500/10'
    }
  }

  const getProgressColor = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <div 
      className={`
        relative w-full max-w-sm overflow-hidden rounded-xl border shadow-lg backdrop-blur-md mb-3 transition-all duration-300
        ${getStyles()}
        ${isClosing ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-slide-in-top'}
      `}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white leading-tight">{toast.message}</p>
        </div>
        <button 
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-700/50">
        <div 
          className={`h-full ${getProgressColor()} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default Toast

