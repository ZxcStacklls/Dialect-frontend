import { useState, useCallback, useImperativeHandle, forwardRef, useRef, useEffect } from 'react'

export interface InteractiveWindowHandle {
    addWave: (edge: 'top' | 'right' | 'bottom' | 'left', x: number, y: number) => void
}

interface InteractiveWindowProps {
    children?: React.ReactNode
    className?: string
}

interface Wave {
    id: number
    startPos: number // Starting position on perimeter
    currentPos: number // Current "head" position
    length: number
    direction: 1 | -1
    speed: number
    opacity: number
    color: string
}

const InteractiveWindow = forwardRef<InteractiveWindowHandle, InteractiveWindowProps>(({ children, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0, perimeter: 0 })
    const wavesRef = useRef<Wave[]>([])
    const [renderWaves, setRenderWaves] = useState<Wave[]>([]) // For React rendering
    const animationFrameRef = useRef<number>()
    const nextId = useRef(0)

    // Configuration
    const BORDER_RADIUS = 16 // Matches rounded-2xl roughly
    const WAVE_SPEED = 150
    const MAX_WAVE_LENGTH = 150
    // Stroke offset to center the 1px stroke inside the container
    const STROKE_INSET = 0.5
    const EFFECTIVE_RADIUS = BORDER_RADIUS - STROKE_INSET

    // Resize Observer to keep dimensions accurate
    useEffect(() => {
        if (!containerRef.current) return

        const updateDimensions = () => {
            if (!containerRef.current) return
            const { width, height } = containerRef.current.getBoundingClientRect()

            // Allow dimensions of 0 to just return 0
            if (width < 1 || height < 1) {
                setDimensions({ width: 0, height: 0, perimeter: 0 })
                return
            }

            // Calculate exact path perimeter for the inset rect
            // 2 * (w_inset + h_inset) + (2PI - 8) * r_inset
            // w_inset = w - 2*inset
            const wInset = width - 2 * STROKE_INSET
            const hInset = height - 2 * STROKE_INSET

            // Standard rounded rect perimeter
            // 2 * wInset + 2 * hInset - 8 * r + 2 * PI * r
            const perimeter = 2 * (wInset + hInset) - (8 - 2 * Math.PI) * EFFECTIVE_RADIUS

            setDimensions({ width, height, perimeter })
        }

        updateDimensions()
        const observer = new ResizeObserver(updateDimensions)
        observer.observe(containerRef.current)

        return () => observer.disconnect()
    }, [])

    // Helper: Map x,y on rect to distance on perimeter (0 to perimeter)
    // SVG Path starts at (x+r, y), i.e. start of Top Edge.
    const getPerimeterPosition = useCallback((x: number, y: number, rect: DOMRect) => {
        const r = EFFECTIVE_RADIUS
        const w = rect.width - 2 * STROKE_INSET
        const h = rect.height - 2 * STROKE_INSET

        // Segments lengths
        const topStr = Math.max(0, w - 2 * r)
        const vertStr = Math.max(0, h - 2 * r)
        const cornerArc = (Math.PI * r) / 2

        // Local coord in inset rect
        const lx = Math.max(0, Math.min(w, x - rect.left - STROKE_INSET))
        const ly = Math.max(0, Math.min(h, y - rect.top - STROKE_INSET))

        // Determine geometric position
        // 0 is at (r, 0) relative to inset rect

        // Region detection by coordinates (more robust than edge hint)
        let dist = 0

        if (lx >= r && lx <= w - r && ly < r) {
            // Top Straight (0 ... topStr)
            dist = lx - r
        } else if (lx > w - r && ly < r) {
            // Top Right Corner
            // Center at (w-r, r)
            const dx = lx - (w - r)
            const dy = ly - r
            // Angle from Up (0, -1) -> 0 rad in our context?
            // Standard angle from center:
            // Top (-PI/2) -> Right (0). 
            // We want progress 0..1 along arc.
            // theta relative to vertical up: atan2(dy, dx) - (-PI/2) = atan2(dy, dx) + PI/2
            const theta = Math.atan2(dy, dx) + Math.PI / 2
            dist = topStr + (theta * r)
        } else if (lx > w - r && ly >= r && ly <= h - r) {
            // Right Straight
            dist = topStr + cornerArc + (ly - r)
        } else if (lx > w - r && ly > h - r) {
            // Bottom Right Corner
            // Center at (w-r, h-r)
            const dx = lx - (w - r)
            const dy = ly - (h - r)
            // Angle from Right (0) -> Bottom (PI/2)
            const theta = Math.atan2(dy, dx)
            dist = topStr + cornerArc + vertStr + (theta * r)
        } else if (lx >= r && lx <= w - r && ly > h - r) {
            // Bottom Straight (Right to Left)
            // SVG Path goes cw, so x decreases.
            dist = topStr + cornerArc + vertStr + cornerArc + ((w - r) - lx)
        } else if (lx < r && ly > h - r) {
            // Bottom Left Corner
            // Center (r, h-r)
            const dx = lx - r
            const dy = ly - (h - r)
            // Angle from Bottom (PI/2) -> Left (PI)
            // atan2 is in [PI/2, PI]
            // theta = atan2(dy, dx) - PI/2
            const theta = Math.atan2(dy, dx) - Math.PI / 2
            dist = topStr + cornerArc + vertStr + cornerArc + topStr + (theta * r)
        } else if (lx < r && ly >= r && ly <= h - r) {
            // Left Straight (Bottom to Top)
            // ly decreases
            dist = topStr + cornerArc + vertStr + cornerArc + topStr + cornerArc + ((h - r) - ly)
        } else if (lx < r && ly < r) {
            // Top Left Corner
            // Center (r, r)
            const dx = lx - r
            const dy = ly - r
            // Angle from Left (PI) -> Top (-PI/2 == 3PI/2)
            // We want progress 0..PI/2
            // atan2 is in [-PI, -PI/2] (or [PI, -PI/2] via discontinuity)
            // Actually -PI < atan < -PI/2 
            // We want distance from Left (-PI).
            // theta = atan2(dy, dx) + PI
            const theta = Math.atan2(dy, dx) + Math.PI
            dist = topStr + cornerArc + vertStr + cornerArc + topStr + cornerArc + vertStr + (theta * r)
        }

        return dist
    }, [EFFECTIVE_RADIUS, STROKE_INSET])

    const addWave = useCallback((edge: 'top' | 'right' | 'bottom' | 'left', x: number, y: number) => {
        if (!dimensions.perimeter || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const startDist = getPerimeterPosition(x, y, rect)

        const colors = ['#a855f7', '#d8b4fe', '#c084fc']
        const color = colors[Math.floor(Math.random() * colors.length)]

        const id1 = nextId.current++
        const id2 = nextId.current++

        const newWaves: Wave[] = [
            {
                id: id1,
                startPos: startDist,
                currentPos: startDist,
                length: 0,
                direction: 1,
                speed: WAVE_SPEED,
                opacity: 0.5,
                color
            },
            {
                id: id2,
                startPos: startDist,
                currentPos: startDist,
                length: 0,
                direction: -1,
                speed: WAVE_SPEED,
                opacity: 0.5,
                color
            }
        ]

        wavesRef.current.push(...newWaves)
    }, [dimensions.perimeter, getPerimeterPosition])

    useImperativeHandle(ref, () => ({ addWave }))

    // Animation Loop
    useEffect(() => {
        let lastTime = performance.now()

        const animate = (time: number) => {
            const dt = (time - lastTime) / 1000
            lastTime = time

            if (wavesRef.current.length > 0) {
                const updatedWaves: Wave[] = []
                const finishedIds = new Set<number>()

                wavesRef.current.forEach(wave => {
                    if (wave.length < MAX_WAVE_LENGTH) {
                        wave.length = Math.min(MAX_WAVE_LENGTH, wave.length + (WAVE_SPEED * 1.5 * dt))
                    } else {
                        wave.opacity -= 0.5 * dt
                    }

                    const moveAmount = wave.speed * dt * wave.direction
                    wave.currentPos += moveAmount

                    if (wave.opacity <= 0) {
                        finishedIds.add(wave.id)
                    } else {
                        updatedWaves.push(wave)
                    }
                })

                wavesRef.current = updatedWaves
                setRenderWaves([...updatedWaves])
            } else if (renderWaves.length > 0) {
                setRenderWaves([])
            }

            animationFrameRef.current = requestAnimationFrame(animate)
        }

        animationFrameRef.current = requestAnimationFrame(animate)
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        }
    }, [dimensions.perimeter, renderWaves.length])

    const getWavePathProps = (wave: Wave) => {
        const P = dimensions.perimeter
        const L = wave.length

        // Safety check to prevent "full highlight" flash if perimeter is invalid or too small
        if (P <= 0 || isNaN(P)) return { strokeDasharray: '0 0', strokeDashoffset: 0, opacity: 0 }

        let startOnPerimeter = 0
        if (wave.direction === 1) {
            startOnPerimeter = wave.currentPos - L
        } else {
            startOnPerimeter = wave.currentPos
        }

        // Normalize to [0, P) to handle wrapping at the path seam (top-left corner)
        // This ensures that as the wave crosses the 0-point, the offset wraps cleanly.
        startOnPerimeter = ((startOnPerimeter % P) + P) % P

        const dashOffset = -startOnPerimeter

        // Reverting to gap = P - L is strictly necessary for proper wrapping behavior.
        // A gap of P works for non-wrapping segments, but for a loop, the "empty" space 
        // must exactly fill the remainder of the perimeter so the pattern repeats seamlessly.

        // Safety: If L >= P (rare), gap becomes <= 0.
        // Even if L is small, we clamp gap to be at least 1px to avoid invalid Dasharray.
        // In practice, L is capped at 150 and P is > 1000, so P - L is large.

        const safeGap = Math.max(1, P - L)

        return {
            strokeDasharray: `${L} ${safeGap}`,
            strokeDashoffset: dashOffset,
            stroke: wave.color,
            opacity: wave.opacity
        }
    }

    return (
        <div
            ref={containerRef}
            className={`relative backdrop-blur-xl bg-gray-900/60 shadow-2xl rounded-2xl ${className}`}
            style={{ boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
        >
            <div className={`absolute inset-0 rounded-2xl border border-white/10 pointer-events-none`} />

            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible rounded-2xl">
                {/* 
                    Main Border Path
                    x, y inset by 0.5 to keep 1px stroke fully inside 
                    width, height reduced by 1 (0.5 * 2)
                    rx reduced by 0.5 to match concentric curvature
                 */}
                {renderWaves.map(wave => (
                    <rect
                        key={wave.id}
                        x={STROKE_INSET}
                        y={STROKE_INSET}
                        width={Math.max(0, dimensions.width - 2 * STROKE_INSET)}
                        height={Math.max(0, dimensions.height - 2 * STROKE_INSET)}
                        rx={EFFECTIVE_RADIUS}
                        fill="none"
                        strokeWidth="1"
                        strokeLinecap="round"
                        style={{ willChange: 'stroke-dashoffset' }}
                        {...getWavePathProps(wave)}
                    />
                ))}
            </svg>

            <div className="relative z-10 w-full h-full">{children}</div>
        </div>
    )
})

export default InteractiveWindow
