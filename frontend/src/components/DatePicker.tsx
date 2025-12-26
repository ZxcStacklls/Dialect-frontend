import React, { useState, useEffect, useRef } from 'react'

interface DatePickerProps {
    value: Date | null
    onChange: (date: Date) => void
    isDark: boolean
    isModern?: boolean
    className?: string
}

const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const getAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    isDark,
    isModern = false,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [viewDate, setViewDate] = useState(value || new Date())
    const [mode, setMode] = useState<'day' | 'month' | 'year'>('day')
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen && value) {
            setViewDate(value)
        }
    }, [isOpen, value])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setMode('day')
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay()
        return day === 0 ? 6 : day - 1
    }

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
    }

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
    }

    const handleYearChange = (year: number) => {
        setViewDate(new Date(year, viewDate.getMonth(), 1))
        setMode('month')
    }

    const handleMonthChange = (monthIndex: number) => {
        setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1))
        setMode('day')
    }

    const handleDaySelect = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
        newDate.setHours(12, 0, 0, 0)
        onChange(newDate)
        setIsOpen(false)
    }

    const renderCalendar = () => {
        const year = viewDate.getFullYear()
        const month = viewDate.getMonth()
        const daysInMonth = getDaysInMonth(year, month)
        const firstDay = getFirstDayOfMonth(year, month)
        const days = []

        const prevMonthDays = getDaysInMonth(year, month - 1)
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`prev-${i}`} className={`w-8 h-8 flex items-center justify-center text-sm rounded-full cursor-default opacity-30 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                    {prevMonthDays - firstDay + i + 1}
                </div>
            )
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isSelected = value && value.getDate() === i && value.getMonth() === month && value.getFullYear() === year
            const isToday = new Date().getDate() === i && new Date().getMonth() === month && new Date().getFullYear() === year

            days.push(
                <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); handleDaySelect(i) }}
                    className={`w-8 h-8 flex items-center justify-center text-sm rounded-full transition-all duration-200 
                  ${isSelected
                            ? 'bg-gradient-to-tr from-primary-600 to-primary-400 text-white shadow-lg shadow-primary-500/30 font-bold transform scale-105'
                            : isToday
                                ? `border border-primary-500 ${isDark ? 'text-primary-400' : 'text-primary-600'} font-medium`
                                : `${isDark ? 'text-gray-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'}`
                        }
                `}
                >
                    {i}
                </button>
            )
        }

        return (
            <div className="grid grid-cols-7 gap-1 p-2">
                {WEEKDAYS.map(d => (
                    <div key={d} className={`w-8 h-8 flex items-center justify-center text-xs font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {d}
                    </div>
                ))}
                {days}
            </div>
        )
    }

    const renderYears = () => {
        const currentYear = new Date().getFullYear()
        const startYear = currentYear - 100
        const years = []
        for (let y = currentYear; y >= startYear; y--) {
            years.push(
                <button
                    key={y}
                    onClick={(e) => { e.stopPropagation(); handleYearChange(y) }}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${viewDate.getFullYear() === y
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                        : isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                >
                    {y}
                </button>
            )
        }
        return <div className="grid grid-cols-4 gap-2 p-2 max-h-60 overflow-y-auto custom-scrollbar">{years}</div>
    }

    const renderMonths = () => {
        return (
            <div className="grid grid-cols-3 gap-2 p-2">
                {MONTHS.map((m, i) => (
                    <button
                        key={m}
                        onClick={(e) => { e.stopPropagation(); handleMonthChange(i) }}
                        className={`p-2 text-sm rounded-lg transition-colors ${viewDate.getMonth() === i
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                            : isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        {m}
                    </button>
                ))}
            </div>
        )
    }

    const formattedValue = value
        ? value.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : ''

    const age = value ? getAge(value) : null

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Input Field */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all duration-300 ${isOpen ? 'ring-2 ring-primary-500 border-transparent shadow-[0_0_15px_rgba(59,130,246,0.15)]' : ''
                    } ${isDark
                        ? 'bg-gray-800/50 border-gray-700 text-white hover:bg-gray-800'
                        : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                    } ${isModern && isDark ? 'bg-opacity-40 backdrop-blur-sm border-white/10' : ''}`}
            >
                <div>
                    <span className={!value ? (isDark ? 'text-gray-500' : 'text-gray-400') : ''}>
                        {formattedValue || 'ДД.ММ.ГГГГ'}
                    </span>
                    {value && age !== null && (
                        <span className={`ml-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {age} лет
                        </span>
                    )}
                </div>
                <svg className={`w-5 h-5 transition-colors duration-300 ${isOpen ? 'text-primary-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>

            {/* Dropdown - Opening Upwards */}
            {isOpen && (
                <div className={`absolute z-50 mb-2 rounded-xl shadow-2xl border transform transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 origin-bottom 
          ${isDark
                        ? 'bg-gray-900 border-gray-700 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    } ${isModern ? 'backdrop-blur-xl bg-opacity-95 shadow-[0_8px_32px_rgba(0,0,0,0.4)]' : ''}
          w-80 bottom-full left-0
        `}>
                    {/* Header Info Gradient */}
                    {value && age !== null && (
                        <div className="relative overflow-hidden rounded-t-xl p-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md">
                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="text-3xl font-bold mb-0.5 tracking-tight">{value.getDate()}</div>
                                    <div className="text-sm opacity-90 capitalize font-medium">{MONTHS[value.getMonth()]} {value.getFullYear()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-5xl font-black tracking-tighter opacity-100 drop-shadow-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
                                        {age}
                                    </div>
                                    <div className="text-xs uppercase tracking-widest font-bold opacity-80 mt-[-4px]">лет</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-200/10">
                        {mode === 'day' && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); handlePrevMonth() }} className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900 text-gray-600'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <div className="flex items-center gap-2 cursor-pointer font-bold text-lg select-none" onClick={(e) => { e.stopPropagation(); setMode('month') }}>
                                    <span className="hover:text-primary-500 transition-colors">{MONTHS[viewDate.getMonth()]}</span>
                                    <span className="hover:text-primary-500 transition-colors" onClick={(e) => { e.stopPropagation(); setMode('year') }}>{viewDate.getFullYear()}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleNextMonth() }} className={`p-1.5 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900 text-gray-600'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                            </>
                        )}
                        {(mode === 'month' || mode === 'year') && (
                            <div className="flex w-full items-center justify-between">
                                <button onClick={(e) => { e.stopPropagation(); setMode('day') }} className="flex items-center gap-1 text-sm text-primary-500 font-bold hover:text-primary-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    Назад
                                </button>
                                <span className="font-bold text-lg">
                                    {mode === 'month' ? 'Выберите месяц' : 'Выберите год'}
                                </span>
                                <span className="w-16"></span>
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <div className="p-2 min-h-[290px]">
                        {mode === 'day' && renderCalendar()}
                        {mode === 'year' && renderYears()}
                        {mode === 'month' && renderMonths()}
                    </div>
                </div>
            )}
        </div>
    )
}
