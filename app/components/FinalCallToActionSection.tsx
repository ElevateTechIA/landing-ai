'use client';

import { useLanguage } from '../context/LanguageContext';

export default function FinalCallToActionSection() {
  const { t } = useLanguage();

  return (
    <section className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-12 sm:mb-16 lg:hidden">
        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('finalCta.header')}</h3>
        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            {t('finalCta.title')}
          </h2>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto mb-3">
            {t('finalCta.description')}
          </p>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 max-w-2xl mx-auto mb-6">
            <p className="text-blue-800 font-semibold text-base sm:text-lg mb-2">
              {t('language') === 'es'
                ? '🎯 Habla con Nuestro Agente IA'
                : '🎯 Talk to Our AI Agent'
              }
            </p>
            <p className="text-blue-700 text-sm sm:text-base">
              {t('language') === 'es'
                ? 'Haz clic en el botón de llamada abajo para hablar con Andrea, nuestra asistente IA'
                : 'Click the call button below to talk with Andrea, our AI assistant'
              }
            </p>
          </div>
        </div>

        {/* Call to Action Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Andrea</h3>
          <p className="text-gray-600 mb-6">
            {t('language') === 'es'
              ? 'Lista para ayudarte'
              : 'Ready to help you'
            }
          </p>
          <p className="text-gray-500 text-sm mb-4">
            {t('language') === 'es'
              ? 'Haz clic en el botón púrpura en la esquina inferior derecha para iniciar una llamada'
              : 'Click the purple button in the bottom right corner to start a call'
            }
          </p>
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
            <span>Powered by</span>
            <span className="font-semibold text-blue-600">ElevenLabs</span>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
