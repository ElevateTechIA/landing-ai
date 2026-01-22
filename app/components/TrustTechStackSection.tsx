'use client';

import { useLanguage } from '../context/LanguageContext';
import { scrollToContact, scrollToTop } from '../utils/scroll';

export default function TrustTechStackSection() {
  const { t } = useLanguage();

  const techStack = [
    { name: "React", color: "bg-blue-500" },
    { name: "Python", color: "bg-yellow-500" },
    { name: "AWS", color: "bg-orange-500" },
    { name: "Node.js", color: "bg-green-600" }
  ];

  const caseStudies = [
    {
      labelKey: 'trustTechStack.retailTransformation.label',
      titleKey: 'trustTechStack.retailTransformation.title',
      descriptionKey: 'trustTechStack.retailTransformation.description',
    },
    {
      labelKey: 'trustTechStack.aiImplementation.label',
      titleKey: 'trustTechStack.aiImplementation.title',
      descriptionKey: 'trustTechStack.aiImplementation.description',
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
        <div className="mb-8">
          <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide mb-2">
            {t('trustTechStack.section')}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('trustTechStack.title')}
          </h2>
          <p className="text-gray-600 text-base leading-relaxed">
            {t('trustTechStack.description')}
          </p>
        </div>

        {/* Tech Stack Icons */}
        <div className="flex items-center justify-center gap-6 mb-12 py-6">
          {techStack.map((tech, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 ${tech.color} rounded-lg flex items-center justify-center text-white font-bold shadow-md`}>
                {tech.name.substring(0, 1)}
              </div>
              <span className="text-xs text-gray-600 font-medium">{tech.name}</span>
            </div>
          ))}
        </div>

        {/* Featured Case Studies */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {t('trustTechStack.caseStudies')}
          </h3>

          <div className="space-y-6">
            {/* Case Study 1 - Dashboard Image */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl overflow-hidden">
              <div className="p-6 pb-0">
                <div className="bg-white rounded-t-xl p-4 shadow-sm">
                  {/* Mock Dashboard */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    </div>
                    <span className="text-xs text-gray-400">Dashboard</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end h-20">
                        <div className="w-6 bg-teal-400 rounded-t" style={{height: '40%'}}></div>
                        <div className="w-6 bg-teal-400 rounded-t" style={{height: '70%'}}></div>
                        <div className="w-6 bg-teal-400 rounded-t" style={{height: '55%'}}></div>
                        <div className="w-6 bg-teal-400 rounded-t" style={{height: '85%'}}></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#14b8a6" strokeWidth="3" strokeDasharray="75 25" strokeLinecap="round"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">75%</div>
                      </div>
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="60 40" strokeLinecap="round"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">60%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-2">
                  {t(caseStudies[0].labelKey)}
                </p>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {t(caseStudies[0].titleKey)}
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {t(caseStudies[0].descriptionKey)}
                </p>
                <button className="text-blue-600 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all">
                  {t('trustTechStack.readMore')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Case Study 2 - AI Analytics */}
            <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-2xl overflow-hidden">
              <div className="p-6 pb-0">
                <div className="relative h-40 bg-gradient-to-br from-blue-950 to-black rounded-xl overflow-hidden">
                  {/* AI Visualization */}
                  <div className="absolute inset-0">
                    <svg className="w-full h-full" viewBox="0 0 300 160" fill="none">
                      {/* Grid lines */}
                      <line x1="0" y1="40" x2="300" y2="40" stroke="#1e3a8a" strokeWidth="0.5" opacity="0.3"/>
                      <line x1="0" y1="80" x2="300" y2="80" stroke="#1e3a8a" strokeWidth="0.5" opacity="0.3"/>
                      <line x1="0" y1="120" x2="300" y2="120" stroke="#1e3a8a" strokeWidth="0.5" opacity="0.3"/>
                      {/* Bars */}
                      <rect x="30" y="90" width="15" height="60" fill="#3b82f6" opacity="0.6"/>
                      <rect x="70" y="70" width="15" height="80" fill="#3b82f6" opacity="0.6"/>
                      <rect x="110" y="50" width="15" height="100" fill="#3b82f6" opacity="0.6"/>
                      <rect x="150" y="60" width="15" height="90" fill="#3b82f6" opacity="0.6"/>
                      <rect x="190" y="40" width="15" height="110" fill="#3b82f6" opacity="0.6"/>
                      <rect x="230" y="55" width="15" height="95" fill="#3b82f6" opacity="0.6"/>
                      {/* Waveform */}
                      <path d="M0 100 Q30 80, 60 90 T120 85 T180 95 T240 80 T300 90" stroke="#60a5fa" strokeWidth="2" fill="none"/>
                    </svg>
                  </div>
                  {/* Glow effect */}
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-30"></div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-2">
                  {t(caseStudies[1].labelKey)}
                </p>
                <h4 className="text-xl font-bold text-white mb-2">
                  {t(caseStudies[1].titleKey)}
                </h4>
                <p className="text-blue-100 text-sm leading-relaxed mb-4">
                  {t(caseStudies[1].descriptionKey)}
                </p>
                <button className="text-blue-400 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all">
                  {t('trustTechStack.readMore')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View All Button */}
        <div>
          <button
            onClick={scrollToContact}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors text-lg"
          >
            {t('trustTechStack.cta')}
          </button>
        </div>
      </div>
    </section>
  );
}
