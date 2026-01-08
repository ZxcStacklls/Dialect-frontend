import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import InteractiveSignalBackground from '../components/InteractiveSignalBackground'
import InteractiveWindow, { InteractiveWindowHandle } from '../components/InteractiveWindow'

const WelcomePage = () => {
    const navigate = useNavigate()
    const windowRef = useRef<InteractiveWindowHandle>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [windowRect, setWindowRect] = useState<DOMRect | null>(null)

    // Update rect on resize
    useEffect(() => {
        if (!containerRef.current) return

        const updateRect = () => {
            if (containerRef.current) {
                setWindowRect(containerRef.current.getBoundingClientRect())
            }
        }

        updateRect()
        const observer = new ResizeObserver(updateRect)
        observer.observe(containerRef.current)
        window.addEventListener('resize', updateRect)

        return () => {
            observer.disconnect()
            window.removeEventListener('resize', updateRect)
        }
    }, [])

    const handleSignalCollision = useCallback((edge: 'top' | 'right' | 'bottom' | 'left', x: number, y: number) => {
        windowRef.current?.addWave(edge, x, y)
    }, [])

    return (
        <div className="min-h-screen w-full relative overflow-hidden bg-gray-950 flex items-center justify-center">
            <InteractiveSignalBackground
                windowRect={windowRect}
                onSignalCollision={handleSignalCollision}
            />

            {/* Container wrapper for measurement */}
            <div
                ref={containerRef}
                className="w-full max-w-md mx-4 relative z-10"
            >
                <InteractiveWindow ref={windowRef} className="min-h-[400px] flex flex-col items-center justify-center p-8">
                    {/* Placeholder Content */}
                    <div className="text-center space-y-6">
                        <img
                            src="/nayte.png"
                            alt="Nayte Logo"
                            className="w-20 h-20 rounded-2xl mx-auto shadow-xl shadow-primary-500/20"
                        />

                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Nayte
                        </h1>

                        <p className="text-gray-400">
                            Waiting for instructions...
                        </p>
                    </div>
                </InteractiveWindow>
            </div>

        </div>
    )
}

export default WelcomePage
