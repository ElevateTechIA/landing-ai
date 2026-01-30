'use client';

import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';
import { scrollToContact, scrollToSection } from '../utils/scroll';

export default function HeroSectionOriginal() {
  const { t } = useLanguage();

  return (
    <section className="min-h-screen bg-white px-4 sm:px-6 lg:px-8 pt-24 lg:pt-32 pb-16">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-20 lg:items-center">
        <div className="mb-12 lg:mb-0">
        <div>
          {t('hero.subtitle') && (
            <p className="text-blue-600 text-sm sm:text-base font-semibold mb-3 uppercase tracking-wide">
              {t('hero.subtitle')}
            </p>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 lg:mb-6 leading-tight">
            {t('heroOriginal.title')}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed mb-8 lg:mb-10">
            {t('heroOriginal.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <button
              onClick={scrollToContact}
              className="w-full sm:w-auto bg-blue-600 text-white py-3 px-8 lg:py-4 lg:px-10 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {t('heroOriginal.cta')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => scrollToSection('process')}
              className="w-full sm:w-auto bg-white text-blue-600 border-2 border-blue-600 py-3 px-8 lg:py-4 lg:px-10 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              {t('heroOriginal.ctaSecondary')}
            </button>
          </div>
        </div>

        </div>

        {/* CEO Image */}
        <div className="lg:order-first mb-8 lg:mb-0">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-square lg:aspect-auto">
          <Image
            src="/images/cesarvega.png"
            alt="Cesar Oswaldo Vega - CEO"
            width={800}
            height={800}
            className="w-full h-full rounded-2xl object-cover"
            priority
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 sm:p-8">
            <p className="text-white text-xl sm:text-2xl lg:text-3xl font-semibold">Cesar Oswaldo Vega</p>
            <p className="text-white/90 text-base sm:text-lg">CEO</p>
          </div>
        </div>
        </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-16 lg:mt-20 max-w-6xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-base sm:text-lg">{t('hero.smartFast')}</h3>
            <p className="text-sm sm:text-base text-gray-600">{t('hero.smartFastDesc')}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 sm:p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-base sm:text-lg">{t('hero.secure')}</h3>
            <p className="text-sm sm:text-base text-gray-600">{t('hero.secureDesc')}</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Hint */}
      <div className="mt-16 lg:mt-20 text-center">
        <p className="text-sm sm:text-base text-gray-400 mb-3">{t('hero.scroll')}</p>
        <svg className="w-6 h-6 sm:w-7 sm:h-7 mx-auto text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
