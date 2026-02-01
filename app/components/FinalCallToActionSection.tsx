'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import ChallengeChatbot from './ChallengeChatbot';
import Image from 'next/image';
import Link from 'next/link';

export default function FinalCallToActionSection() {
  const { t, language } = useLanguage();
  const [showChatbot, setShowChatbot] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToastMessage = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

  const handleCallRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/twilio/initiate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          customerName: name || 'Not provided',
          agentId: 'agent_2301kg3qxsdcfgha22tf1eq8vr4z',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToastMessage(
          language === 'es'
            ? '¡Llamada iniciada! Recibirás una llamada en breve.'
            : 'Call initiated! You will receive a call shortly.',
          'success'
        );
        setShowCallForm(false);
        setName('');
        setPhone('');
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error requesting call:', error);
      showToastMessage(
        language === 'es'
          ? 'Error al iniciar la llamada. Por favor intenta de nuevo.'
          : 'Error initiating call. Please try again.',
        'error'
      );
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
              {language === 'es' ? 'Asistente de Contacto' : 'Contact Assistant'}
            </h3>
            <p className="text-gray-600 mb-6">
              {language === 'es'
                ? 'Agenda una reunión conmigo'
                : 'Schedule a meeting with me'
              }
            </p>
            <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
              {/* First row: CHATBOT and AI AGENT CALL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowChatbot(true)}
                  className="group flex items-center gap-4 px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold text-gray-900">
                      {language === 'es' ? 'Chatbot' : 'Chatbot'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <Link
                  href="/voice-chat"
                  className="group flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-200 rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold text-gray-900">
                      {language === 'es' ? 'Llamada con IA' : 'AI Agent Call'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Divider text */}
              <div className="text-center text-gray-400 font-medium text-sm">
                {language === 'es' ? 'O' : 'OR'}
              </div>

              {/* Second row: Call buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a
                  href="tel:+17863056167"
                  className="group flex items-center gap-4 px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold text-gray-900">
                      {language === 'es' ? 'Llamar a mi agente' : 'Call my agent'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">786-305-6167</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                <button
                  onClick={() => setShowCallForm(true)}
                  className="group flex items-center gap-4 px-6 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold text-gray-900">
                      {language === 'es' ? 'Mi agente te llama' : 'My agent calls you'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">786-305-6167</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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
                {language === 'es' ? 'Chat de Contacto' : 'Contact Chat'}
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
                {language === 'es' ? 'Solicitar Llamada' : 'Request a Call'}
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
              {language === 'es'
                ? 'Ingresa tu número y te llamaremos en segundos'
                : 'Enter your number and we\'ll call you in seconds'}
            </p>

            <form onSubmit={handleCallRequest} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  {language === 'es' ? 'Tu nombre (opcional)' : 'Your name (optional)'}
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'es' ? 'ej. Juan Pérez' : 'ex. John Doe'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">
                  {language === 'es' ? 'Tu Número de Teléfono' : 'Your Phone Number'}
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
                  {language === 'es'
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
                  ? (language === 'es' ? 'Enviando...' : 'Sending...')
                  : (language === 'es' ? 'Llámame ahora' : 'Call me now')}
              </button>

              <p className="text-sm text-gray-500 text-center flex items-start gap-2">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {language === 'es'
                    ? 'Recibirás una llamada de nuestro número. La llamada es gratuita y tu número no será compartido.'
                    : 'You\'ll receive a call from our number. The call is free and your number won\'t be shared.'}
                </span>
              </p>
            </form>
          </div>
        )}
      </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div
            className={`rounded-xl shadow-2xl p-4 flex items-start gap-3 max-w-md ${
              toastType === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toastType === 'success' ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className="font-semibold">
                {toastType === 'success'
                  ? (language === 'es' ? '¡Éxito!' : 'Success!')
                  : (language === 'es' ? 'Error' : 'Error')
                }
              </p>
              <p className="text-sm">{toastMessage}</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="flex-shrink-0 hover:opacity-75 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
