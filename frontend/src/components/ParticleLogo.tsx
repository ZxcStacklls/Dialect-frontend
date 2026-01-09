import React, { useEffect, useRef } from 'react';

// Accurate path for the "Nayte" N-logo based on the reference image.
// The logo is a continuous wavy "N" shape:
// - Starts bottom-left, curves UP to top-left peak
// - Curves DOWN to the middle valley  
// - Curves UP to top-right peak
// - Goes down slightly to the right
// We trace TWO parallel paths (inner + outer edge) for the "tube" effect.

// Outer edge of the N
const PATH_OUTER = "M 50 320 Q 50 100 150 50 Q 250 0 280 150 Q 310 300 380 300 Q 450 300 480 50";
// Inner edge of the N (offset inward)
const PATH_INNER = "M 80 280 Q 80 140 150 100 Q 220 60 250 150 Q 280 240 350 240 Q 420 240 440 80";

interface Particle {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
}

interface ParticleLogoProps {
    size?: number;
    neonColor?: string;
    particleCount?: number;
    className?: string;
}

const ParticleLogo: React.FC<ParticleLogoProps> = ({
    size = 280,
    neonColor = '#a855f7',
    particleCount = 400, // Reduced default count for performance
    className = ''
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationRef = useRef<number>();
    const mouseRef = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);

        // Sample points from SVG path
        const samplePath = (pathD: string, numPoints: number): { x: number, y: number }[] => {
            const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            const tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            tempPath.setAttribute("d", pathD);
            tempSvg.appendChild(tempPath);
            tempSvg.style.position = 'absolute';
            tempSvg.style.visibility = 'hidden';
            document.body.appendChild(tempSvg);

            const length = tempPath.getTotalLength();
            const points: { x: number, y: number }[] = [];
            for (let i = 0; i <= numPoints; i++) {
                const pt = tempPath.getPointAtLength((i / numPoints) * length);
                points.push({ x: pt.x, y: pt.y });
            }

            document.body.removeChild(tempSvg);
            return points;
        };

        // Get points from both paths
        const halfCount = Math.floor(particleCount / 2);
        const outerPoints = samplePath(PATH_OUTER, halfCount);
        const innerPoints = samplePath(PATH_INNER, halfCount);
        const allPoints = [...outerPoints, ...innerPoints];

        // Calculate bounding box for scaling
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        allPoints.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const pathWidth = maxX - minX;
        const pathHeight = maxY - minY;
        const pathCenterX = minX + pathWidth / 2;
        const pathCenterY = minY + pathHeight / 2;

        // Scale to fit canvas with padding
        const padding = size * 0.15;
        const availableSize = size - padding * 2;
        const scale = Math.min(availableSize / pathWidth, availableSize / pathHeight);
        const canvasCenterX = size / 2;
        const canvasCenterY = size / 2;

        // Create particles
        const particles: Particle[] = allPoints.map(p => ({
            x: Math.random() * size,
            y: Math.random() * size,
            targetX: (p.x - pathCenterX) * scale + canvasCenterX,
            targetY: (p.y - pathCenterY) * scale + canvasCenterY,
            vx: 0,
            vy: 0,
            size: Math.random() * 1.5 + 1,
            color: neonColor
        }));

        particlesRef.current = particles;

        let startTime = performance.now();
        const formDelay = 600;

        const animate = (time: number) => {
            ctx.clearRect(0, 0, size, size);
            const isForming = (time - startTime) > formDelay;

            particlesRef.current.forEach(p => {
                const friction = 0.92;
                const spring = 0.04;
                const mouseRadius = size * 0.2;

                let tx = isForming ? p.targetX : p.x + Math.sin(time * 0.001 + p.targetX) * 0.3;
                let ty = isForming ? p.targetY : p.y + Math.cos(time * 0.001 + p.targetY) * 0.3;

                // Mouse repulsion
                const dx = mouseRef.current.x - p.x;
                const dy = mouseRef.current.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let fx = 0, fy = 0;
                if (dist < mouseRadius && dist > 0) {
                    const force = ((mouseRadius - dist) / mouseRadius) ** 2 * 1.0;
                    fx = -(dx / dist) * force;
                    fy = -(dy / dist) * force;
                }

                p.vx += (tx - p.x) * spring + fx;
                p.vy += (ty - p.y) * spring + fy;
                p.vx *= friction;
                p.vy *= friction;
                p.x += p.vx;
                p.y += p.vy;

                // Draw particle with glow
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 4;
                ctx.shadowColor = p.color;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [size, neonColor, particleCount]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
        mouseRef.current = { x: -9999, y: -9999 };
    };

    return (
        <div
            className={`relative overflow-hidden cursor-pointer ${className}`}
            style={{ width: size, height: size }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <canvas ref={canvasRef} className="block" />
        </div>
    );
};

export default ParticleLogo;
