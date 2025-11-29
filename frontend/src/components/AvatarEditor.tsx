import React, { useState, useRef, useEffect } from 'react'

interface AvatarEditorProps {
  imageSrc: string
  onSave: (file: File) => void
  onCancel: () => void
  onChangeImage: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: () => void
  validationError?: string | null
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({
  imageSrc,
  onSave,
  onCancel,
  onChangeImage,
  onDelete,
  validationError
}) => {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Загрузка изображения и определение размеров
  useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      
      // Вычисляем начальный масштаб, чтобы изображение заполняло круг (cover)
      // или помещалось полностью, если пользователь хочет видеть всё.
      // Стандартное поведение: cover (заполнить круг)
      const containerSize = 280
      const scaleX = containerSize / img.naturalWidth
      const scaleY = containerSize / img.naturalHeight
      // Используем больший коэффициент для "cover" (чтобы не было пустых мест)
      const initialScale = Math.max(scaleX, scaleY)
      
      setScale(initialScale)
      setPosition({ x: 0, y: 0 })
    }
  }, [imageSrc])

  // Функция ограничения позиции, чтобы изображение не выходило за пределы круга
  const constrainPosition = (pos: { x: number; y: number }, currentScale: number, dimensions: { width: number; height: number }) => {
    const containerSize = 280
    
    // Размеры изображения при текущем масштабе
    const scaledWidth = dimensions.width * currentScale
    const scaledHeight = dimensions.height * currentScale

    // Максимально допустимое смещение от центра
    // Если изображение больше контейнера, мы можем двигать его на разницу размеров / 2
    // Если изображение меньше контейнера, смещение должно быть 0 (центрирование)
    const limitX = Math.max(0, (scaledWidth - containerSize) / 2)
    const limitY = Math.max(0, (scaledHeight - containerSize) / 2)

    return {
      x: Math.max(-limitX, Math.min(limitX, pos.x)),
      y: Math.max(-limitY, Math.min(limitY, pos.y))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageDimensions) {
      e.preventDefault()
      
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      // Применяем ограничения
      const constrained = constrainPosition({ x: newX, y: newY }, scale, imageDimensions)
      setPosition(constrained)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!imageDimensions) return

    const ZOOM_SPEED = 0.001
    const delta = e.deltaY * ZOOM_SPEED
    const newScaleRaw = scale - delta
    
    // Ограничения масштаба
    const containerSize = 280
    // Минимальный масштаб: чтобы изображение ПОЛНОСТЬЮ покрывало круг (cover)
    // Но пользователь просил "полный масштаб", поэтому разрешаем уменьшить чуть больше, 
    // но не меньше чем "вписать в круг" (contain)
    const coverScale = Math.max(containerSize / imageDimensions.width, containerSize / imageDimensions.height)
    const containScale = Math.min(containerSize / imageDimensions.width, containerSize / imageDimensions.height)
    
    const minScale = containScale // Разрешаем уменьшить до полного отображения
    const maxScale = coverScale * 5 // Максимум 5x от cover

    const newScale = Math.min(Math.max(minScale, newScaleRaw), maxScale)

    setScale(newScale)
    
    // После зума нужно проверить позицию, вдруг она вышла за границы
    setPosition(prev => constrainPosition(prev, newScale, imageDimensions))
  }

  const handleSave = async () => {
    if (!imageDimensions) return

    const canvas = document.createElement('canvas')
    const size = 500 // Итоговый размер
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    const img = new Image()
    img.src = imageSrc
    await new Promise((resolve) => { img.onload = resolve })

    // Логика отрисовки:
    // У нас есть позиция (x, y) смещения центра изображения относительно центра контейнера
    // И масштаб (scale)
    
    // Константы UI
    const uiContainerSize = 280 
    const uiRatio = size / uiContainerSize // Коэффициент перевода UI -> Canvas

    ctx.fillStyle = '#000000' // Фон черный (если есть пустые места)
    ctx.fillRect(0, 0, size, size)

    ctx.save()
    
    // Центр канваса
    ctx.translate(size / 2, size / 2)
    
    // Смещение
    ctx.translate(position.x * uiRatio, position.y * uiRatio)
    
    // Масштаб
    const finalScale = scale * uiRatio
    ctx.scale(finalScale, finalScale)
    
    // Рисуем центрированное изображение
    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2
    )
    
    ctx.restore()

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "avatar.png", { type: "image/png" })
        onSave(file)
      }
    }, 'image/png', 0.95)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <h3 className="text-xl font-semibold text-white mb-8 text-center">Редактирование фото</h3>

        {/* Область редактирования */}
        <div className="relative flex justify-center mb-8 overflow-hidden" style={{ touchAction: 'none' }}>
          <div 
            ref={containerRef}
            className="relative w-[280px] h-[280px] cursor-move select-none bg-gray-800 rounded-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Изображение */}
            {imageDimensions && (
               <div 
                 className="absolute top-1/2 left-1/2"
                 style={{
                   width: imageDimensions.width,
                   height: imageDimensions.height,
                   transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                   transformOrigin: 'center center'
                 }}
               >
                 <img 
                   ref={imageRef}
                   src={imageSrc} 
                   alt="Edit" 
                   className="w-full h-full pointer-events-none select-none max-w-none block"
                   draggable={false}
                 />
               </div>
            )}

            {/* Оверлей с "дыркой" (трюк с box-shadow) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full pointer-events-none z-10 border-2 border-blue-500/50"
                 style={{
                   boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                 }}
            />
          </div>
        </div>

        {/* Ползунок зума */}
        <div className="px-4 mb-6">
          <input
            type="range"
            min={imageDimensions ? Math.min(280/imageDimensions.width, 280/imageDimensions.height) : 0.1}
            max={imageDimensions ? Math.max(280/imageDimensions.width, 280/imageDimensions.height) * 5 : 5}
            step="0.01"
            value={scale}
            onChange={(e) => {
              const newScale = parseFloat(e.target.value)
              setScale(newScale)
              if (imageDimensions) {
                setPosition(prev => constrainPosition(prev, newScale, imageDimensions))
              }
            }}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
            <span>Отдалить</span>
            <span>Приблизить</span>
          </div>
        </div>

        {/* Ошибка валидации */}
        {validationError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <span className="text-red-400">⚠️</span>
            <p className="text-sm text-red-300">{validationError}</p>
          </div>
        )}

        {/* Кнопки управления фото */}
        <div className="flex justify-center gap-4 mb-8 text-sm font-medium">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Загрузить другое
          </button>
          <span className="text-gray-700">|</span>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            Удалить фото
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={onChangeImage}
            className="hidden"
          />
        </div>

        {/* Основные кнопки */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors border border-gray-700"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-3 text-white bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

export default AvatarEditor