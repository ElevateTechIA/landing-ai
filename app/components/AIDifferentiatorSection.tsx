'use client';

import { useLanguage } from '../context/LanguageContext';
import { scrollToContact } from '../utils/scroll';

export default function AIDifferentiatorSection() {
  const { t } = useLanguage();

  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      titleKey: 'aiDifferentiator.optimizeProcesses.title',
      descriptionKey: 'aiDifferentiator.optimizeProcesses.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      titleKey: 'aiDifferentiator.reduceCosts.title',
      descriptionKey: 'aiDifferentiator.reduceCosts.description',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      titleKey: 'aiDifferentiator.informedDecisions.title',
      descriptionKey: 'aiDifferentiator.informedDecisions.description',
    }
  ];

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-16">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <button className="p-2 hover:bg-gray-200 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">{t('aiDifferentiator.header')}</h3>
        <button className="p-2 hover:bg-gray-200 rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      <div className="max-w-md mx-auto">
        {/* Section Title */}
        <div className="mb-8">
          <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide mb-2">
            {t('aiDifferentiator.section')}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('aiDifferentiator.title')}
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            {t('aiDifferentiator.description')}
          </p>
        </div>

        {/* AI Visual */}
        <div className="relative mb-12 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-black p-12">
          <div className="relative w-full aspect-square flex items-center justify-center">
            {/* AI Glowing Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-blue-500 blur-3xl opacity-50"></div>
            </div>
            {/* Center Circle */}
            <div className="relative w-32 h-32 rounded-full border-4 border-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/50">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            {/* Orbital Rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 rounded-full border border-blue-500/20"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-72 rounded-full border border-blue-500/10"></div>
            </div>
          </div>
        </div>

        {/* Why AI Matters Section */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('aiDifferentiator.whyAiMatters')}
          </h3>

          <div className="space-y-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      {t(benefit.titleKey)}
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {t(benefit.descriptionKey)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">
            {t('aiDifferentiator.ctaTitle')}
          </h3>
          <p className="text-blue-100 text-sm mb-6">
            {t('aiDifferentiator.ctaDescription')}
          </p>
          <button
            onClick={scrollToContact}
            className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg font-medium hover:bg-blue-50 transition-colors mb-3"
          >
            {t('aiDifferentiator.cta')}
          </button>
          <p className="text-xs text-blue-100 text-center">
            {t('aiDifferentiator.ctaNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
