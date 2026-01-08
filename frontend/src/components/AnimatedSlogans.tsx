import { useState, useEffect } from 'react'

const slogans = [
  'Наш сигнал сильнее, чем ваш провайдер.',
  'Покажите этот слоган тому, у кого опять не грузит инстаграм.',
  'Роскомнадзор отдыхает. А мы — общаемся.',
  'У вас отключили интернет? А у нас — нет.',
  'Чтобы быть на связи, интернет не нужен. Достаточно быть рядом.',
  'Ловит даже в бункере. И на паре в подвале.',
  'Интернет — это опция. Связь — это база.',
  'Твой личный интернет, который нельзя замедлить.',
  'Интернет может выйти из чата, а ты — нет.',
  'Тот самый случай, когда Bluetooth реально спасает мир.',
  'Связь, которая растёт вместе с тобой.',
  'Голосовые комнаты, где идеи обретают звук.',
  'Организуй свою жизнь. От учебы до гейминга.',
  'Роли, права и порядок. Управляй своим миром общения.',
  'Общайся, не оглядываясь. Защита — наш приоритет.',
  'Облачный пароль и 2FA. Двойная защита твоего входа.',
  'Мы не читаем. Мы доставляем.',
  'Уйди в "Концентрацию". Отключи шум, включи фокус.',
  'Nayte Prime: Не просто подписка. Это статус.',
  'Prime: Скорость, объём (до 8 ГБ) и приоритет. Общайтесь как профессионал.',
  'Заяви о себе. Кастомизированный значок Zenith или Prime в профиле.',
  'Подписка окупается. Временем, качеством и возможностями.',
]

const AnimatedSlogans = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set([0]))
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([])

  // Функция для перемешивания массива (Fisher-Yates shuffle)
  const shuffleArray = (array: number[]): number[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Инициализация перемешанного массива индексов
  useEffect(() => {
    const indices = Array.from({ length: slogans.length }, (_, i) => i)
    const shuffled = shuffleArray(indices)
    setShuffledIndices(shuffled)
    setCurrentIndex(shuffled[0])
    setUsedIndices(new Set([shuffled[0]]))
  }, [])

  useEffect(() => {
    if (shuffledIndices.length === 0) return

    const interval = setInterval(() => {
      // Скрываем текущий (уходит вверх)
      setIsVisible(false)

      setTimeout(() => {
        // Меняем индекс
        setUsedIndices((prevUsed) => {
          const nextUnusedIndex = shuffledIndices.findIndex((idx) => !prevUsed.has(idx))

          if (nextUnusedIndex === -1) {
            const newShuffled = shuffleArray(Array.from({ length: slogans.length }, (_, i) => i))
            setShuffledIndices(newShuffled)
            const firstIndex = newShuffled[0]
            setCurrentIndex(firstIndex)
            return new Set([firstIndex])
          } else {
            const nextSloganIndex = shuffledIndices[nextUnusedIndex]
            setCurrentIndex(nextSloganIndex)
            return new Set([...prevUsed, nextSloganIndex])
          }
        })

        // Показываем новый (приходит снизу)
        setIsVisible(true)
      }, 500)
    }, 5000)

    return () => clearInterval(interval)
  }, [shuffledIndices])

  // Функция для форматирования слогана с выделением последней точки
  const formatSlogan = (slogan: string) => {
    const lastDotIndex = slogan.lastIndexOf('.')
    if (lastDotIndex !== -1) {
      return (
        <>
          {slogan.substring(0, lastDotIndex)}
          <span className="text-primary-500">.</span>
        </>
      )
    }
    return slogan
  }

  return (
    <div className="relative min-h-[200px] flex items-center justify-center overflow-hidden px-4 sm:px-6 md:px-8">
      <p
        className={`text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-white text-center max-w-3xl leading-relaxed transition-all duration-700 ease-in-out break-words hyphens-auto ${isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-8 scale-95'
          }`}
        style={{
          textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {formatSlogan(slogans[currentIndex] || slogans[0])}
      </p>
    </div>
  )
}

export default AnimatedSlogans