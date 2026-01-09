import React, { useEffect, useRef, useState } from 'react'

interface AnimatedLogoProps {
    size?: number
    strokeWidth?: number
    duration?: number
    delay?: number
    glowDelay?: number
    loop?: boolean
    onComplete?: () => void
    className?: string
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
    size = 200,
    strokeWidth = 10,
    duration = 1.5,
    delay = 0,
    glowDelay = 0.3,
    loop = false,
    onComplete,
    className = ''
}) => {
    const leftPathRef = useRef<SVGPathElement>(null)
    const rightPathRef = useRef<SVGPathElement>(null)
    const [leftLength, setLeftLength] = useState(0)
    const [rightLength, setRightLength] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)
    const [showGlow, setShowGlow] = useState(false)

    // Measure path lengths on mount
    useEffect(() => {
        if (leftPathRef.current && rightPathRef.current) {
            setLeftLength(leftPathRef.current.getTotalLength())
            setRightLength(rightPathRef.current.getTotalLength())
        }
    }, [])

    // Start animation when lengths are measured
    useEffect(() => {
        if (leftLength > 0 && rightLength > 0) {
            const startTimer = setTimeout(() => {
                setIsAnimating(true)
            }, delay * 1000)

            return () => clearTimeout(startTimer)
        }
    }, [leftLength, rightLength, delay])

    // Handle glow and completion
    useEffect(() => {
        if (isAnimating) {
            const glowTimer = setTimeout(() => {
                setShowGlow(true)
            }, (duration + glowDelay) * 1000)

            const completeTimer = setTimeout(() => {
                if (onComplete) onComplete()
                if (loop) {
                    setIsAnimating(false)
                    setShowGlow(false)
                    setTimeout(() => setIsAnimating(true), 500)
                }
            }, (duration + glowDelay + 0.5) * 1000)

            return () => {
                clearTimeout(glowTimer)
                clearTimeout(completeTimer)
            }
        }
    }, [isAnimating, duration, glowDelay, onComplete, loop])

    const strokeColor = '#C084FC'
    const glowColor = '#A78BFA'

    return (
        <div
            className={`animated-logo-container flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
        >
            <svg
                viewBox="0 0 512 512"
                width={size}
                height={size}
                style={{ overflow: 'visible' }}
            >
                <defs>
                    {/* Very subtle neon glow filter */}
                    <filter id="animated-neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={strokeColor} floodOpacity="0.35" />
                        <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={glowColor} floodOpacity="0.2" />
                        <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor={strokeColor} floodOpacity="0.1" />
                    </filter>
                </defs>

                {/* Left part of N */}
                <path
                    ref={leftPathRef}
                    d="M 211.23 155.11 C 222.82 152.56 234.98 155.88 244.87 162.08 C 252.73 167.02 259.70 173.30 265.58 180.47 C 274.17 190.27 282.38 200.41 289.88 211.08 C 293.57 216.62 297.44 222.22 299.37 228.67 C 301.42 235.54 303.64 242.79 302.15 250.01 C 300.89 256.67 295.96 263.15 288.96 264.26 C 279.87 266.15 271.27 261.04 264.57 255.41 C 254.34 247.28 247.64 235.66 237.56 227.38 C 233.40 223.77 227.04 222.64 222.04 225.06 C 215.44 229.38 212.38 237.01 208.67 243.63 C 197.67 264.96 187.52 286.74 175.89 307.74 C 171.93 314.85 167.42 321.83 161.24 327.24 C 147.31 340.15 126.08 343.96 108.32 337.65 C 102.95 335.28 99.79 328.78 101.31 323.10 C 102.29 319.50 104.15 316.24 105.77 312.92 C 118.38 288.17 130.89 263.37 143.59 238.68 C 150.74 223.61 158.49 208.85 165.99 193.96 C 172.08 182.38 179.94 171.29 190.89 163.85 C 196.93 159.51 203.96 156.61 211.23 155.11 Z"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        strokeDasharray: leftLength,
                        strokeDashoffset: isAnimating ? 0 : leftLength,
                        transition: isAnimating ? `stroke-dashoffset ${duration}s ease-in-out` : 'none',
                        filter: showGlow ? 'url(#animated-neon-glow)' : 'none',
                        opacity: showGlow ? 1 : 0.95,
                    }}
                />

                {/* Right part of N */}
                <path
                    ref={rightPathRef}
                    d="M 382.26 167.21 C 389.37 166.52 397.02 166.22 403.61 169.43 C 406.70 171.16 410.02 173.45 411.12 177.01 C 412.21 181.93 410.44 186.92 408.29 191.31 C 395.58 217.18 382.62 242.94 369.79 268.76 C 361.29 285.54 353.27 302.57 344.23 319.07 C 337.03 332.09 326.09 343.35 312.29 349.28 C 300.64 354.44 286.80 354.03 275.29 348.68 C 260.70 342.30 249.34 330.68 239.26 318.68 C 228.09 305.62 216.84 291.75 211.87 275.00 C 210.19 268.89 209.17 262.39 210.47 256.11 C 212.45 247.94 220.57 241.45 229.06 241.89 C 234.25 242.17 238.72 245.23 242.71 248.30 C 250.59 254.71 257.66 262.05 264.48 269.58 C 268.80 274.22 273.01 279.25 278.70 282.28 C 283.90 285.07 290.72 284.11 294.96 280.01 C 300.29 274.95 303.02 267.96 306.43 261.62 C 311.02 253.08 315.33 244.40 319.43 235.63 C 322.39 229.40 323.91 222.05 321.63 215.36 C 318.94 208.31 312.10 204.02 308.77 197.36 C 307.33 194.07 307.03 190.00 308.71 186.75 C 311.80 182.67 317.46 183.10 321.99 183.49 C 330.06 184.07 338.82 186.50 346.35 182.30 C 357.80 176.20 369.01 168.62 382.26 167.21 Z"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        strokeDasharray: rightLength,
                        strokeDashoffset: isAnimating ? 0 : rightLength,
                        transition: isAnimating ? `stroke-dashoffset ${duration}s ease-in-out` : 'none',
                        filter: showGlow ? 'url(#animated-neon-glow)' : 'none',
                        opacity: showGlow ? 1 : 0.95,
                    }}
                />
            </svg>
        </div>
    )
}

export default AnimatedLogo
