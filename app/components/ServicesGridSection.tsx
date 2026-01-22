'use client';

import { useLanguage } from '../context/LanguageContext';
import { scrollToContact, scrollToTop } from '../utils/scroll';

export default function ServicesGridSection() {
  const { t } = useLanguage();

  const services = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      titleKey: 'services.customSoftware.title',
      descriptionKey: 'services.customSoftware.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      titleKey: 'services.webApps.title',
      descriptionKey: 'services.webApps.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
      titleKey: 'services.backendApis.title',
      descriptionKey: 'services.backendApis.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      titleKey: 'services.aiAutomation.title',
      descriptionKey: 'services.aiAutomation.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
        </svg>
      ),
      titleKey: 'services.systemIntegrations.title',
      descriptionKey: 'services.systemIntegrations.description',
    }
  ];

  return (
    <section className="min-h-screen bg-white px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto">
      {/* Navigation Back Button */}
      <button onClick={scrollToTop} className="mb-8 p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Section Header */}
      <div className="max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-20 text-center">
        <p className="text-blue-600 text-sm sm:text-base font-semibold uppercase tracking-wide mb-3">
          {t('services.section')}
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
          {t('services.title')}
        </h2>
        <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
          {t('services.description')}
        </p>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
        {services.map((service, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-2xl p-6 sm:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600">
                {service.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {t(service.titleKey)}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  {t(service.descriptionKey)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="max-w-md mx-auto">
        <button
          onClick={scrollToContact}
          className="w-full bg-blue-600 text-white py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-medium hover:bg-blue-700 transition-all hover:shadow-lg text-base sm:text-lg"
        >
          {t('services.cta')}
        </button>
      </div>
      </div>
    </section>
  );
}
