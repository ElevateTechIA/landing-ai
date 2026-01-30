'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import ChallengeChatbot from './ChallengeChatbot';
import Image from 'next/image';
import Link from 'next/link';

export default function FinalCallToActionSection() {
  const { t } = useLanguage();
  const [showChatbot, setShowChatbot] = useState(false);

  return (
    <section className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-4xl mx-auto">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            {t('finalCta.title')}
          </h2>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto mb-8">
            {t('finalCta.description')}
          </p>
        </div>

        {/* Call to Action Card */}
        {!showChatbot ? (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 sm:p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src="/images/cesarvega.png"
                alt="Cesar Vega"
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <button
                onClick={() => setShowChatbot(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105"
              >
                {t('language') === 'es' ? 'Iniciar Conversación' : 'Start Conversation'}
              </button>
              <Link
                href="/voice-chat"
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 text-center"
              >
                {t('language') === 'es' ? 'Llamada con IA' : 'Voice Call'}
              </Link>
            </div>
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
