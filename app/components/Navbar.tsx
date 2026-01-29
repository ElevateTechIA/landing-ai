'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { scrollToSection } from '../utils/scroll';

export default function Navbar() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Determinar si estamos en la parte superior
      setIsAtTop(currentScrollY < 50);
      
      // Mostrar navbar al hacer scroll hacia arriba, ocultar al hacer scroll hacia abajo
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & not at top
        setIsVisible(false);
      } else {
        // Scrolling up or at top
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      } ${
        isAtTop ? 'bg-white/80 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-md shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 lg:h-20">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl sm:text-2xl font-bold">E</span>
            </div>
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{t('nav.logo')}</span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <button
              onClick={() => scrollToSection('hero')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-base"
            >
              Inicio
            </button>
            <Link
              href="/agent-services"
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-base"
            >
              Agente AI
            </Link>
            <Link
              href="/voice-chat"
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-base"
            >
              Voice Chat
            </Link>
            <button
              onClick={() => scrollToSection('contact-form')}
              className="bg-blue-600 text-white px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg font-medium text-sm lg:text-base"
            >
              Contacto
            </button>
            <LanguageSwitcher />
          </div>

          {/* Mobile Menu */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
