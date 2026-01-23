'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  showSchedulingButton?: boolean;
  showSlots?: boolean;
  slots?: string[];
  slotsRaw?: string[];
  showAlternatives?: boolean;
  alternatives?: Array<{ datetime: string; displayText: string }>;
  showRetryDateInput?: boolean;
  showConfirmButtons?: boolean;
}

interface UserData {
  name: string;
  email: string;
  phone: string;
  company: string;
  challenge: string;
  objectives: string;
  expectations: string;
  budget: string;
  timeline: string;
}

type SchedulingStep =
  | 'idle'
  | 'name'
  | 'email'
  | 'phone'
  | 'company'
  | 'challenge'
  | 'objectives'
  | 'budget'
  | 'timeline'
  | 'request_datetime'      // Nuevo: pedir fecha/hora al usuario
  | 'checking_availability' // Nuevo: verificando disponibilidad
  | 'show_alternatives'     // Nuevo: mostrando alternativas
  | 'loading_slots'
  | 'select_slot'
  | 'confirming'
  | 'scheduling'
  | 'completed';

interface ChatbotProps {
  isEmbedded?: boolean;
}

export default function Chatbot({ isEmbedded = false }: ChatbotProps) {
  const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(isEmbedded);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scheduling state
  const [schedulingStep, setSchedulingStep] = useState<SchedulingStep>('idle');
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    challenge: '',
    objectives: '',
    expectations: '',
    budget: '',
    timeline: ''
  });
  // These are used for slot management during scheduling
  const [, setAvailableSlots] = useState<string[]>([]);
  const [, setAvailableSlotsRaw] = useState<string[]>([]);

  // Para el nuevo flujo de fecha/hora conversacional
  const [requestedSlot, setRequestedSlot] = useState<{ datetime: string; displayText: string } | null>(null);
  const [alternatives, setAlternatives] = useState<Array<{ datetime: string; displayText: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const isInputDisabled = isLoading
      || schedulingStep === 'select_slot'
      || schedulingStep === 'scheduling'
      || schedulingStep === 'loading_slots'
      || schedulingStep === 'checking_availability';

    if (isOpen && !isInputDisabled) {
      inputRef.current?.focus();
    }
  }, [isLoading, schedulingStep, isOpen]);

  useEffect(() => {
    if (isEmbedded && messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content: language === 'es'
          ? '¡Hola! 👋 Soy tu asistente de Elevate Tech Agency. Puedo ayudarte a conocer nuestros servicios o agendar una reunión con nuestro equipo. ¿Qué te gustaría hacer?'
          : 'Hello! 👋 I\'m your Elevate Tech Agency assistant. I can help you learn about our services or schedule a meeting with our team. What would you like to do?',
        timestamp: new Date(),
        showSchedulingButton: true
      };
      setMessages([welcomeMessage]);
    }
  }, [isEmbedded, language, messages.length]);


  const addAssistantMessage = (content: string, extras?: Partial<Message>) => {
    const message: Message = {
      role: 'assistant',
      content,
      timestamp: new Date(),
      ...extras
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const startScheduling = () => {
    setSchedulingStep('name');
    addAssistantMessage(
      language === 'es'
        ? '¡Perfecto! Vamos a agendar una reunión gratuita. 📅\n\nPrimero, ¿cuál es tu nombre completo?'
        : 'Perfect! Let\'s schedule a free consultation. 📅\n\nFirst, what\'s your full name?'
    );
  };

  // Verificar disponibilidad de una fecha/hora específica
  const checkDateTimeAvailability = async (userInput: string) => {
    setSchedulingStep('checking_availability');
    addAssistantMessage(
      language === 'es'
        ? '⏳ Verificando disponibilidad...'
        : '⏳ Checking availability...'
    );

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/calendar/check-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput, timezone, language })
      });

      const data = await response.json();

      // Quitar mensaje de "verificando"
      setMessages(prev => prev.slice(0, -1));

      if (!data.success) {
        // Error de parseo o disponibilidad
        if (data.parseError) {
          setSchedulingStep('request_datetime');
          addAssistantMessage(
            language === 'es'
              ? `❌ ${data.parseError}\n\nPor favor, indica la fecha y hora en un formato claro. Por ejemplo:\n• "Mañana a las 10am"\n• "El viernes a las 3pm"\n• "27 de enero a las 2 de la tarde"`
              : `❌ ${data.parseError}\n\nPlease provide the date and time in a clear format. For example:\n• "Tomorrow at 10am"\n• "Friday at 3pm"\n• "January 27th at 2pm"`
          );
        } else {
          addAssistantMessage(
            language === 'es'
              ? '❌ Hubo un error al verificar. Por favor, intenta de nuevo.'
              : '❌ There was an error checking. Please try again.'
          );
          setSchedulingStep('request_datetime');
        }
        return;
      }

      if (data.available && data.requestedSlot) {
        // ¡Disponible! Proceder a confirmar
        setRequestedSlot(data.requestedSlot);
        addAssistantMessage(
          language === 'es'
            ? `✅ ¡Excelente! El horario está disponible:\n\n📅 ${data.requestedSlot.displayText}\n\n¿Deseas confirmar esta reunión?`
            : `✅ Great! The time slot is available:\n\n📅 ${data.requestedSlot.displayText}\n\nWould you like to confirm this meeting?`,
          { showConfirmButtons: true }
        );
        setSchedulingStep('confirming');
      } else {
        // No disponible - mostrar alternativas
        setRequestedSlot(data.requestedSlot);
        setAlternatives(data.alternatives || []);

        if (data.alternatives && data.alternatives.length > 0) {
          setSchedulingStep('show_alternatives');
          addAssistantMessage(
            language === 'es'
              ? `😔 Lo siento, el horario solicitado (${data.requestedSlot?.displayText}) no está disponible.\n\nPero tengo estas alternativas cercanas:`
              : `😔 Sorry, the requested time (${data.requestedSlot?.displayText}) is not available.\n\nBut I have these nearby alternatives:`,
            {
              showAlternatives: true,
              alternatives: data.alternatives,
              showRetryDateInput: true
            }
          );
        } else {
          setSchedulingStep('request_datetime');
          addAssistantMessage(
            language === 'es'
              ? `😔 Lo siento, el horario solicitado no está disponible y no encontré alternativas cercanas.\n\nPor favor, sugiere otra fecha y hora.`
              : `😔 Sorry, the requested time is not available and I couldn't find nearby alternatives.\n\nPlease suggest another date and time.`
          );
        }
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      setMessages(prev => prev.slice(0, -1));
      addAssistantMessage(
        language === 'es'
          ? '❌ Error al verificar disponibilidad. Por favor, intenta de nuevo.'
          : '❌ Error checking availability. Please try again.'
      );
      setSchedulingStep('request_datetime');
    }
  };

  // Seleccionar una alternativa
  const selectAlternative = (alternative: { datetime: string; displayText: string }) => {
    setRequestedSlot(alternative);
    addUserMessage(alternative.displayText);
    selectSlot(alternative.displayText, alternative.datetime);
  };

  const loadAvailableSlots = async () => {
    setSchedulingStep('loading_slots');
    addAssistantMessage(
      language === 'es'
        ? '⏳ Cargando horarios disponibles...'
        : '⏳ Loading available time slots...'
    );

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/calendar/available-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone })
      });

      const data = await response.json();

      if (data.success && data.slots.length > 0) {
        setAvailableSlots(data.slots);
        setAvailableSlotsRaw(data.raw);
        setSchedulingStep('select_slot');

        // Remove loading message and show slots
        setMessages(prev => prev.slice(0, -1));
        addAssistantMessage(
          language === 'es'
            ? `✅ Encontré ${data.slots.length} horarios disponibles.\n\nSelecciona el que mejor te convenga:`
            : `✅ Found ${data.slots.length} available time slots.\n\nSelect the one that works best for you:`,
          { showSlots: true, slots: data.slots, slotsRaw: data.raw }
        );
      } else {
        setMessages(prev => prev.slice(0, -1));
        addAssistantMessage(
          language === 'es'
            ? '😔 No hay horarios disponibles en este momento. Por favor, intenta más tarde o contáctanos directamente a elevatetechagency@gmail.com'
            : '😔 No available time slots at the moment. Please try again later or contact us directly at elevatetechagency@gmail.com'
        );
        setSchedulingStep('idle');
      }
    } catch (err) {
      console.error('Error loading slots:', err);
      setMessages(prev => prev.slice(0, -1));
      addAssistantMessage(
        language === 'es'
          ? '❌ Error al cargar horarios. Por favor, intenta de nuevo.'
          : '❌ Error loading time slots. Please try again.'
      );
      setSchedulingStep('idle');
    }
  };

  const selectSlot = async (slotDisplay: string, slotRaw: string) => {
    setSchedulingStep('scheduling');

    addUserMessage(slotDisplay);
    addAssistantMessage(
      language === 'es'
        ? `⏳ Agendando tu reunión para:\n📅 ${slotDisplay}\n\nPor favor espera...`
        : `⏳ Scheduling your meeting for:\n📅 ${slotDisplay}\n\nPlease wait...`
    );

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          selectedSlot: slotRaw,
          timezone
        })
      });

      const data = await response.json();

      setMessages(prev => prev.slice(0, -1));

      if (data.success) {
        setSchedulingStep('completed');
        addAssistantMessage(
          language === 'es'
            ? `🎉 ¡Reunión agendada exitosamente!\n\n📅 Fecha: ${slotDisplay}\n🔗 Link de Zoom: ${data.zoomLink}\n\n📧 Te hemos enviado un correo con todos los detalles a ${userData.email}.\n\n¡Nos vemos pronto! 👋`
            : `🎉 Meeting scheduled successfully!\n\n📅 Date: ${slotDisplay}\n🔗 Zoom Link: ${data.zoomLink}\n\n📧 We've sent you an email with all the details to ${userData.email}.\n\nSee you soon! 👋`
        );
      } else {
        addAssistantMessage(
          language === 'es'
            ? `❌ Error al agendar: ${data.error || 'Por favor intenta de nuevo.'}`
            : `❌ Scheduling error: ${data.error || 'Please try again.'}`
        );
        setSchedulingStep('select_slot');
      }
    } catch (err) {
      console.error('Error scheduling:', err);
      setMessages(prev => prev.slice(0, -1));
      addAssistantMessage(
        language === 'es'
          ? '❌ Error al agendar la reunión. Por favor, intenta de nuevo.'
          : '❌ Error scheduling the meeting. Please try again.'
      );
      setSchedulingStep('select_slot');
    }
  };

  const processSchedulingInput = (userInput: string) => {
    const trimmedInput = userInput.trim();
    addUserMessage(trimmedInput);

    switch (schedulingStep) {
      case 'name':
        if (trimmedInput.length < 2) {
          addAssistantMessage(
            language === 'es'
              ? 'Por favor, ingresa tu nombre completo.'
              : 'Please enter your full name.'
          );
          return;
        }
        setUserData(prev => ({ ...prev, name: trimmedInput }));
        setSchedulingStep('email');
        addAssistantMessage(
          language === 'es'
            ? `Gracias, ${trimmedInput}! 😊\n\n¿Cuál es tu correo electrónico?`
            : `Thanks, ${trimmedInput}! 😊\n\nWhat's your email address?`
        );
        break;

      case 'email':
        if (!validateEmail(trimmedInput)) {
          addAssistantMessage(
            language === 'es'
              ? 'Por favor, ingresa un correo electrónico válido (ejemplo: tu@email.com)'
              : 'Please enter a valid email address (example: you@email.com)'
          );
          return;
        }
        setUserData(prev => ({ ...prev, email: trimmedInput }));
        setSchedulingStep('phone');
        addAssistantMessage(
          language === 'es'
            ? '¿Cuál es tu número de teléfono? (con código de país)'
            : 'What\'s your phone number? (with country code)'
        );
        break;

      case 'phone':
        if (!validatePhone(trimmedInput)) {
          addAssistantMessage(
            language === 'es'
              ? 'Por favor, ingresa un número de teléfono válido (mínimo 10 dígitos)'
              : 'Please enter a valid phone number (minimum 10 digits)'
          );
          return;
        }
        setUserData(prev => ({ ...prev, phone: trimmedInput }));
        setSchedulingStep('company');
        addAssistantMessage(
          language === 'es'
            ? '¿Cuál es el nombre de tu empresa o proyecto? (Si eres independiente, puedes poner tu nombre)'
            : 'What\'s your company or project name? (If independent, you can use your name)'
        );
        break;

      case 'company':
        setUserData(prev => ({ ...prev, company: trimmedInput }));
        setSchedulingStep('challenge');
        addAssistantMessage(
          language === 'es'
            ? '¿Cuál es el principal desafío o proyecto que quieres resolver?\n\n(Por ejemplo: "Necesito automatizar mi proceso de ventas" o "Quiero crear una app móvil")'
            : 'What\'s the main challenge or project you want to solve?\n\n(For example: "I need to automate my sales process" or "I want to create a mobile app")'
        );
        break;

      case 'challenge':
        setUserData(prev => ({ ...prev, challenge: trimmedInput }));
        setSchedulingStep('objectives');
        addAssistantMessage(
          language === 'es'
            ? '¿Cuáles son tus objetivos principales con este proyecto?'
            : 'What are your main objectives with this project?'
        );
        break;

      case 'objectives':
        setUserData(prev => ({ ...prev, objectives: trimmedInput, expectations: trimmedInput }));
        setSchedulingStep('budget');
        addAssistantMessage(
          language === 'es'
            ? '¿Tienes un presupuesto estimado para este proyecto?\n\n(Por ejemplo: "$5,000 - $10,000 USD" o "Aún no definido")'
            : 'Do you have an estimated budget for this project?\n\n(For example: "$5,000 - $10,000 USD" or "Not yet defined")'
        );
        break;

      case 'budget':
        setUserData(prev => ({ ...prev, budget: trimmedInput }));
        setSchedulingStep('timeline');
        addAssistantMessage(
          language === 'es'
            ? '¿Cuál es tu timeline ideal para completar este proyecto?\n\n(Por ejemplo: "3 meses" o "Lo antes posible")'
            : 'What\'s your ideal timeline to complete this project?\n\n(For example: "3 months" or "As soon as possible")'
        );
        break;

      case 'timeline':
        setUserData(prev => ({ ...prev, timeline: trimmedInput }));
        setSchedulingStep('request_datetime');
        addAssistantMessage(
          language === 'es'
            ? `¡Excelente! Tengo toda la información necesaria. 📋\n\n¿Cuándo te gustaría agendar la reunión?\n\nPuedes decirme la fecha y hora que prefieras, por ejemplo:\n• "Mañana a las 10am"\n• "El viernes a las 3 de la tarde"\n• "La próxima semana en la mañana"`
            : `Excellent! I have all the necessary information. 📋\n\nWhen would you like to schedule the meeting?\n\nYou can tell me your preferred date and time, for example:\n• "Tomorrow at 10am"\n• "Friday at 3pm"\n• "Next week in the morning"`
        );
        break;

      case 'request_datetime':
        // El usuario dice una fecha/hora en lenguaje natural
        checkDateTimeAvailability(trimmedInput);
        break;

      case 'show_alternatives':
        // El usuario propone otra fecha en lugar de las alternativas
        checkDateTimeAvailability(trimmedInput);
        break;


      case 'confirming': {
        const normalized = trimmedInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const isYes = ['si', 'yes', 'y', 'confirm', 'confirmar'].includes(normalized);
        const isNo = ['no', 'n', 'cancel', 'cancelar'].includes(normalized);

        if (isYes) {
          if (!requestedSlot) {
            setSchedulingStep('request_datetime');
            addAssistantMessage(
              language === 'es'
                ? 'No tengo el horario seleccionado. Por favor, dime otra fecha y hora.'
                : 'I do not have a selected time. Please tell me another date and time.'
            );
            return;
          }
          selectSlot(requestedSlot.displayText, requestedSlot.datetime);
          return;
        }

        if (isNo) {
          setSchedulingStep('request_datetime');
          addAssistantMessage(
            language === 'es'
              ? 'Entendido. Indica otra fecha y hora que te funcione.'
              : 'Got it. Please provide another date and time that works for you.'
          );
          return;
        }

        addAssistantMessage(
          language === 'es'
            ? 'Por favor responde "Si" o "No".'
            : 'Please respond with "Yes" or "No".'
        );
        break;
      }
      default:
        break;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');

    // If in scheduling flow, process scheduling input
    if (schedulingStep !== 'idle' && schedulingStep !== 'completed' && schedulingStep !== 'select_slot' && schedulingStep !== 'checking_availability') {
      processSchedulingInput(userInput);
      return;
    }

    // Check if user wants to schedule
    const scheduleKeywords = ['agendar', 'reunión', 'reunion', 'cita', 'schedule', 'meeting', 'appointment', 'llamada', 'call'];
    const wantsToSchedule = scheduleKeywords.some(keyword =>
      userInput.toLowerCase().includes(keyword)
    );

    if (wantsToSchedule && schedulingStep === 'idle') {
      addUserMessage(userInput);
      startScheduling();
      return;
    }

    // Normal chat flow
    const userMessage: Message = {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        showSchedulingButton: data.showScheduling
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setSchedulingStep('idle');
    setUserData({
      name: '',
      email: '',
      phone: '',
      company: '',
      challenge: '',
      objectives: '',
      expectations: '',
      budget: '',
      timeline: ''
    });
    setAvailableSlots([]);
    setAvailableSlotsRaw([]);
    setRequestedSlot(null);
    setAlternatives([]);

    if (isEmbedded) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content: language === 'es'
          ? '¡Hola! 👋 Soy tu asistente de Elevate Tech Agency. Puedo ayudarte a conocer nuestros servicios o agendar una reunión con nuestro equipo. ¿Qué te gustaría hacer?'
          : 'Hello! 👋 I\'m your Elevate Tech Agency assistant. I can help you learn about our services or schedule a meeting with our team. What would you like to do?',
        timestamp: new Date(),
        showSchedulingButton: true
      };
      setMessages([welcomeMessage]);
    }
  };

  const renderSlotButtons = (slots: string[], slotsRaw: string[]) => {
    return (
      <div className="mt-3 space-y-2">
        {slots.map((slot, index) => (
          <button
            key={index}
            onClick={() => selectSlot(slot, slotsRaw[index])}
            className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-sm font-medium text-blue-800"
          >
            📅 {slot}
          </button>
        ))}
      </div>
    );
  };

  const renderAlternativeButtons = (alts: Array<{ datetime: string; displayText: string }>) => {
    return (
      <div className="mt-3 space-y-2">
        {alts.map((alt, index) => (
          <button
            key={index}
            onClick={() => selectAlternative(alt)}
            className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-sm font-medium text-green-800"
          >
            📅 {alt.displayText}
          </button>
        ))}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">
            {language === 'es'
              ? '¿Ninguna te conviene? Escribe otra fecha y hora:'
              : 'None of these work? Type another date and time:'}
          </p>
        </div>
      </div>
    );
  };

  // Embedded version
  if (isEmbedded) {
    return (
      <div className="w-full h-[600px] bg-white rounded-2xl flex flex-col border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-blue-600 text-2xl sm:text-3xl font-bold">E</span>
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl">
                {language === 'es' ? 'Asistente de Elevate' : 'Elevate Assistant'}
              </h3>
              <p className="text-sm sm:text-base text-blue-100">
                {schedulingStep === 'request_datetime' || schedulingStep === 'show_alternatives'
                  ? (language === 'es' ? 'Selecciona fecha y hora' : 'Select date and time')
                  : schedulingStep !== 'idle' && schedulingStep !== 'completed'
                    ? (language === 'es' ? 'Agendando reunión...' : 'Scheduling meeting...')
                    : (language === 'es' ? 'Pregúntame lo que necesites' : 'Ask me anything')}
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            title={language === 'es' ? 'Reiniciar chat' : 'Reset chat'}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 sm:px-5 py-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>

                {/* Scheduling button */}
                {message.showSchedulingButton && schedulingStep === 'idle' && (
                  <button
                    onClick={startScheduling}
                    className="mt-3 w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    📅 {language === 'es' ? 'Agendar Reunión Gratuita' : 'Schedule Free Meeting'}
                  </button>
                )}

                {/* Slot buttons */}
                {message.showSlots && message.slots && message.slotsRaw && schedulingStep === 'select_slot' && (
                  renderSlotButtons(message.slots, message.slotsRaw)
                )}

                {/* Alternative buttons */}
                {message.showAlternatives && message.alternatives && schedulingStep === 'show_alternatives' && (
                  renderAlternativeButtons(message.alternatives)
                )}

                {message.showConfirmButtons && schedulingStep === 'confirming' && (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => processSchedulingInput(language === 'es' ? 'Si' : 'Yes')}
                      className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-sm font-medium text-green-800"
                    >
                      {language === 'es' ? 'Si, confirmar' : 'Yes, confirm'}
                    </button>
                    <button
                      onClick={() => processSchedulingInput(language === 'es' ? 'No' : 'No')}
                      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                    >
                      {language === 'es' ? 'No, cambiar horario' : 'No, change time'}
                    </button>
                  </div>
                )}

                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 sm:p-6 bg-white rounded-b-2xl">
          <div className="flex gap-2 sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                schedulingStep === 'select_slot'
                  ? (language === 'es' ? 'Selecciona un horario arriba ☝️' : 'Select a time slot above ☝️')
                  : schedulingStep === 'request_datetime'
                    ? (language === 'es' ? 'Ej: "mañana a las 10am"...' : 'E.g.: "tomorrow at 10am"...')
                  : schedulingStep === 'show_alternatives'
                    ? (language === 'es' ? 'Selecciona arriba o escribe otra fecha...' : 'Select above or type another date...')
                  : schedulingStep !== 'idle' && schedulingStep !== 'completed'
                    ? (language === 'es' ? 'Escribe tu respuesta...' : 'Type your answer...')
                    : (language === 'es' ? 'Escribe tu pregunta...' : 'Type your question...')
              }
              className="flex-1 px-4 sm:px-5 py-3 sm:py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
              disabled={isLoading || schedulingStep === 'select_slot' || schedulingStep === 'scheduling' || schedulingStep === 'loading_slots' || schedulingStep === 'checking_availability'}
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || schedulingStep === 'select_slot' || schedulingStep === 'scheduling' || schedulingStep === 'checking_availability'}
              className="bg-blue-600 text-white px-5 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-blue-700 transition-all hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs sm:text-sm text-gray-500">
              {schedulingStep !== 'idle' && schedulingStep !== 'completed'
                ? `📝 ${language === 'es' ? 'Paso de agendamiento' : 'Scheduling step'}`
                : `🤖 ${language === 'es' ? 'Asistente IA de Elevate' : 'Elevate AI Assistant'}`}
            </p>
            <p className="text-xs text-gray-400">{input.length}/500</p>
          </div>
        </div>
      </div>
    );
  }

  // Floating chatbot version
  return (
    <>
      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50 ${
          isOpen ? 'bg-gray-700 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        aria-label="Toggle chatbot"
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl font-bold">E</span>
              </div>
              <div>
                <h3 className="font-semibold">Elevate Assistant</h3>
                <p className="text-xs text-blue-100">
                  {schedulingStep !== 'idle' && schedulingStep !== 'completed'
                    ? (language === 'es' ? 'Agendando...' : 'Scheduling...')
                    : (language === 'es' ? 'En línea' : 'Online')}
                </p>
              </div>
            </div>
            <button
              onClick={clearChat}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              title="Clear chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">{language === 'es' ? '¡Hola! ¿En qué puedo ayudarte?' : 'Hello! How can I help you?'}</p>
                <button
                  onClick={startScheduling}
                  className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  📅 {language === 'es' ? 'Agendar Reunión' : 'Schedule Meeting'}
                </button>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {message.showSchedulingButton && schedulingStep === 'idle' && (
                    <button
                      onClick={startScheduling}
                      className="mt-2 w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                    >
                      📅 {language === 'es' ? 'Agendar Reunión' : 'Schedule Meeting'}
                    </button>
                  )}

                  {message.showSlots && message.slots && message.slotsRaw && schedulingStep === 'select_slot' && (
                    <div className="mt-2 space-y-1">
                      {message.slots.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectSlot(slot, message.slotsRaw![idx])}
                          className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-xs font-medium text-blue-800"
                        >
                          📅 {slot}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Alternativas en floating chatbot */}
                  {message.showAlternatives && message.alternatives && schedulingStep === 'show_alternatives' && (
                    <div className="mt-2 space-y-1">
                      {message.alternatives.map((alt, idx) => (
                        <button
                          key={idx}
                          onClick={() => selectAlternative(alt)}
                          className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-xs font-medium text-green-800"
                        >
                          📅 {alt.displayText}
                        </button>
                      ))}
                      <p className="text-xs text-gray-500 mt-2">
                        {language === 'es'
                          ? '¿Otra fecha? Escríbela abajo'
                          : 'Different date? Type it below'}
                      </p>
                    </div>
                  )}


                  {message.showConfirmButtons && schedulingStep === 'confirming' && (
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => processSchedulingInput(language === 'es' ? 'Si' : 'Yes')}
                        className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-xs font-medium text-green-800"
                      >
                        {language === 'es' ? 'Si, confirmar' : 'Yes, confirm'}
                      </button>
                      <button
                        onClick={() => processSchedulingInput(language === 'es' ? 'No' : 'No')}
                        className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-xs font-medium text-gray-700"
                      >
                        {language === 'es' ? 'No, cambiar horario' : 'No, change time'}
                      </button>
                    </div>
                  )}

                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  schedulingStep === 'select_slot'
                    ? (language === 'es' ? 'Selecciona arriba ☝️' : 'Select above ☝️')
                    : schedulingStep === 'request_datetime'
                      ? (language === 'es' ? 'Ej: "mañana a las 10am"' : 'E.g.: "tomorrow at 10am"')
                    : schedulingStep === 'show_alternatives'
                      ? (language === 'es' ? 'Otra fecha...' : 'Another date...')
                    : (language === 'es' ? 'Escribe aquí...' : 'Type here...')
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading || schedulingStep === 'select_slot' || schedulingStep === 'scheduling' || schedulingStep === 'checking_availability'}
                maxLength={500}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || schedulingStep === 'select_slot' || schedulingStep === 'scheduling' || schedulingStep === 'checking_availability'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {language === 'es' ? 'Asistente IA de Elevate Tech' : 'Elevate Tech AI Assistant'}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
