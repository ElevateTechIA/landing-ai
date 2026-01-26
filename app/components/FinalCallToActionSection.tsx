'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import ChallengeChatbot from './ChallengeChatbot';

export default function FinalCallToActionSection() {
  const { t } = useLanguage();
  const [showChatbot, setShowChatbot] = useState(false);

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
        {!showChatbot ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {t('language') === 'es' ? 'Asistente de Contacto' : 'Contact Assistant'}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('language') === 'es'
                ? 'Agenda una reunión conmigo'
                : 'Schedule a meeting with me'
              }
            </p>
            <button
              onClick={() => setShowChatbot(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105"
            >
              {t('language') === 'es' ? 'Iniciar Conversación' : 'Start Conversation'}
            </button>
            <p className="text-gray-500 text-sm mt-4">
              {t('language') === 'es'
                ? 'O usa el asistente de voz con el botón verde en la esquina inferior derecha'
                : 'Or use the voice assistant with the green button in the bottom right corner'
              }
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mt-4">
              <span>Powered by AI</span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {t('language') === 'es' ? 'Chat de Contacto' : 'Contact Chat'}
              </h3>
              <button
                onClick={() => setShowChatbot(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ChallengeChatbot />
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
