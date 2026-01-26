'use client';

import { useLanguage } from '../context/LanguageContext';

export default function ReplaceThisSection() {
  const { t } = useLanguage();

  const problems = [
    t('replaceThis.problem1'),
    t('replaceThis.problem2'),
    t('replaceThis.problem3'),
    t('replaceThis.problem4'),
    t('replaceThis.problem5'),
  ];

  return (
    <section className="relative bg-gradient-to-b from-gray-50 to-white px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl -z-10" />

      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-8 text-center">
          <span className="text-gray-900">{t('replaceThis.title')}</span>
          <span className="text-gray-400 mx-2">→</span>
          <span className="text-gray-600">{t('replaceThis.subtitle')}</span>
        </h2>

        {/* Problems List */}
        <ul className="space-y-4 max-w-2xl mx-auto">
          {problems.map((problem, index) => (
            <li key={index} className="flex items-center gap-3">
              <span className="flex-shrink-0 w-5 h-5 text-red-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              <span className="text-gray-700 text-base sm:text-lg">{problem}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
