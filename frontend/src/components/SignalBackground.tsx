import { useEffect, useRef, useCallback } from 'react'

interface SignalBackgroundProps {
    className?: string
    lineCount?: number
    signalDensity?: number
    speedMultiplier?: number
    backgroundColor?: string
}

interface Line {
    startX: number
    startY: number
    cp1x: number
    cp1y: number
    cp2x: number
    cp2y: number
    endX: number
    endY: number
    points: { x: number; y: number }[]
}

interface Signal {
    lineIndex: number
    progress: number
    speed: number
    length: number
    colorStart: string
    colorEnd: string
    opacity: number
}

/**
 * SignalBackground - Animated background with curved lines and moving signal pulses
 * 
 * Usage:
 * <SignalBackground 
 *   lineCount={50}
 *   signalDensity={8}
 *   speedMultiplier={1}
 *   backgroundColor="#0f172a"
 * />
 * 
 * Can be used to replace static background images on auth pages (Login, SignUp)
 */
const SignalBackground: React.FC<SignalBackgroundProps> = ({
    className = '',
    lineCount = 50,
    signalDensity = 8,
    speedMultiplier = 1,
    backgroundColor = '#0f172a',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationFrameRef = useRef<number>()
    const linesRef = useRef<Line[]>([])
    const signalsRef = useRef<Signal[]>([])
    const isInitializedRef = useRef(false)

    // Signal color palettes (matching Dialect theme)
    const signalColors = [
        { start: 'rgba(251, 146, 60, 0.9)', end: 'rgba(251, 146, 60, 0)' }, // orange accent
        { start: 'rgba(59, 130, 246, 0.8)', end: 'rgba(59, 130, 246, 0)' }, // primary blue
        { start: 'rgba(139, 92, 246, 0.7)', end: 'rgba(139, 92, 246, 0)' }, // purple
    ]

    const lineColor = 'rgba(59, 130, 246, 0.08)' // subtle blue lines

    // Compute points along a cubic bezier curve
    const computeCurvePoints = useCallback((
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        segments: number
    ) => {
        const points: { x: number; y: number }[] = []
        for (let i = 0; i <= segments; i++) {
            const t = i / segments
            const t2 = t * t
            const t3 = t2 * t
            const mt = 1 - t
            const mt2 = mt * mt
            const mt3 = mt2 * mt

            const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3
            const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3

            points.push({ x, y })
        }
        return points
    }, [])

    // Create a new signal on a specific line
    const createSignal = useCallback((lineIndex: number, startProgress: number | null = null) => {
        const colorSet = signalColors[Math.floor(Math.random() * signalColors.length)]

        signalsRef.current.push({
            lineIndex,
            progress: startProgress !== null ? startProgress : Math.random(),
            speed: (0.0005 + Math.random() * 0.002) * speedMultiplier,
            length: 15 + Math.random() * 25,
            colorStart: colorSet.start,
            colorEnd: colorSet.end,
            opacity: 0.5 + Math.random() * 0.5,
        })
    }, [speedMultiplier, signalColors])

    // Initialize lines
    const initLines = useCallback((width: number, height: number) => {
        linesRef.current = []

        for (let i = 0; i < lineCount; i++) {
            const lineProgress = i / lineCount

            // Start points distributed along left and bottom edges
            let startX: number, startY: number
            if (lineProgress < 0.5) {
                startX = -50
                startY = height * (0.3 + lineProgress * 1.4)
            } else {
                startX = width * ((lineProgress - 0.5) * 1.5)
                startY = height + 50
            }

            // End points distributed along right and top edges
            let endX: number, endY: number
            if (lineProgress < 0.6) {
                endX = width + 50
                endY = height * (0.1 + lineProgress * 0.8)
            } else {
                endX = width * (0.3 + (lineProgress - 0.6) * 1.5)
                endY = -50
            }

            // Control points for smooth curves
            const curvature = 0.3 + Math.random() * 0.2
            const midX = (startX + endX) / 2
            const midY = (startY + endY) / 2

            // Add variation to curve shape
            const offsetX = (Math.random() - 0.5) * width * 0.15
            const offsetY = (Math.random() - 0.5) * height * 0.15

            const cp1x = startX + (midX - startX) * curvature + offsetX
            const cp1y = startY + (midY - startY) * curvature + offsetY * 0.5
            const cp2x = endX - (endX - midX) * curvature + offsetX
            const cp2y = endY - (endY - midY) * curvature + offsetY * 0.5

            linesRef.current.push({
                startX, startY,
                cp1x, cp1y,
                cp2x, cp2y,
                endX, endY,
                points: computeCurvePoints(startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY, 100),
            })
        }

        // Initialize signals
        signalsRef.current = []
        linesRef.current.forEach((_, lineIndex) => {
            const shouldHaveSignal = Math.random() < signalDensity / lineCount * 2
            if (shouldHaveSignal) {
                for (let j = 0; j < Math.floor(Math.random() * 2) + 1; j++) {
                    createSignal(lineIndex)
                }
            }
        })
    }, [lineCount, signalDensity, computeCurvePoints, createSignal])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Resize handler
        const resizeCanvas = () => {
            const newWidth = window.innerWidth
            const newHeight = window.innerHeight

            if (canvas.width === newWidth && canvas.height === newHeight) return

            canvas.width = newWidth
            canvas.height = newHeight

            initLines(newWidth, newHeight)
            isInitializedRef.current = true
        }

        // Draw lines
        const drawLines = () => {
            ctx.strokeStyle = lineColor
            ctx.lineWidth = 1

            linesRef.current.forEach((line) => {
                ctx.beginPath()
                ctx.moveTo(line.startX, line.startY)
                ctx.bezierCurveTo(line.cp1x, line.cp1y, line.cp2x, line.cp2y, line.endX, line.endY)
                ctx.stroke()
            })
        }

        // Draw and update signals
        const drawSignals = () => {
            const toRemove: number[] = []

            signalsRef.current.forEach((signal, index) => {
                const line = linesRef.current[signal.lineIndex]
                if (!line) return

                const points = line.points
                const totalPoints = points.length
                const currentPointIndex = Math.floor(signal.progress * (totalPoints - 1))
                const tailLength = Math.floor(signal.length)

                // Draw signal trail
                for (let i = tailLength; i >= 0; i--) {
                    const pointIndex = currentPointIndex - i
                    if (pointIndex < 0 || pointIndex >= totalPoints) continue

                    const point = points[pointIndex]
                    const fadeProgress = 1 - i / tailLength
                    const opacity = fadeProgress * fadeProgress * signal.opacity

                    if (i === 0) {
                        // Draw head with glow
                        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 4)
                        gradient.addColorStop(0, signal.colorStart)
                        gradient.addColorStop(1, signal.colorEnd)

                        ctx.fillStyle = gradient
                        ctx.beginPath()
                        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
                        ctx.fill()
                    }

                    // Draw trail segment
                    if (pointIndex > 0) {
                        const prevPoint = points[pointIndex - 1]
                        ctx.strokeStyle = signal.colorStart.replace(/[\d.]+\)$/, `${opacity * 0.8})`)
                        ctx.lineWidth = 2 * fadeProgress
                        ctx.lineCap = 'round'
                        ctx.beginPath()
                        ctx.moveTo(prevPoint.x, prevPoint.y)
                        ctx.lineTo(point.x, point.y)
                        ctx.stroke()
                    }
                }

                // Update position
                signal.progress += signal.speed

                // Mark for removal when finished
                if (signal.progress > 1.2) {
                    toRemove.push(index)

                    // Chance to spawn new signal
                    if (Math.random() < 0.7) {
                        const newLineIndex = Math.random() < 0.5
                            ? signal.lineIndex
                            : Math.floor(Math.random() * linesRef.current.length)
                        createSignal(newLineIndex, -0.1)
                    }
                }
            })

            // Remove finished signals
            toRemove.reverse().forEach((index) => {
                signalsRef.current.splice(index, 1)
            })

            // Random spawn
            if (Math.random() < 0.02 * signalDensity / 5) {
                const lineIndex = Math.floor(Math.random() * linesRef.current.length)
                createSignal(lineIndex, -0.1)
            }
        }

        // Animation loop
        const animate = () => {
            ctx.fillStyle = backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            drawLines()
            drawSignals()

            animationFrameRef.current = requestAnimationFrame(animate)
        }

        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)
        animate()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            isInitializedRef.current = false
        }
    }, [lineCount, signalDensity, speedMultiplier, backgroundColor, initLines, createSignal])

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full ${className}`}
            style={{ zIndex: 0, pointerEvents: 'none' }}
        />
    )
}

export default SignalBackground
