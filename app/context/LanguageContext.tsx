'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const setAndPersistLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    const stored = window.localStorage.getItem('language');
    if (stored === 'en' || stored === 'es') {
      setLanguage(stored);
      document.documentElement.lang = stored;
      return;
    }

    const htmlLang = document.documentElement.lang.toLowerCase();
    if (htmlLang.startsWith('es')) {
      setLanguage('es');
      return;
    }

    const navLang = navigator.language.toLowerCase();
    setLanguage(navLang.startsWith('es') ? 'es' : 'en');
  }, []);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setAndPersistLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

const translations = {
  en: {
    nav: {
      logo: 'Elevate AI',
    },
    hero: {
      title: 'AI Agent That Talks to Your Leads and Books Zoom Meetings for You',
      subtitle: '',
      description: 'Capture, qualify and schedule calls with one 24/7 AI agent that replaces contact forms and back-and-forth emails.',
      cta: 'Start AI Intake (2 minutes)',
      ctaSecondary: 'Try the agent now',
      trust: 'Trusted by',
      trustCount: '50+',
      trustSuffix: 'growing businesses',
      smartFast: 'Fast Automation',
      smartFastDesc: 'Reduce manual work by up to 70%',
      secure: 'Enterprise Security',
      secureDesc: 'Bank-level data protection',
      scroll: 'Discover how we can help',
    },
    heroOriginal: {
      title: 'Custom Software That Drives Real Business Growth Using AI',
      description: 'Stop wasting time on manual processes. We build intelligent software solutions that automate your operations, reduce costs, and scale with your business.',
      cta: 'Let\'s Talk About Your Project',
      ctaSecondary: 'See How It Works',
    },
    howItWorksOriginal: {
      title: 'How We Work',
    },
    valueProposition: {
      section: 'The Problems We Solve',
      title: 'What We Fix For You',
      problem1: {
        problem: 'Slow Manual Processes',
        solution: 'Intelligent Automation',
        description: 'Stop wasting hours on repetitive tasks. We automate your workflows so your team focuses on what matters.',
      },
      problem2: {
        problem: 'Software That Doesn\'t Scale',
        solution: 'Built to Grow',
        description: 'Your current tools can\'t keep up? We build systems that expand seamlessly as your business grows.',
      },
      problem3: {
        problem: 'Losing Money & Time',
        solution: 'Measurable Savings',
        description: 'Every manual error costs you. Our AI-powered solutions reduce mistakes and save you real money.',
      },
      problem4: {
        problem: 'Data You Can\'t Use',
        solution: 'Actionable Insights',
        description: 'Turn your raw data into clear decisions with custom analytics that actually help your business.',
      },
      cta: 'Show Me How',
      ctaTitle: 'Ready to stop losing time and money?',
      ctaDescription: 'Let\'s talk about your specific challenges and how we can solve them.',
      learnMore: 'See solution',
    },
    services: {
      section: 'What We Do',
      title: 'Services That Solve Real Problems',
      description: 'Clear, practical solutions. No technical jargon. Just results.',
      customSoftware: {
        title: 'Custom Software Development',
        description: 'Need something specific? We build exactly what your business needs—from scratch or integrated with your existing tools.',
        benefit: 'Perfect fit for your workflow',
      },
      webApps: {
        title: 'Web Applications',
        description: 'Fast, reliable web apps your customers will love. Dashboards, portals, platforms—built to perform.',
        benefit: 'Speed + reliability',
      },
      backendApis: {
        title: 'Backend & APIs',
        description: 'Solid infrastructure that handles growth. Connect systems, process data, serve thousands of users without breaking.',
        benefit: 'Scales with your business',
      },
      aiAutomation: {
        title: 'AI Process Automation',
        description: 'Let AI handle the repetitive stuff. Document processing, customer queries, data entry—automated intelligently.',
        benefit: 'Save up to 40% time',
      },
      systemIntegrations: {
        title: 'System Integrations',
        description: 'Connect your CRM, payments, inventory, and more. One ecosystem, zero manual data transfer.',
        benefit: 'Everything works together',
      },
      cta: 'Discuss Your Project',
    },
    aiDifferentiator: {
      header: 'Why Choose Us',
      section: 'Our Approach',
      title: 'AI That Actually Works',
      description: 'We don\'t use AI because it\'s trendy. We use it to cut costs, save time, and eliminate errors—that\'s it.',
      whyAiMatters: 'Real AI Benefits (No Hype)',
      optimizeProcesses: {
        title: 'Automate What Wastes Your Time',
        description: 'Document processing, data entry, routine emails—let AI handle it while you focus on growing your business.',
      },
      reduceCosts: {
        title: 'Save Real Money',
        description: 'Reduce manual labor costs by up to 40%. Less errors = less rework = more profit.',
      },
      informedDecisions: {
        title: 'Make Better Decisions, Faster',
        description: 'Your data tells a story. We build AI that turns numbers into clear actions you can take today.',
      },
      ctaTitle: 'Want to see if AI can help your business?',
      ctaDescription: 'Free 15-minute call. We\'ll tell you honestly if AI makes sense for you.',
      cta: 'Book Free Strategy Call',
      ctaNote: 'No sales pitch • No commitment • Just honest advice',
    },
    businessBenefits: {
      section: 'What You Get',
      title: 'Real Benefits for Your Business',
      description: 'No fluff. Just what you actually gain.',
      scalability: {
        title: 'Systems That Grow With You',
        description: 'Start small, scale big. Our solutions handle 100 users or 100,000—without breaking or needing a rebuild.',
      },
      timeEfficiency: {
        title: 'Get Your Time Back',
        description: 'Automate up to 40% of repetitive work. Spend your time growing your business, not doing data entry.',
      },
      smarterDecisions: {
        title: 'Know What\'s Actually Working',
        description: 'Clear dashboards. Real-time insights. See what\'s making money and what\'s wasting it.',
      },
      cta: 'Book a Free Call',
      ctaNote: '30 minutes. No pressure. Just honest advice.',
    },
    howItWorks: {
      title: 'How It Works',
      roadmap: 'Simple, Clear Process',
      description: 'No surprises. No confusion. Just results.',
      step1: {
        title: 'AI Talks to Your Lead',
        description: 'AI gathers their contact info and booking details.',
      },
      step2: {
        title: 'Meeting Scheduled Instantly',
        description: 'Date added to your calendar with Zoom link.',
      },
      step3: {
        title: 'You Get a Prepared Call',
        description: 'Details and transcript sent to your inbox.',
      },
      discover: {
        title: 'Understand Your Problem',
        description: 'We listen to your challenges, identify where you\'re losing time or money, and define exactly what needs fixing.',
      },
      design: {
        title: 'Plan the Solution',
        description: 'Clear proposal with timeline and costs. You know exactly what you\'re getting before we start.',
      },
      build: {
        title: 'Build in Sprints',
        description: 'You see progress every 2 weeks. Test features as we build. Make changes if needed.',
      },
      launch: {
        title: 'Deploy & Train',
        description: 'We integrate everything into your workflow, train your team, and make sure it actually works.',
      },
      improve: {
        title: 'Keep Improving',
        description: 'Need changes? Want new features? We stick around to make sure you keep getting value.',
      },
      cta: 'Let\'s Get Started',
      navHome: 'Home',
      navServices: 'Services',
      navProcess: 'Process',
      navContact: 'Contact',
    },
    replaceThis: {
      title: 'Replace This',
      subtitle: 'With One AI Agent',
      problem1: 'Manual follow-ups',
      problem2: 'Missed leads',
      problem3: 'Back-and-forth emails',
      problem4: 'Follow-up no-shows',
      problem5: 'Unqualified calls',
      needHelp: 'Need help?',
      startCall: 'Start a call',
    },
    trustTechStack: {
      section: 'Experience & Tools',
      title: 'Technology That Works',
      description: 'We use proven, reliable tech. No experiments on your project.',
      techUsed: 'Trusted Technologies',
      caseStudies: 'Real Projects, Real Results',
      retailTransformation: {
        label: 'E-commerce',
        title: 'Inventory System Automation',
        description: 'Reduced order processing time from 2 hours to 5 minutes. Eliminated manual errors completely.',
        result: '95% faster + zero errors',
      },
      aiImplementation: {
        label: 'Customer Service',
        title: 'AI Support Assistant',
        description: 'Automated 70% of common questions. Support team now focuses on complex issues that actually need humans.',
        result: '70% less support tickets',
      },
      readMore: 'See Details',
      cta: 'See More Projects',
    },
    finalCta: {
      header: 'Get Started',
      trust: 'Join successful businesses already saving time & money',
      title: 'Tell Me About Your Challenge',
      description: 'Share your biggest frustration—manual processes, slow systems, data chaos—whatever it is. We\'ll tell you honestly if we can help.',
      emailPlaceholder: 'your@email.com',
      namePlaceholder: 'Your name',
      messagePlaceholder: 'What\'s your biggest challenge right now?',
      cta: "Send Message",
      ctaAlt: 'Or book a 15-min call',
      note: 'We respond within 4 hours. No spam. No sales pressure.',
      privacyNote: 'Your information is safe. We never share your data.',
    },
  },
  es: {
    nav: {
      logo: 'Elevate AI',
    },
    hero: {
      title: 'Agente IA Que Habla con Tus Leads y Agenda Reuniones de Zoom por Ti',
      subtitle: '',
      description: 'Captura, califica y agenda llamadas con un agente IA 24/7 que reemplaza formularios de contacto y emails de ida y vuelta.',
      cta: 'Iniciar Intake IA (2 minutos)',
      ctaSecondary: 'Probar el agente ahora',
      trust: 'Confiado por',
      trustCount: '50+',
      trustSuffix: 'negocios en crecimiento',
      smartFast: 'Automatización Rápida',
      smartFastDesc: 'Reduce trabajo manual hasta 70%',
      secure: 'Seguridad Empresarial',
      secureDesc: 'Protección nivel bancario',
      scroll: 'Descubre cómo podemos ayudarte',
    },
    heroOriginal: {
      title: 'Software a Medida Que Impulsa el Crecimiento Real de Tu Negocio Usando IA',
      description: 'Deja de perder tiempo en procesos manuales. Construimos soluciones inteligentes que automatizan tus operaciones, reducen costos y escalan con tu negocio.',
      cta: 'Hablemos de Tu Proyecto',
      ctaSecondary: 'Ver Cómo Funciona',
    },
    howItWorksOriginal: {
      title: 'Cómo Trabajamos',
    },
    valueProposition: {
      section: 'Los Problemas Que Solucionamos',
      title: 'Lo Que Arreglamos Para Ti',
      problem1: {
        problem: 'Procesos Manuales Lentos',
        solution: 'Automatización Inteligente',
        description: 'Deja de perder horas en tareas repetitivas. Automatizamos tus procesos para que tu equipo se enfoque en lo importante.',
      },
      problem2: {
        problem: 'Software Que No Escala',
        solution: 'Construido Para Crecer',
        description: '¿Tus herramientas actuales no dan abasto? Construimos sistemas que se expanden sin problemas mientras creces.',
      },
      problem3: {
        problem: 'Perdiendo Dinero y Tiempo',
        solution: 'Ahorros Medibles',
        description: 'Cada error manual te cuesta dinero. Nuestras soluciones con IA reducen errores y te ahorran dinero real.',
      },
      problem4: {
        problem: 'Datos Que No Puedes Usar',
        solution: 'Información Accionable',
        description: 'Convierte tus datos en decisiones claras con análisis personalizados que realmente ayudan a tu negocio.',
      },
      cta: 'Muéstrame Cómo',
      ctaTitle: '¿Listo para dejar de perder tiempo y dinero?',
      ctaDescription: 'Hablemos de tus desafíos específicos y cómo podemos solucionarlos.',
      learnMore: 'Ver solución',
    },
    services: {
      section: 'Qué Hacemos',
      title: 'Servicios Que Resuelven Problemas Reales',
      description: 'Soluciones claras y prácticas. Sin jerga técnica. Solo resultados.',
      customSoftware: {
        title: 'Desarrollo de Software a Medida',
        description: '¿Necesitas algo específico? Construimos exactamente lo que tu negocio necesita—desde cero o integrado con tus herramientas existentes.',
        benefit: 'Ajuste perfecto a tu flujo de trabajo',
      },
      webApps: {
        title: 'Aplicaciones Web',
        description: 'Apps web rápidas y confiables que tus clientes amarán. Dashboards, portales, plataformas—construidas para funcionar.',
        benefit: 'Velocidad + confiabilidad',
      },
      backendApis: {
        title: 'Backend y APIs',
        description: 'Infraestructura sólida que maneja el crecimiento. Conecta sistemas, procesa datos, sirve a miles sin romperse.',
        benefit: 'Escala con tu negocio',
      },
      aiAutomation: {
        title: 'Automatización de Procesos con IA',
        description: 'Deja que la IA maneje lo repetitivo. Procesamiento de documentos, consultas de clientes, entrada de datos—automatizado inteligentemente.',
        benefit: 'Ahorra hasta 40% de tiempo',
      },
      systemIntegrations: {
        title: 'Integraciones de Sistemas',
        description: 'Conecta tu CRM, pagos, inventario y más. Un ecosistema, cero transferencia manual de datos.',
        benefit: 'Todo funciona junto',
      },
      cta: 'Hablar de Tu Proyecto',
    },
    aiDifferentiator: {
      header: 'Por Qué Elegirnos',
      section: 'Nuestro Enfoque',
      title: 'IA Que Realmente Funciona',
      description: 'No usamos IA por moda. La usamos para reducir costos, ahorrar tiempo y eliminar errores—punto.',
      whyAiMatters: 'Beneficios Reales de IA (Sin Exageraciones)',
      optimizeProcesses: {
        title: 'Automatiza Lo Que Te Hace Perder Tiempo',
        description: 'Procesamiento de documentos, entrada de datos, emails rutinarios—deja que la IA lo maneje mientras tú te enfocas en crecer.',
      },
      reduceCosts: {
        title: 'Ahorra Dinero Real',
        description: 'Reduce costos de mano de obra hasta 40%. Menos errores = menos retrabajo = más ganancias.',
      },
      informedDecisions: {
        title: 'Toma Mejores Decisiones, Más Rápido',
        description: 'Tus datos cuentan una historia. Construimos IA que convierte números en acciones claras que puedes tomar hoy.',
      },
      ctaTitle: '¿Quieres ver si la IA puede ayudar a tu negocio?',
      ctaDescription: 'Llamada gratis de 15 minutos. Te diremos honestamente si la IA tiene sentido para ti.',
      cta: 'Agendar Llamada Estratégica Gratis',
      ctaNote: 'Sin discurso de ventas • Sin compromiso • Solo consejos honestos',
    },
    businessBenefits: {
      section: 'Qué Obtienes',
      title: 'Beneficios Reales Para Tu Negocio',
      description: 'Sin rodeos. Solo lo que realmente ganas.',
      scalability: {
        title: 'Sistemas Que Crecen Contigo',
        description: 'Empieza pequeño, escala grande. Nuestras soluciones manejan 100 usuarios o 100,000—sin romperse ni necesitar reconstrucción.',
      },
      timeEfficiency: {
        title: 'Recupera Tu Tiempo',
        description: 'Automatiza hasta 40% del trabajo repetitivo. Usa tu tiempo en hacer crecer tu negocio, no en captura de datos.',
      },
      smarterDecisions: {
        title: 'Sabe Qué Está Funcionando Realmente',
        description: 'Dashboards claros. Información en tiempo real. Ve qué está generando dinero y qué lo está desperdiciando.',
      },
      cta: 'Agendar Llamada Gratis',
      ctaNote: '30 minutos. Sin presión. Solo consejos honestos.',
    },
    howItWorks: {
      title: 'Cómo Funciona',
      roadmap: 'Proceso Simple y Claro',
      description: 'Sin sorpresas. Sin confusión. Solo resultados.',
      step1: {
        title: 'IA Habla con Tu Lead',
        description: 'La IA recopila su información de contacto y detalles de reserva.',
      },
      step2: {
        title: 'Reunión Agendada al Instante',
        description: 'Fecha agregada a tu calendario con enlace de Zoom.',
      },
      step3: {
        title: 'Recibes una Llamada Preparada',
        description: 'Detalles y transcripción enviados a tu inbox.',
      },
      discover: {
        title: 'Entender Tu Problema',
        description: 'Escuchamos tus desafíos, identificamos dónde pierdes tiempo o dinero, y definimos exactamente qué necesita arreglarse.',
      },
      design: {
        title: 'Planear la Solución',
        description: 'Propuesta clara con plazos y costos. Sabes exactamente qué obtendrás antes de empezar.',
      },
      build: {
        title: 'Construir en Sprints',
        description: 'Ves progreso cada 2 semanas. Pruebas funciones mientras construimos. Haces cambios si es necesario.',
      },
      launch: {
        title: 'Implementar y Capacitar',
        description: 'Integramos todo en tu flujo de trabajo, capacitamos a tu equipo y nos aseguramos que funcione.',
      },
      improve: {
        title: 'Seguir Mejorando',
        description: '¿Necesitas cambios? ¿Quieres nuevas funciones? Nos quedamos para asegurar que sigas obteniendo valor.',
      },
      cta: 'Empecemos',
      navHome: 'Inicio',
      navServices: 'Servicios',
      navProcess: 'Proceso',
      navContact: 'Contacto',
    },
    replaceThis: {
      title: 'Reemplaza Esto',
      subtitle: 'Con Un Agente IA',
      problem1: 'Seguimientos manuales',
      problem2: 'Leads perdidos',
      problem3: 'Emails de ida y vuelta',
      problem4: 'No-shows de seguimiento',
      problem5: 'Llamadas no calificadas',
      needHelp: '¿Necesitas ayuda?',
      startCall: 'Iniciar llamada',
    },
    trustTechStack: {
      section: 'Experiencia y Herramientas',
      title: 'Tecnología Que Funciona',
      description: 'Usamos tecnología probada y confiable. Sin experimentos en tu proyecto.',
      techUsed: 'Tecnologías de Confianza',
      caseStudies: 'Proyectos Reales, Resultados Reales',
      retailTransformation: {
        label: 'E-commerce',
        title: 'Automatización de Sistema de Inventario',
        description: 'Redujimos el tiempo de procesamiento de pedidos de 2 horas a 5 minutos. Eliminamos errores manuales completamente.',
        result: '95% más rápido + cero errores',
      },
      aiImplementation: {
        label: 'Atención al Cliente',
        title: 'Asistente de Soporte con IA',
        description: 'Automatizamos 70% de preguntas comunes. El equipo de soporte ahora se enfoca en problemas complejos que realmente necesitan humanos.',
        result: '70% menos tickets de soporte',
      },
      readMore: 'Ver Detalles',
      cta: 'Ver Más Proyectos',
    },
    finalCta: {
      header: 'Comienza Ahora',
      trust: 'Únete a negocios exitosos que ya están ahorrando tiempo y dinero',
      title: 'Cuéntame Sobre Tu Desafío',
      description: 'Comparte tu mayor frustración—procesos manuales, sistemas lentos, caos de datos—lo que sea. Te diremos honestamente si podemos ayudar.',
      emailPlaceholder: 'tu@email.com',
      namePlaceholder: 'Tu nombre',
      messagePlaceholder: '¿Cuál es tu mayor desafío ahora mismo?',
      cta: "Enviar Mensaje",
      ctaAlt: 'O agenda una llamada de 15 min',
      note: 'Respondemos en 4 horas. Sin spam. Sin presión de ventas.',
      privacyNote: 'Tu información está segura. Nunca compartimos tus datos.',
    },
  },
};
