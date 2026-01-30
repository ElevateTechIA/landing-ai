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
          <div>
            <button
              onClick={scrollToContact}
              className="w-full sm:w-auto bg-blue-600 text-white py-3 px-8 lg:py-4 lg:px-10 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {t('heroOriginal.cta')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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
            <p className="text-white text-xl sm:text-2xl lg:text-3xl font-semibold">{t('heroOriginal.virtualAssistant')}</p>
            <p className="text-white/90 text-base sm:text-lg">{t('heroOriginal.virtualAssistantCta')}</p>
          </div>
        </div>
        </div>
        </div>
      </div>
    </section>
  );
}
