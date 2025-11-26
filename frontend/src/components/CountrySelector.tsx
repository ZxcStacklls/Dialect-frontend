import { useState, useRef, useEffect } from 'react'

export interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
  maxLength: number
}

// Список стран с поддержкой
const CIS_COUNTRIES: Country[] = [
  // СНГ
  { code: 'RU', name: 'Россия', dialCode: '+7', flag: '🇷🇺', maxLength: 10 },
  { code: 'KZ', name: 'Казахстан', dialCode: '+7', flag: '🇰🇿', maxLength: 10 },
  { code: 'BY', name: 'Беларусь', dialCode: '+375', flag: '🇧🇾', maxLength: 9 },
  { code: 'KG', name: 'Кыргызстан', dialCode: '+996', flag: '🇰🇬', maxLength: 9 },
  { code: 'TJ', name: 'Таджикистан', dialCode: '+992', flag: '🇹🇯', maxLength: 9 },
  { code: 'UZ', name: 'Узбекистан', dialCode: '+998', flag: '🇺🇿', maxLength: 9 },
  { code: 'AM', name: 'Армения', dialCode: '+374', flag: '🇦🇲', maxLength: 8 },
  { code: 'AZ', name: 'Азербайджан', dialCode: '+994', flag: '🇦🇿', maxLength: 9 },
  { code: 'TM', name: 'Туркменистан', dialCode: '+993', flag: '🇹🇲', maxLength: 8 },
  { code: 'MD', name: 'Молдова', dialCode: '+373', flag: '🇲🇩', maxLength: 8 },
  
  // Азиатские страны
  { code: 'CN', name: 'Китай', dialCode: '+86', flag: '🇨🇳', maxLength: 11 },
  { code: 'IN', name: 'Индия', dialCode: '+91', flag: '🇮🇳', maxLength: 10 },
  { code: 'TR', name: 'Турция', dialCode: '+90', flag: '🇹🇷', maxLength: 10 },
  { code: 'IR', name: 'Иран', dialCode: '+98', flag: '🇮🇷', maxLength: 10 },
  { code: 'KP', name: 'КНДР', dialCode: '+850', flag: '🇰🇵', maxLength: 10 },
  
  // Арабские страны
  { code: 'AE', name: 'ОАЭ', dialCode: '+971', flag: '🇦🇪', maxLength: 9 },
  { code: 'SA', name: 'Саудовская Аравия', dialCode: '+966', flag: '🇸🇦', maxLength: 9 },
  { code: 'EG', name: 'Египет', dialCode: '+20', flag: '🇪🇬', maxLength: 10 },
  { code: 'DZ', name: 'Алжир', dialCode: '+213', flag: '🇩🇿', maxLength: 9 },
  { code: 'SY', name: 'Сирия', dialCode: '+963', flag: '🇸🇾', maxLength: 9 },
  
  // Латинская Америка
  { code: 'BR', name: 'Бразилия', dialCode: '+55', flag: '🇧🇷', maxLength: 11 },
  { code: 'VE', name: 'Венесуэла', dialCode: '+58', flag: '🇻🇪', maxLength: 10 },
  { code: 'CU', name: 'Куба', dialCode: '+53', flag: '🇨🇺', maxLength: 8 },
  
  // Африка
  { code: 'ZA', name: 'ЮАР', dialCode: '+27', flag: '🇿🇦', maxLength: 9 },
  { code: 'ET', name: 'Эфиопия', dialCode: '+251', flag: '🇪🇹', maxLength: 9 },
  { code: 'ML', name: 'Мали', dialCode: '+223', flag: '🇲🇱', maxLength: 8 },
  { code: 'BF', name: 'Буркина-Фасо', dialCode: '+226', flag: '🇧🇫', maxLength: 8 },
  { code: 'CF', name: 'ЦАР', dialCode: '+236', flag: '🇨🇫', maxLength: 8 },
]

interface CountrySelectorProps {
  selectedCountry: Country | null
  onCountryChange: (country: Country | null) => void
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ selectedCountry, onCountryChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevCountryRef = useRef<Country | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Анимация при изменении страны
  useEffect(() => {
    if (selectedCountry !== prevCountryRef.current) {
      setIsChanging(true)
      const timer = setTimeout(() => {
        setIsChanging(false)
      }, 300)
      prevCountryRef.current = selectedCountry
      return () => clearTimeout(timer)
    }
  }, [selectedCountry])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 bg-white/5 border-b-2 border-gray-600/50 text-white text-lg flex items-center justify-between hover:border-primary-500 focus:outline-none focus:border-primary-500 transition-all"
      >
        {selectedCountry ? (
          <>
            <div className={`flex items-center gap-3 country-change-transition ${isChanging ? 'animate-country-select' : ''}`}>
              <span className="text-xl transition-transform duration-300">{selectedCountry.flag}</span>
              <span className="text-lg">{selectedCountry.name}</span>
            </div>
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-400">Страна</span>
            <svg
              className="w-5 h-5 text-gray-400 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-900/98 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl max-h-64 overflow-hidden animate-fade-in">
          <div className="country-selector-dropdown overflow-y-auto max-h-64 custom-scrollbar">
            {CIS_COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onCountryChange(country)
                  setIsOpen(false)
                }}
                className={`w-full px-6 py-4 flex items-center gap-3 hover:bg-white/5 transition-all duration-200 ${
                  selectedCountry?.code === country.code ? 'bg-primary-500/20' : ''
                }`}
              >
                <span className="text-xl">{country.flag}</span>
                <span className="text-white flex-1 text-left text-lg">{country.name}</span>
                <span className="text-gray-400">{country.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CountrySelector
export { CIS_COUNTRIES }
