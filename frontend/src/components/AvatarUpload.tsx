import { useRef, useState } from 'react'

interface AvatarUploadProps {
  onImageChange: (file: File | null) => void
  onValidationError?: (error: string | null) => void
  currentImage?: string | null
  validationError?: string | null
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXTENSIONS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_WIDTH = 1024
const MAX_HEIGHT = 1024

const AvatarUpload: React.FC<AvatarUploadProps> = ({ 
  onImageChange, 
  onValidationError,
  currentImage,
  validationError 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentImage || null)

  const validateImage = async (file: File): Promise<string | null> => {
    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      return `Размер файла не должен превышать 5 МБ. Текущий размер: ${(file.size / (1024 * 1024)).toFixed(2)} МБ`
    }
    
    // Проверка типа файла
    if (!ALLOWED_EXTENSIONS.includes(file.type.toLowerCase())) {
      return 'Недопустимый формат. Используйте PNG, JPG или WEBP.'
    }

    // Проверка разрешения через создание изображения
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          if (img.width > MAX_WIDTH || img.height > MAX_HEIGHT) {
            resolve(`Изображение слишком большое. Максимальное разрешение ${MAX_WIDTH}x${MAX_HEIGHT}px. (Загружено: ${img.width}x${img.height}px)`)
          } else {
            resolve(null)
          }
        }
        img.onerror = () => {
          resolve('Файл не является корректным изображением.')
        }
        img.src = e.target?.result as string
      }
      reader.onerror = () => {
        resolve('Ошибка при чтении файла.')
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Валидация
      const error = await validateImage(file)
      
      if (error) {
        if (onValidationError) {
          onValidationError(error)
        }
        // Сбрасываем input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // Если валидация прошла успешно
      if (onValidationError) {
        onValidationError(null)
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      onImageChange(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(null)
    onImageChange(null)
    if (onValidationError) {
      onValidationError(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onClick={handleClick}
        className="relative w-32 h-32 rounded-full overflow-hidden cursor-pointer group border-2 border-gray-700 hover:border-primary-500 transition-all"
      >
        {preview ? (
          <>
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={handleDelete}
                className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                type="button"
                title="Удалить фото"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gray-800/50 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-500 group-hover:text-primary-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}
        {!preview && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClick}
        className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
      >
        {preview ? 'Изменить фото' : 'Добавить фото'}
      </button>
      {validationError && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1 max-w-xs text-center">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationError}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

export default AvatarUpload

