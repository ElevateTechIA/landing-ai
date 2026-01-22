'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Chatbot from './Chatbot';

export default function FinalCallToActionSection() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Aquí iría la lógica real para enviar el formulario
    setSubmitted(true);

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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
          <p className="text-blue-600 font-medium text-sm sm:text-base">
            {t('language') === 'es' 
              ? '💬 Usa el chat para contarnos sobre tu proyecto - te ayudaremos a estructurar tu mensaje'
              : '💬 Use the chat to tell us about your project - we will help you structure your message'
            }
          </p>
        </div>

        {/* Integrated Chatbot */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-gray-200">

          <Chatbot isEmbedded={true} />
        </div>
      </div>
      </div>
    </section>
  );
}
