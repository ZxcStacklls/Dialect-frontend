import { useRef, useState } from 'react'
import AvatarEditor from './AvatarEditor'

interface AvatarUploadProps {
  onImageChange: (file: File | null) => void
  onValidationError?: (error: string | null) => void
  currentImage?: string | null
  validationError?: string | null
  size?: number // размер в единицах Tailwind (w-{size} h-{size})
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_EXTENSIONS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_WIDTH = 1024
const MAX_HEIGHT = 1024

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  onImageChange,
  onValidationError,
  currentImage,
  validationError,
  size = 32
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingImageSrc, setEditingImageSrc] = useState<string>('')
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)

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

  const processFile = async (file: File, isEditorUpload: boolean = false) => {
    // Валидация
    const error = await validateImage(file)

    if (error) {
      if (isEditorUpload) {
        setEditorError(error)
      } else {
        if (onValidationError) onValidationError(error)
        // Сбрасываем input
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    // Если валидация прошла успешно
    if (!isEditorUpload && onValidationError) {
      onValidationError(null)
    }
    if (isEditorUpload) {
      setEditorError(null)
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setEditingImageSrc(reader.result as string)
      setIsEditorOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleEditorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file, true)
    }
  }

  const handleEditorSave = (croppedFile: File) => {
    const objectUrl = URL.createObjectURL(croppedFile)
    setPreview(objectUrl)
    onImageChange(croppedFile)

    // Сохраняем текущее исходное изображение как оригинал для последующего редактирования
    setOriginalImageSrc(editingImageSrc)

    setIsEditorOpen(false)
    setEditingImageSrc('')

    // Очищаем input, чтобы можно было выбрать тот же файл снова если нужно
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEditorCancel = () => {
    setIsEditorOpen(false)
    setEditingImageSrc('')
    setEditorError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEditorDelete = () => {
    handleDelete({ stopPropagation: () => { } } as React.MouseEvent)
    handleEditorCancel()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (originalImageSrc || preview) {
      setEditingImageSrc(originalImageSrc || preview || '')
      setIsEditorOpen(true)
    }
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
    <>
      <div className="flex flex-col items-center gap-3">
        {/* Avatar Container with Gradient Ring */}
        <div className="relative group">
          {/* Animated Gradient Ring */}
          <div
            className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-purple-500 to-primary-500 rounded-full opacity-50 group-hover:opacity-100 blur-sm transition-all duration-300"
            style={{ background: preview ? undefined : 'linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6)' }}
          />

          {/* Main Avatar Circle */}
          <div
            onClick={handleClick}
            className="relative rounded-full overflow-hidden cursor-pointer bg-gray-900 ring-2 ring-gray-700 group-hover:ring-primary-500/50 transition-all duration-300"
            style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
          >
            {preview ? (
              <>
                <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                  <button
                    onClick={handleEditClick}
                    className="p-2.5 bg-primary-500/90 hover:bg-primary-500 hover:scale-110 rounded-full transition-all duration-200 shadow-lg"
                    type="button"
                    title="Редактировать фото"
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
                {/* Camera Icon with Plus */}
                <div className="relative">
                  <svg className="w-10 h-10 text-gray-500 group-hover:text-primary-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                  </svg>
                  {/* Plus Badge */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <button
          type="button"
          onClick={handleClick}
          className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1.5"
        >
          {preview ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Изменить
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

        {validationError && (
          <p className="text-xs text-red-400 flex items-center gap-1 max-w-xs text-center">
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

      {isEditorOpen && editingImageSrc && (
        <AvatarEditor
          imageSrc={editingImageSrc}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
          onChangeImage={handleEditorFileChange}
          onDelete={handleEditorDelete}
          validationError={editorError}
        />
      )}
    </>
  )
}

export default AvatarUpload

