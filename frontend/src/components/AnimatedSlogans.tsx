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
  'Dialect Prime: Не просто подписка. Это статус.',
  'Prime: Скорость, объём (до 8 ГБ) и приоритет. Общайтесь как профессионал.',
  'Заяви о себе. Кастомизированный значок Zenith или Prime в профиле.',
  'Подписка окупается. Временем, качеством и возможностями.',
]

const AnimatedSlogans = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % slogans.length)
        setIsVisible(true)
      }, 500) // Время для fade out
    }, 5000) // Меняем слоган каждые 5 секунд

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-32 flex items-center justify-center">
      <p
        className={`text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center px-8 transition-all duration-700 ease-in-out ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95'
        }`}
        style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}
      >
        {slogans[currentIndex]}
      </p>
    </div>
  )
}

export default AnimatedSlogans

