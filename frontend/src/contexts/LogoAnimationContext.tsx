import React, { createContext, useContext, useState, ReactNode } from 'react'

interface LogoAnimationContextType {
  isAnimating: boolean
  setAnimating: (value: boolean) => void
  logoPosition: { x: number; y: number; width: number; height: number } | null
  setLogoPosition: (position: { x: number; y: number; width: number; height: number } | null) => void
  targetPosition: { x: number; y: number; width: number; height: number } | null
  setTargetPosition: (position: { x: number; y: number; width: number; height: number } | null) => void
}

const LogoAnimationContext = createContext<LogoAnimationContextType | undefined>(undefined)

export const useLogoAnimation = () => {
  const context = useContext(LogoAnimationContext)
  if (!context) {
    throw new Error('useLogoAnimation must be used within LogoAnimationProvider')
  }
  return context
}

interface LogoAnimationProviderProps {
  children: ReactNode
}

export const LogoAnimationProvider: React.FC<LogoAnimationProviderProps> = ({ children }) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [logoPosition, setLogoPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  return (
    <LogoAnimationContext.Provider
      value={{
        isAnimating,
        setAnimating: setIsAnimating,
        logoPosition,
        setLogoPosition,
        targetPosition,
        setTargetPosition,
      }}
    >
      {children}
    </LogoAnimationContext.Provider>
  )
}

