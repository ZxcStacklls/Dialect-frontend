import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface ParticleBackgroundProps {
  className?: string
  particleCount?: number
  connectionDistance?: number
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  className = '',
  particleCount = 50,
  connectionDistance = 150,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const isInitializedRef = useRef(false)
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Улучшенная инициализация частиц с равномерным распределением
    const initParticles = (width: number, height: number) => {
      particlesRef.current = []
      
      // Вычисляем оптимальное количество частиц на основе размера экрана
      const area = width * height
      const optimalCount = Math.min(
        particleCount,
        Math.floor(area / 15000) // Примерно 1 частица на 15000 пикселей
      )
      
      // Используем более равномерное распределение
      const cols = Math.ceil(Math.sqrt(optimalCount * (width / height)))
      const rows = Math.ceil(optimalCount / cols)
      const cellWidth = width / cols
      const cellHeight = height / rows
      
      for (let i = 0; i < optimalCount; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        
        // Случайная позиция в пределах ячейки для более естественного вида
        const x = col * cellWidth + Math.random() * cellWidth
        const y = row * cellHeight + Math.random() * cellHeight
        
        particlesRef.current.push({
          x: Math.max(0, Math.min(width, x)),
          y: Math.max(0, Math.min(height, y)),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: 1.5,
        })
      }
    }

    // Устанавливаем размер canvas и пересчитываем частицы
    const resizeCanvas = () => {
      // Очищаем предыдущий таймер для debounce
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        const newWidth = window.innerWidth
        const newHeight = window.innerHeight
        
        // Пропускаем, если размер не изменился
        if (canvas.width === newWidth && canvas.height === newHeight) {
          return
        }
        
        // Сохраняем старые размеры для масштабирования
        const oldWidth = canvas.width || newWidth
        const oldHeight = canvas.height || newHeight
        
        canvas.width = newWidth
        canvas.height = newHeight
        
        // Если частицы уже были инициализированы, масштабируем их позиции
        if (isInitializedRef.current && particlesRef.current.length > 0) {
          const scaleX = newWidth / oldWidth
          const scaleY = newHeight / oldHeight
          
          particlesRef.current.forEach((particle) => {
            particle.x *= scaleX
            particle.y *= scaleY
            
            // Ограничиваем в пределах нового canvas
            particle.x = Math.max(0, Math.min(newWidth, particle.x))
            particle.y = Math.max(0, Math.min(newHeight, particle.y))
          })
          
          // Если размер сильно изменился, пересчитываем количество частиц
          const oldArea = oldWidth * oldHeight
          const newArea = newWidth * newHeight
          const areaRatio = newArea / oldArea
          
          if (areaRatio > 1.5 || areaRatio < 0.67) {
            // Переинициализируем частицы для нового размера
            initParticles(newWidth, newHeight)
          }
        } else {
          // Первая инициализация
          initParticles(newWidth, newHeight)
          isInitializedRef.current = true
        }
      }, 100) // Debounce 100ms
    }
    
    // Первоначальная установка размера
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current

      // Обновление позиций частиц
      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        // Отскок от краев
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -1
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -1
        }

        // Ограничение в пределах canvas
        particle.x = Math.max(0, Math.min(canvas.width, particle.x))
        particle.y = Math.max(0, Math.min(canvas.height, particle.y))
      })

      // Рисование соединений между близкими частицами
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < connectionDistance) {
            // Прозрачность линии зависит от расстояния
            const opacity = (1 - distance / connectionDistance) * 0.3
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})` // primary-500 цвет
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Рисование частиц
      particles.forEach((particle) => {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.6)' // primary-500 цвет
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()

        // Добавляем свечение
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.radius * 3
        )
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)')
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      isInitializedRef.current = false
    }
  }, [particleCount, connectionDistance])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 2, pointerEvents: 'none' }}
    />
  )
}

export default ParticleBackground

