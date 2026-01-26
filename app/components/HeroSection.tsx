'use client';

import { useLanguage } from '../context/LanguageContext';
import { scrollToContact, scrollToSection } from '../utils/scroll';

export default function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="min-h-screen relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-24 lg:pt-32 pb-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10" />

      {/* Decorative circles */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl -z-10" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 lg:items-center">
          {/* Left Column - Text */}
          <div className="mb-12 lg:mb-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t('hero.title')}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg lg:text-xl leading-relaxed mb-8">
              {t('hero.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToContact}
                className="w-full sm:w-auto bg-blue-600 text-white py-3.5 px-8 rounded-xl font-medium hover:bg-blue-700 transition-all hover:shadow-lg flex items-center justify-center gap-2"
              >
                {t('hero.cta')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => scrollToSection('process')}
                className="w-full sm:w-auto text-gray-700 py-3.5 px-8 font-medium hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                {t('hero.ctaSecondary')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Column - Phone Mockup */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Phone Frame */}
            <div className="relative w-72 sm:w-80 lg:w-96">
              {/* Phone outer frame */}
              <div className="bg-gray-200 rounded-[3rem] p-2 shadow-2xl">
                {/* Phone inner frame */}
                <div className="bg-white rounded-[2.5rem] overflow-hidden">
                  {/* Phone notch */}
                  <div className="bg-gray-100 h-8 flex items-center justify-center">
                    <div className="w-20 h-5 bg-gray-800 rounded-full" />
                  </div>

                  {/* Phone content */}
                  <div className="bg-gradient-to-b from-blue-50 to-white p-4">
                    {/* AI Assistant Header */}
                    <div className="bg-blue-600 rounded-xl p-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🤖</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">AI Virtual Assistant</p>
                          <p className="text-blue-200 text-xs">Always available</p>
                        </div>
                      </div>
                    </div>

                    {/* Chat bubble */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
                      <p className="text-gray-800 text-sm leading-relaxed">
                        Hello! 👋 I&apos;m your AI assistant. I&apos;ll guide you through a brief call to better understand your needs and book a Zoom meeting.
                      </p>
                      <p className="text-gray-400 text-xs mt-2">12:58 PM</p>
                    </div>

                    {/* Voice indicator */}
                    <div className="flex flex-col items-center py-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      {/* Audio waveform */}
                      <div className="flex items-center gap-1 mb-2">
                        {[12, 18, 10, 22, 14, 26, 16, 20, 12, 24, 14, 18].map((height, i) => (
                          <div
                            key={i}
                            className="w-1 bg-blue-400 rounded-full"
                            style={{ height: `${height}px` }}
                          />
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm font-medium">00:08</p>
                      <p className="text-gray-500 text-xs mt-1">Booking a call in our Google Calendar</p>
                    </div>

                    {/* Stop button */}
                    <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium mb-3">
                      Stop
                    </button>

                    {/* Text input */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-gray-400 text-sm">Enter text instead...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
