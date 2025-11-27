import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Проверяем, что root элемент существует
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

// Добавляем обработку ошибок при рендеринге
try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
} catch (error) {
  console.error('Failed to render app:', error)
  rootElement.innerHTML = `
    <div style="
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(to bottom right, #111827, #1f2937, #111827);
      color: white;
      padding: 20px;
      text-align: center;
    ">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Ошибка загрузки приложения</h1>
      <p style="margin-bottom: 16px; color: #9ca3af;">
        ${error instanceof Error ? error.message : 'Неизвестная ошибка'}
      </p>
      <button
        onclick="window.location.reload()"
        style="
          padding: 10px 20px;
          background: #0ea5e9;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        "
      >
        Перезагрузить
      </button>
    </div>
  `
}

