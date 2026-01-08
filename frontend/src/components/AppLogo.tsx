const AppLogo = () => {
  return (
    <div className="flex justify-center mb-8">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden">
        <img
          src="/nayte.png"
          alt="Nayte Logo"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback если изображение не загрузилось
            const target = e.target as HTMLImageElement
            target.src = '/appicon_default.png'
          }}
        />
      </div>
    </div>
  )
}

export default AppLogo

