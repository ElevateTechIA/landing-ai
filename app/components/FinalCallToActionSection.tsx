'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import ChallengeChatbot from './ChallengeChatbot';
import Image from 'next/image';
import Link from 'next/link';

export default function FinalCallToActionSection() {
  const { t } = useLanguage();
  const [showChatbot, setShowChatbot] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCallRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/request-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      if (response.ok) {
        alert(t('language') === 'es'
          ? '¡Solicitud enviada! Te llamaremos pronto.'
          : 'Request sent! We will call you soon.');
        setShowCallForm(false);
        setName('');
        setPhone('');
      }
    } catch (error) {
      console.error('Error requesting call:', error);
      alert(t('language') === 'es'
        ? 'Error al enviar la solicitud. Por favor intenta de nuevo.'
        : 'Error sending request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {!showChatbot && !showCallForm ? (
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
            <div className="flex flex-col gap-4 justify-center items-center">
              {/* First row: CHATBOT and AI AGENT CALL */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full justify-center">
                <button
                  onClick={() => setShowChatbot(true)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105"
                >
                  CHATBOT
                </button>
                <Link
                  href="/voice-chat"
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 text-center"
                >
                  {t('language') === 'es' ? 'LLAMADA CON AGENTE IA' : 'AI AGENT CALL'}
                </Link>
              </div>

              {/* Divider text */}
              <div className="text-gray-500 font-medium">
                {t('language') === 'es' ? 'O' : 'OR'}
              </div>

              {/* Second row: Call buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full justify-center">
                <a
                  href="tel:+17863056167"
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 text-center flex flex-col items-center gap-1"
                >
                  <span>{t('language') === 'es' ? 'LLAMAR A MI AGENTE' : 'CALL MY AGENT'}</span>
                  <span className="text-sm">786-305-6167</span>
                </a>
                <button
                  onClick={() => setShowCallForm(true)}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-xl transition-all transform hover:scale-105 text-center flex flex-col items-center gap-1"
                >
                  <span>{t('language') === 'es' ? 'MI AGENTE TE LLAMA' : 'MY AGENT CALL YOU'}</span>
                  <span className="text-sm">786-305-6167</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mt-4">
              <span>Powered by AI</span>
            </div>
          </div>
        ) : showChatbot ? (
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
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 sm:p-12">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">
                {t('language') === 'es' ? 'Solicitar Llamada' : 'Request a Call'}
              </h3>
              <button
                onClick={() => setShowCallForm(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Phone icon */}
            <div className="flex justify-center mb-8">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>

            <p className="text-center text-gray-600 mb-8">
              {t('language') === 'es'
                ? 'Ingresa tu número y te llamaremos en segundos'
                : 'Enter your number and we\'ll call you in seconds'}
            </p>

            <form onSubmit={handleCallRequest} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  {t('language') === 'es' ? 'Tu nombre (opcional)' : 'Your name (optional)'}
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('language') === 'es' ? 'ej. Juan Pérez' : 'ex. John Doe'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">
                  {t('language') === 'es' ? 'Tu Número de Teléfono' : 'Your Phone Number'}
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {t('language') === 'es'
                    ? 'Incluye el código de país (ej: +1 para USA, +52 para México)'
                    : 'Include country code (ex: +1 for USA, +52 for Mexico)'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !phone}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {isSubmitting
                  ? (t('language') === 'es' ? 'Enviando...' : 'Sending...')
                  : (t('language') === 'es' ? 'Llámame ahora' : 'Call me now')}
              </button>

              <p className="text-sm text-gray-500 text-center flex items-start gap-2">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {t('language') === 'es'
                    ? 'Recibirás una llamada de nuestro número. La llamada es gratuita y tu número no será compartido.'
                    : 'You\'ll receive a call from our number. The call is free and your number won\'t be shared.'}
                </span>
              </p>
            </form>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
