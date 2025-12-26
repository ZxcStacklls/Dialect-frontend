import React, { createContext, useContext, useState, ReactNode } from 'react'

interface TitleBarContextType {
    currentTab: string
    setCurrentTab: (tab: string) => void
}

const TitleBarContext = createContext<TitleBarContextType>({
    currentTab: 'chats',
    setCurrentTab: () => { },
})

export const useTitleBar = () => useContext(TitleBarContext)

interface TitleBarContextProviderProps {
    children: ReactNode
}

export const TitleBarContextProvider: React.FC<TitleBarContextProviderProps> = ({ children }) => {
    const [currentTab, setCurrentTab] = useState('chats')

    return (
        <TitleBarContext.Provider value={{ currentTab, setCurrentTab }}>
            {children}
        </TitleBarContext.Provider>
    )
}
