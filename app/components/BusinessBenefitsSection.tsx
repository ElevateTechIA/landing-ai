'use client';

import { useLanguage } from '../context/LanguageContext';
import { scrollToContact, scrollToTop } from '../utils/scroll';

export default function BusinessBenefitsSection() {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      titleKey: 'businessBenefits.scalability.title',
      descriptionKey: 'businessBenefits.scalability.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleKey: 'businessBenefits.timeEfficiency.title',
      descriptionKey: 'businessBenefits.timeEfficiency.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      titleKey: 'businessBenefits.smarterDecisions.title',
      descriptionKey: 'businessBenefits.smarterDecisions.description',
    }
  ];

  return (
    <section className="min-h-screen bg-white px-4 py-16">
      {/* Navigation Back Button */}
      <button onClick={scrollToTop} className="mb-8 p-2 hover:bg-gray-100 rounded-lg">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="max-w-md mx-auto">
        {/* Section Header */}
        <div className="mb-12">
          <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide mb-2">
            {t('businessBenefits.section')}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            {t('businessBenefits.title')}
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            {t('businessBenefits.description')}
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-8 mb-12">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600">
                {benefit.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t(benefit.titleKey)}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {t(benefit.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <button
            onClick={scrollToContact}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors text-lg mb-3"
          >
            {t('businessBenefits.cta')}
          </button>
          <p className="text-xs text-gray-500 text-center">
            {t('businessBenefits.ctaNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
