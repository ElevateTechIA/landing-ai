'use client';

import { useLanguage } from '../context/LanguageContext';
import { scrollToContact, scrollToTop, scrollToSection } from '../utils/scroll';

export default function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    {
      number: 1,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      titleKey: 'howItWorks.discover.title',
      descriptionKey: 'howItWorks.discover.description',
    },
    {
      number: 2,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      titleKey: 'howItWorks.design.title',
      descriptionKey: 'howItWorks.design.description',
    },
    {
      number: 3,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      titleKey: 'howItWorks.build.title',
      descriptionKey: 'howItWorks.build.description',
    },
    {
      number: 4,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      titleKey: 'howItWorks.launch.title',
      descriptionKey: 'howItWorks.launch.description',
    },
    {
      number: 5,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      titleKey: 'howItWorks.improve.title',
      descriptionKey: 'howItWorks.improve.description',
    }
  ];

  return (
    <section className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
      <div className="max-w-6xl mx-auto">
      {/* Navigation Back Button */}
      <button onClick={scrollToTop} className="mb-8 p-2 hover:bg-gray-200 rounded-lg lg:hidden transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div>
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 lg:mb-20 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            {t('howItWorks.title')}
          </h2>
        </div>

        {/* Main Title */}
        <div className="mb-12 sm:mb-16 lg:mb-20 text-center max-w-3xl mx-auto">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            {t('howItWorks.roadmap')}
          </h3>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed">
            {t('howItWorks.description')}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-12 sm:mb-16">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-4 sm:gap-5">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                  {step.number}
                </div>
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className="text-blue-600">
                    {step.icon}
                  </div>
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {t(step.titleKey)}
                  </h4>
                </div>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  {t(step.descriptionKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="mb-16 sm:mb-20 max-w-md mx-auto">
          <button
            onClick={scrollToContact}
            className="w-full bg-blue-600 text-white py-4 sm:py-5 px-6 sm:px-8 rounded-xl font-medium hover:bg-blue-700 transition-all hover:shadow-lg text-base sm:text-lg"
          >
            {t('howItWorks.cta')}
          </button>
        </div>
      </div>
      </div>
    </section>
  );
}
