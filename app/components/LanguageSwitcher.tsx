'use client';

import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
            language === 'en'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-200'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('es')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors ${
            language === 'es'
              ? 'bg-blue-600 text-white'
              : 'bg-transparent text-gray-700 hover:bg-gray-200'
          }`}
        >
          ES
        </button>
      </div>
    </div>
  );
}
