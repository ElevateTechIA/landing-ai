'use client';

import { useLanguage } from '../context/LanguageContext';
import { scrollToContact, scrollToTop } from '../utils/scroll';

export default function ValuePropositionSection() {
  const { t } = useLanguage();

  const problems = [
    {
      problemKey: 'valueProposition.problem1.problem',
      solutionKey: 'valueProposition.problem1.solution',
      descriptionKey: 'valueProposition.problem1.description',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      problemKey: 'valueProposition.problem2.problem',
      solutionKey: 'valueProposition.problem2.solution',
      descriptionKey: 'valueProposition.problem2.description',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      problemKey: 'valueProposition.problem3.problem',
      solutionKey: 'valueProposition.problem3.solution',
      descriptionKey: 'valueProposition.problem3.description',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      problemKey: 'valueProposition.problem4.problem',
      solutionKey: 'valueProposition.problem4.solution',
      descriptionKey: 'valueProposition.problem4.description',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="min-h-screen bg-gray-50 px-4 py-16">
      {/* Navigation Back Button */}
      <button onClick={scrollToTop} className="mb-8 p-2 hover:bg-gray-200 rounded-lg">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Section Header */}
      <div className="max-w-md mx-auto mb-8">
        <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide mb-2">
          {t('valueProposition.section')}
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          {t('valueProposition.title')}
        </h2>
      </div>

      {/* Problem-Solution Cards */}
      <div className="max-w-md mx-auto space-y-6">
        {problems.map((item, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-red-500">
            {/* Problem */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">
                  Problema
                </p>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {t(item.problemKey)}
              </h3>
            </div>

            {/* Solution */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">
                    Solución
                  </p>
                  <h4 className="text-lg font-bold text-gray-900">
                    {t(item.solutionKey)}
                  </h4>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {t(item.descriptionKey)}
              </p>
            </div>
          </div>
        ))}

        {/* CTA Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white mt-8">
          <h3 className="text-2xl font-bold mb-2">
            {t('valueProposition.ctaTitle')}
          </h3>
          <p className="text-blue-100 text-sm mb-6">
            {t('valueProposition.ctaDescription')}
          </p>
          <button
            onClick={scrollToContact}
            className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            {t('valueProposition.cta')}
          </button>
        </div>
      </div>
    </section>
  );
}
