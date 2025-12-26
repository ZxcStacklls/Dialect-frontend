import React, { useRef, useState, useEffect } from 'react'
import AvatarEditor from './AvatarEditor'
import { getApiBaseUrl } from '../utils/platform'

interface AvatarUploadProps {
  onImageChange: (file: File | null) => void
  onValidationError?: (error: string | null) => void
  currentImage?: string | null
  validationError?: string | null
  size?: number // размер в единицах Tailwind (w-{size} h-{size})
  layout?: 'center' | 'horizontal'
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXTENSIONS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_WIDTH = 1024
const MAX_HEIGHT = 1024

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  onImageChange,
  onValidationError,
  currentImage,
  validationError: externalError,
  size = 32,
  layout = 'center'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [preview, setPreview] = useState<string | null>(null)
  const [internalError, setInternalError] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null)

  // Use external error if provided, otherwise internal
  const validationError = externalError !== undefined ? externalError : internalError

  // Initialize preview from currentImage
  useEffect(() => {
    if (currentImage) {
      if (currentImage.startsWith('http')) {
        setPreview(currentImage)
      } else {
        // If it's a static file (starts with /static), we need the root URL, not /api
        // getApiBaseUrl returns "http://localhost:8000/api", we need "http://localhost:8000"
        const baseUrl = currentImage.startsWith('/static') || currentImage.startsWith('static')
          ? getApiBaseUrl().replace(/\/api\/?$/, '')
          : getApiBaseUrl()

        const url = `${baseUrl}${currentImage.startsWith('/') ? '' : '/'}${currentImage}`
        setPreview(url)
      }
    } else {
      setPreview(null)
    }
  }, [currentImage])

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate
    const error = await validateImage(file)
    if (error) {
      setInternalError(error)
      onValidationError?.(error)
      event.target.value = ''
      return
    }

    // Reset error
    setInternalError(null)
    onValidationError?.(null)

    // Start editing
    const reader = new FileReader()
    reader.onload = () => {
      setEditingImageSrc(reader.result as string)
      setIsEditorOpen(true)
    }
    reader.readAsDataURL(file)

    // Reset input
    event.target.value = ''
  }

  const handleEditorSave = (file: File) => {
    // Create preview
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Notify parent
    onImageChange(file)

    // Close editor
    setIsEditorOpen(false)
    setEditingImageSrc(null)
  }

  const handleEditorCancel = () => {
    setIsEditorOpen(false)
    setEditingImageSrc(null)
    setInternalError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEditorDelete = () => {
    // This is called from the editor's delete button likely, 
    // but we handle deletion in the main UI usually. 
    // If editor has delete, we can use it.
    handleDelete({ stopPropagation: () => { } } as React.MouseEvent)
    handleEditorCancel()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleClick() // Re-trigger upload flow
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(null)
    onImageChange(null)
    setInternalError(null)
    onValidationError?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Common Avatar Render used in both layouts
  const renderAvatar = () => (
    <div className="relative group flex-shrink-0">
      {/* Glow Effect - Blurred copy of avatar with enhanced brightness */}
      {preview && (
        <div
          className={`absolute rounded-full overflow-hidden ${layout === 'center' ? '-inset-2' : '-inset-[4px]'}`}
          style={{
            animation: 'glow-breathe 4s ease-in-out infinite',
          }}
        >
          <img
            src={preview}
            alt=""
            className="w-full h-full object-cover"
            style={{
              filter: 'blur(8px) brightness(1.3) saturate(1.4)',
              transform: 'scale(1.15)',
              animation: 'glow-rotate 20s linear infinite',
            }}
          />
        </div>
      )}

      {/* Fallback gradient when no avatar */}
      {!preview && (
        <div
          className={`absolute rounded-full ${layout === 'center' ? '-inset-1.5' : '-inset-[3px]'}`}
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
            animation: 'glow-breathe 4s ease-in-out infinite',
          }}
        />
      )}

      <style>{`
        @keyframes glow-breathe {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        @keyframes glow-rotate {
          from { transform: scale(1.15) rotate(0deg); }
          to { transform: scale(1.15) rotate(360deg); }
        }
      `}</style>

      {/* Main Avatar Circle */}
      <div
        onClick={handleClick}
        className={`relative rounded-full overflow-hidden cursor-pointer bg-gray-900 transition-all duration-300`}
        style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
      >
        {preview ? (
          <>
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2`}>
              <button
                onClick={handleEditClick}
                className="p-2.5 bg-primary-500/90 hover:bg-primary-500 hover:scale-110 rounded-full transition-all duration-200 shadow-lg"
                type="button"
                title="Изменить фото"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 bg-red-500/90 hover:bg-red-500 hover:scale-110 rounded-full transition-all duration-200 shadow-lg"
                type="button"
                title="Удалить фото"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="relative">
              <svg className={`text-gray-500 group-hover:text-primary-400 transition-colors duration-300 ${layout === 'horizontal' ? 'w-10 h-10' : 'w-12 h-12'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
              <div className={`absolute w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${layout === 'horizontal' ? '-bottom-1 -right-1' : '-bottom-2 -right-2'}`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderButtons = () => (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 flex items-center justify-center gap-2"
      >
        {preview ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Изменить фото
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Загрузить фото
          </>
        )}
      </button>

      {preview && (
        <button
          type="button"
          onClick={handleDelete}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/50 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Удалить фото
        </button>
      )}

      {validationError && (
        <p className="text-xs text-red-400 flex items-center gap-1 justify-center">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationError}
        </p>
      )}
    </>
  )

  const renderContent = () => {
    if (layout === 'horizontal') {
      return (
        <div className="flex items-center gap-6 w-full">
          {renderAvatar()}
          {/* Buttons on the Right Side */}
          <div className="flex flex-col gap-2 flex-1">
            {renderButtons()}
          </div>
        </div>
      )
    }

    // Default 'center' layout
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        {renderAvatar()}

        {/* Validation Error */}
        {validationError && (
          <p className="text-xs text-red-400 flex items-center gap-1 justify-center">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {validationError}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      {renderContent()}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {isEditorOpen && editingImageSrc && (
        <AvatarEditor
          imageSrc={editingImageSrc}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          onChangeImage={handleFileChange}
          onDelete={handleEditorDelete}
          validationError={internalError}
        />
      )}
    </>
  )
}

export default AvatarUpload
