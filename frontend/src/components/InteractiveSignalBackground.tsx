import { useEffect, useRef, useCallback } from 'react'

interface InteractiveSignalBackgroundProps {
    className?: string
    windowRect?: DOMRect | null
    onSignalCollision?: (edge: 'top' | 'right' | 'bottom' | 'left', x: number, y: number) => void
}

interface Point {
    x: number
    y: number
}

interface Line {
    points: Point[]
}

interface Signal {
    lineIndex: number
    progress: number
    speed: number
    baseSpeed: number
    tailLength: number
    opacity: number
}

const InteractiveSignalBackground: React.FC<InteractiveSignalBackgroundProps> = ({
    className = '',
    windowRect,
    onSignalCollision
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationFrameRef = useRef<number>()

    // Scale factor computed from screen size (1.0 = reference 1920x1080)
    const scaleFactorRef = useRef(1)

    // Configuration - base values for 1920x1080 reference screen
    const config = useRef({
        baseLineCount: 50,           // Base count for 1920x1080
        baseSpeedMultiplier: 0.8,    // Base speed for 1920x1080 (renamed from speedMultiplier)
        baseSignalDensity: 30,       // Base density for 1920x1080 (renamed from signalDensity)
        backgroundColor: '#0a0f1a',
        lineWidth: 1,
        angleMultiplier: 1,
        arcCurvature: 2.3,
        arcAngle: 120,
        totalSpan: 0.58,
        centerX: 0.5,
        centerY: 0.5,
        lineOpacity: 0.35,
    })

    const lines = useRef<Line[]>([])
    const signals = useRef<Signal[]>([])
    const signalGradient = useRef([
        { r: 245, g: 240, b: 255 },
        { r: 216, g: 180, b: 254 },
        { r: 168, g: 85, b: 247 },
        { r: 100, g: 40, b: 200 }
    ])

    const lerp = (start: number, end: number, t: number) => {
        return start * (1 - t) + end * t
    }

    const lerpColor = (c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }, t: number) => {
        return {
            r: Math.round(c1.r + (c2.r - c1.r) * t),
            g: Math.round(c1.g + (c2.g - c1.g) * t),
            b: Math.round(c1.b + (c2.b - c1.b) * t)
        }
    }

    const getGradientColor = (t: number) => {
        const stops = signalGradient.current.length - 1
        const scaledT = t * stops
        const index = Math.floor(scaledT)
        const remainder = scaledT - index
        if (index >= stops) return signalGradient.current[stops]
        return lerpColor(signalGradient.current[index], signalGradient.current[index + 1], remainder)
    }

    const initLines = useCallback((width: number, height: number) => {
        lines.current = []
        const w = width
        const h = height
        const c = config.current

        // Adaptive line count based on screen diagonal
        const diagonal = Math.sqrt(w * w + h * h)
        const baseDiagonal = Math.sqrt(1920 * 1920 + 1080 * 1080) // Reference: 1920x1080
        const scaleFactor = diagonal / baseDiagonal
        scaleFactorRef.current = scaleFactor // Store for use in speed/density calculations
        const lineCount = Math.max(15, Math.floor(c.baseLineCount * scaleFactor))

        // Base angle for diagonal lines
        const angle = Math.atan2(h * c.angleMultiplier, w)
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const perpX = -sinA
        const perpY = cosA

        const lineLength = diagonal * 2.5

        const totalSpan = (w + h) * c.totalSpan
        const spacing = totalSpan / lineCount

        // arcCurvature controls wave amplitude
        const waveAmplitude = c.arcCurvature * 300
        // arcAngle controls sharpness
        const sharpness = c.arcAngle / 70

        const centerX = w * c.centerX
        const centerY = h * c.centerY

        for (let i = 0; i < lineCount; i++) {
            const perpOffset = (i - lineCount / 2) * spacing
            const lineCenterX = centerX + perpX * perpOffset
            const lineCenterY = centerY + perpY * perpOffset

            const points: Point[] = []
            const segments = 400

            for (let j = 0; j <= segments; j++) {
                const t = j / segments
                const alongLine = (t - 0.5) * lineLength

                const baseX = lineCenterX + cosA * alongLine
                const baseY = lineCenterY + sinA * alongLine

                // Enhanced curve: use power function for sharper center curve
                const curveT = (t - 0.5) * 2 // -1 to 1
                const curvedT = Math.sign(curveT) * Math.pow(Math.abs(curveT), sharpness)
                const waveOffset = curvedT * waveAmplitude

                const x = baseX + perpX * waveOffset
                const y = baseY + perpY * waveOffset

                points.push({ x, y })
            }

            lines.current.push({ points })
        }
    }, [])

    const createSignal = useCallback((lineIndex: number, startProgress: number | null = null) => {
        let progress = startProgress !== null ? startProgress : -0.1
        const c = config.current

        // Speed distribution: mostly slow/medium, rare fast
        // Base 0.0005 + random 0..0.0007 -> range [0.0005, 0.0012]
        // Scale speed by scaleFactor for consistent perceived speed across screen sizes
        const speedFactor = 0.0005 + Math.random() * 0.0007
        const effectiveSpeedMultiplier = c.baseSpeedMultiplier * scaleFactorRef.current
        const tailLength = Math.max(5, speedFactor * 12000)

        signals.current.push({
            lineIndex,
            progress: progress,
            speed: speedFactor * effectiveSpeedMultiplier,
            baseSpeed: speedFactor,
            tailLength: tailLength,
            opacity: 0.5 + Math.random() * 0.5,
        })
    }, [])

    const tryCreateSignal = useCallback((startProgress: number | null = null) => {
        let attempts = 0
        let lineIndex = -1

        while (attempts < 15) {
            const candidate = Math.floor(Math.random() * lines.current.length)
            const signalsOnLine = signals.current.filter(s => s.lineIndex === candidate)

            if (signalsOnLine.length === 0) {
                lineIndex = candidate
                break
            } else {
                const isSafe = signalsOnLine.every(s => {
                    const dist = Math.abs((startProgress ?? 0) - s.progress)
                    return dist > 0.3
                })
                if (isSafe) {
                    lineIndex = candidate
                    break
                }
            }
            attempts++
        }

        if (lineIndex !== -1) {
            createSignal(lineIndex, startProgress)
        }
    }, [createSignal])

    const initSignals = useCallback(() => {
        signals.current = []
        // Scale signal density by scaleFactor for consistent visual density
        const effectiveSignalDensity = Math.max(5, Math.floor(config.current.baseSignalDensity * scaleFactorRef.current))
        for (let i = 0; i < effectiveSignalDensity; i++) {
            tryCreateSignal(Math.random())
        }
    }, [tryCreateSignal])

    // Collision Logic Check
    const checkCollisions = useCallback((x: number, y: number) => {
        if (!windowRect || !onSignalCollision) return

        // Simple AABB expansion for "touching"
        const threshold = 10
        const r = windowRect

        const inHorizontalRange = x >= r.left - threshold && x <= r.right + threshold
        const inVerticalRange = y >= r.top - threshold && y <= r.bottom + threshold

        if (!inHorizontalRange || !inVerticalRange) return

        // Determine which edge
        const distLeft = Math.abs(x - r.left)
        const distRight = Math.abs(x - r.right)
        const distTop = Math.abs(y - r.top)
        const distBottom = Math.abs(y - r.bottom)

        const minDist = Math.min(distLeft, distRight, distTop, distBottom)

        if (minDist > threshold) return // Inside but deep inside or just outside corner range but not close enough to line

        if (minDist === distLeft) onSignalCollision('left', r.left, y)
        else if (minDist === distRight) onSignalCollision('right', r.right, y)
        else if (minDist === distTop) onSignalCollision('top', x, r.top)
        else if (minDist === distBottom) onSignalCollision('bottom', x, r.bottom)

    }, [windowRect, onSignalCollision])


    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initLines(canvas.width, canvas.height)
            initSignals()
        }

        window.addEventListener('resize', resize)
        resize()

        const animate = () => {
            ctx.fillStyle = config.current.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Lines
            ctx.strokeStyle = `rgba(100, 120, 160, ${config.current.lineOpacity})`
            ctx.lineWidth = config.current.lineWidth
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            lines.current.forEach(line => {
                const points = line.points
                if (points.length < 2) return

                ctx.beginPath()
                ctx.moveTo(points[0].x, points[0].y)
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y)
                }
                ctx.stroke()
            })

            // Draw Signals
            const toRemove: number[] = []
            const c = config.current

            signals.current.forEach((signal, index) => {
                const line = lines.current[signal.lineIndex]
                if (!line) {
                    toRemove.push(index)
                    return
                }

                // Speed regulation (collision with other signals on same line)
                const signalsOnSameLine = signals.current.filter((s, i) => s.lineIndex === signal.lineIndex && i !== index)
                const effectiveSpeedMultiplier = c.baseSpeedMultiplier * scaleFactorRef.current
                let currentSpeed = signal.baseSpeed * effectiveSpeedMultiplier

                let minDist = 100
                let nearestAhead: Signal | null = null

                signalsOnSameLine.forEach(other => {
                    let dist = other.progress - signal.progress
                    if (dist > 0 && dist < minDist) {
                        minDist = dist
                        nearestAhead = other
                    }
                })

                if (nearestAhead && minDist < 0.05) {
                    currentSpeed = Math.min(currentSpeed, (nearestAhead as Signal).speed)
                }

                signal.speed = currentSpeed

                // Calculate Position
                const points = line.points
                const totalPoints = points.length
                const dynamicTail = Math.max(5, currentSpeed * 12000 / effectiveSpeedMultiplier)
                const floatIndex = signal.progress * (totalPoints - 1)

                if (signal.progress > 1.05) {
                    toRemove.push(index)
                    signal.progress += signal.speed
                    return
                }
                if (floatIndex < 0) {
                    signal.progress += signal.speed
                    return
                }

                const headIndex = Math.floor(floatIndex)
                if (headIndex >= totalPoints - 1) {
                    signal.progress += signal.speed
                    return
                }

                const t = floatIndex - headIndex
                const p1 = points[headIndex]
                const p2 = points[headIndex + 1]
                const headX = lerp(p1.x, p2.x, t)
                const headY = lerp(p1.y, p2.y, t)

                // Collision with Window
                checkCollisions(headX, headY)

                // Draw Tail
                const tailSegments = Math.min(Math.floor(dynamicTail), headIndex)
                ctx.lineCap = 'butt'
                ctx.lineJoin = 'round'

                for (let i = 0; i < tailSegments; i++) {
                    const idx = headIndex - i
                    if (idx <= 0) break

                    const ptA = points[idx]
                    const ptB = points[idx - 1]

                    const gradientPos = i / dynamicTail
                    const color = getGradientColor(gradientPos)
                    const fadeProgress = 1 - gradientPos
                    const alpha = fadeProgress * signal.opacity

                    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`
                    ctx.lineWidth = c.lineWidth * 1.5

                    ctx.beginPath()
                    if (i === 0) {
                        ctx.moveTo(headX, headY)
                        ctx.lineTo(ptA.x, ptA.y)
                    } else {
                        ctx.moveTo(ptA.x, ptA.y)
                    }
                    ctx.lineTo(ptB.x, ptB.y)
                    ctx.stroke()
                }

                // Draw Head (removed by request to remove "dots")
                // ctx.fillStyle = `rgba(${signalGradient.current[0].r}, ${signalGradient.current[0].g}, ${signalGradient.current[0].b}, ${signal.opacity})`
                // ctx.beginPath()
                // ctx.arc(headX, headY, c.lineWidth * 0.8, 0, Math.PI * 2)
                // ctx.fill()

                signal.progress += signal.speed
            })

            // Remove and Respawn
            toRemove.sort((a, b) => b - a).forEach(idx => {
                signals.current.splice(idx, 1)
                tryCreateSignal(-0.02)
            })

            // Maintain scaled signal density
            const effectiveSignalDensity = Math.max(5, Math.floor(c.baseSignalDensity * scaleFactorRef.current))
            while (signals.current.length < effectiveSignalDensity) {
                tryCreateSignal(-0.05)
            }

            animationFrameRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resize)
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }

    }, [initLines, initSignals, checkCollisions, tryCreateSignal]) // Dependencies

    return (
        <div className={`absolute inset-0 w-full h-full ${className}`} style={{ pointerEvents: 'none', zIndex: 0 }}>
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />
            {/* Bottom fade gradient overlay */}
            <div
                className="absolute bottom-0 left-0 right-0 pointer-events-none"
                style={{
                    height: '35%',
                    background: 'linear-gradient(to bottom, transparent 0%, #0a0f1a 100%)'
                }}
            />
        </div>
    )
}

export default InteractiveSignalBackground
