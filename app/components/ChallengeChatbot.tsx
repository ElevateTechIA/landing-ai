'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChallengeData {
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

type ConversationStep =
  | 'welcome'
  | 'name'
  | 'email'
  | 'phone'
  | 'company'
  | 'challenge'
  | 'objectives'
  | 'expectations'
  | 'budget'
  | 'timeline'
  | 'summary'
  | 'correction'
  | 'request_datetime'
  | 'checking_availability'
  | 'show_alternatives'
  | 'confirming'
  | 'scheduling'
  | 'completed';

export default function ChallengeChatbot() {
  const { language } = useLanguage();
  
  const getWelcomeMessage = (): Message => ({
    role: 'assistant',
    content: language === 'es'
      ? '¡Hola! 👋 Soy tu asistente virtual. Voy a guiarte en una conversación estructurada para entender mejor tu proyecto y agendar una reunión.\n\nEmpecemos: ¿Cuál es tu nombre completo?'
      : 'Hello! 👋 I\'m your virtual assistant. I\'ll guide you through a structured conversation to better understand your project and schedule a meeting.\n\nLet\'s start: What\'s your full name?',
    timestamp: new Date()
  });

  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('welcome');
  const [challengeData, setChallengeData] = useState<ChallengeData>({
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
  const [fieldToCorrect, setFieldToCorrect] = useState<keyof ChallengeData | null>(null);
  const [requestedSlot, setRequestedSlot] = useState<{ datetime: string; displayText: string } | null>(null);
  const [alternatives, setAlternatives] = useState<Array<{ datetime: string; displayText: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const isInputDisabled = isLoading
      || currentStep === 'scheduling'
      || currentStep === 'checking_availability'
      || currentStep === 'completed';

    if (!isInputDisabled) {
      inputRef.current?.focus();
    }
  }, [isLoading, currentStep]);


  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  // Verificar disponibilidad con la API
  const checkDateTimeAvailability = async (userInput: string) => {
    setCurrentStep('checking_availability');
    addMessage('assistant', language === 'es' ? '⏳ Verificando disponibilidad...' : '⏳ Checking availability...');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch('/api/calendar/check-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput, timezone, language })
      });

      const data = await response.json();
      setMessages(prev => prev.slice(0, -1)); // Quitar "verificando"

      if (!data.success) {
        setCurrentStep('request_datetime');
        const errorText = data.parseError
          ? (language === 'es'
            ? `❌ No entendí esa fecha.\n\n${data.parseError}\n\nPor favor, indica la fecha y hora claramente. Ejemplos:\n• "Mañana a las 10am"\n• "El viernes a las 3pm"\n• "27 de enero a las 2 de la tarde"\n• "Lunes 27 de enero a las 10 de la mañana"`
            : `❌ I didn't understand that date.\n\n${data.parseError}\n\nPlease provide the date and time clearly. Examples:\n• "Tomorrow at 10am"\n• "Friday at 3pm"\n• "January 27th at 2pm"\n• "Monday January 27th at 10am"`)
          : (language === 'es' ? '❌ Error al verificar. Intenta de nuevo.' : '❌ Error checking. Please try again.');
        addMessage('assistant', errorText);
        setIsLoading(false);
        return;
      }

      if (data.available && data.requestedSlot) {
        setRequestedSlot(data.requestedSlot);
        setCurrentStep('confirming');
        addMessage('assistant', language === 'es'
          ? `✅ ¡Excelente! El horario está disponible:\n\n📅 ${data.requestedSlot.displayText}\n\n¿Deseas confirmar esta reunión? (Sí/No)`
          : `✅ Great! The time slot is available:\n\n📅 ${data.requestedSlot.displayText}\n\nWould you like to confirm this meeting? (Yes/No)`);
        setIsLoading(false);
      } else {
        setRequestedSlot(data.requestedSlot);
        setAlternatives(data.alternatives || []);

        if (data.alternatives?.length > 0) {
          setCurrentStep('show_alternatives');
          addMessage('assistant', language === 'es'
            ? `😔 Lo siento, el horario solicitado (${data.requestedSlot?.displayText}) no está disponible.\n\nPero tengo estas alternativas cercanas:`
            : `😔 Sorry, the requested time (${data.requestedSlot?.displayText}) is not available.\n\nBut I have these nearby alternatives:`);
        } else {
          setCurrentStep('request_datetime');
          addMessage('assistant', language === 'es'
            ? '😔 Lo siento, ese horario no está disponible. Por favor, sugiere otra fecha y hora.\n\nPor ejemplo:\n• "Mañana a las 10am"\n• "El próximo lunes a las 2pm"\n• "El 27 de enero a las 11 de la mañana"'
            : '😔 Sorry, that time is not available. Please suggest another date and time.\n\nFor example:\n• "Tomorrow at 10am"\n• "Next Monday at 2pm"\n• "January 27th at 11am"');
        }
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      setMessages(prev => prev.slice(0, -1));
      setCurrentStep('request_datetime');
      addMessage('assistant', language === 'es'
        ? '❌ Error al verificar disponibilidad. Intenta de nuevo con un formato claro como "Mañana a las 10am".'
        : '❌ Error checking availability. Please try again with a clear format like "Tomorrow at 10am".');
      setIsLoading(false);
    }
  };

  // Agendar la reunión
  const scheduleWithSlot = async (datetime: string, displayText: string) => {
    setCurrentStep('scheduling');
    addMessage('assistant', language === 'es'
      ? `⏳ Agendando tu reunión para:\n📅 ${displayText}\n\nPor favor espera...`
      : `⏳ Scheduling your meeting for:\n📅 ${displayText}\n\nPlease wait...`);

    try {
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...challengeData,
          selectedSlot: datetime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      const data = await response.json();
      setMessages(prev => prev.slice(0, -1));

      if (data.success) {
        setCurrentStep('completed');
        addMessage('assistant', language === 'es'
          ? `🎉 ¡Reunión agendada exitosamente!\n\n📅 Fecha: ${displayText}\n🔗 Link de Zoom: ${data.zoomLink}\n\n📧 Te hemos enviado un correo con todos los detalles a ${challengeData.email}.\n\n¡Nos vemos pronto! 👋`
          : `🎉 Meeting scheduled successfully!\n\n📅 Date: ${displayText}\n🔗 Zoom Link: ${data.zoomLink}\n\n📧 We've sent you an email with all the details to ${challengeData.email}.\n\nSee you soon! 👋`);
      } else {
        setCurrentStep('request_datetime');
        addMessage('assistant', language === 'es'
          ? `❌ Error al agendar: ${data.error || 'Por favor intenta de nuevo.'}`
          : `❌ Scheduling error: ${data.error || 'Please try again.'}`);
      }
    } catch (err) {
      console.error('Error scheduling:', err);
      setMessages(prev => prev.slice(0, -1));
      setCurrentStep('request_datetime');
      addMessage('assistant', language === 'es'
        ? '❌ Error al agendar la reunión. Por favor, intenta de nuevo.'
        : '❌ Error scheduling the meeting. Please try again.');
    }
    setIsLoading(false);
  };

  const handleSelectAlternative = async (alt: { datetime: string; displayText: string }) => {
    setRequestedSlot(alt);
    addMessage('user', alt.displayText);
    setIsLoading(true);
    await scheduleWithSlot(alt.datetime, alt.displayText);
  };

  const getSummaryText = (data: ChallengeData) => {
    return language === 'es'
      ? `📋 Perfecto. Déjame resumir la información:\n\n👤 **Nombre:** ${data.name}\n📧 **Email:** ${data.email}\n📱 **Teléfono:** ${data.phone}\n🏢 **Empresa:** ${data.company}\n🎯 **Desafío:** ${data.challenge}\n🎪 **Objetivos:** ${data.objectives}\n✨ **Expectativas:** ${data.expectations}\n💰 **Presupuesto:** ${data.budget}\n⏰ **Timeline:** ${data.timeline}\n\n¿Es correcta toda la información? (Sí/No)`
      : `📋 Perfect. Let me summarize the information:\n\n👤 **Name:** ${data.name}\n📧 **Email:** ${data.email}\n📱 **Phone:** ${data.phone}\n🏢 **Company:** ${data.company}\n🎯 **Challenge:** ${data.challenge}\n🎪 **Objectives:** ${data.objectives}\n✨ **Expectations:** ${data.expectations}\n💰 **Budget:** ${data.budget}\n⏰ **Timeline:** ${data.timeline}\n\nIs all the information correct? (Yes/No)`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    addMessage('user', userInput);
    setInput('');
    setIsLoading(true);

    // Pequeño delay para mejor UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const lowerInput = userInput.toLowerCase();

    switch (currentStep) {
      case 'welcome':
        setChallengeData(prev => ({ ...prev, name: userInput }));
        setCurrentStep('name');
        addMessage('assistant', language === 'es' ? '¡Perfecto! ¿Cuál es tu correo electrónico?' : 'Perfect! What\'s your email address?');
        break;

      case 'name':
        if (!validateEmail(userInput)) {
          addMessage('assistant', language === 'es' ? '⚠️ Por favor, ingresa un correo electrónico válido.' : '⚠️ Please enter a valid email address.');
        } else {
          setChallengeData(prev => ({ ...prev, email: userInput }));
          setCurrentStep('email');
          addMessage('assistant', language === 'es' ? 'Gracias. ¿Cuál es tu número de teléfono?' : 'Thank you. What\'s your phone number?');
        }
        break;

      case 'email':
        if (!validatePhone(userInput)) {
          addMessage('assistant', language === 'es' ? '⚠️ Por favor, ingresa un número de teléfono válido (mínimo 10 dígitos).' : '⚠️ Please enter a valid phone number (minimum 10 digits).');
        } else {
          setChallengeData(prev => ({ ...prev, phone: userInput }));
          setCurrentStep('phone');
          addMessage('assistant', language === 'es'
            ? '¿Representas a alguna empresa o eres emprendedor independiente? (Escribe el nombre de la empresa o "Independiente")'
            : 'Do you represent a company or are you an independent entrepreneur? (Write company name or "Independent")');
        }
        break;

      case 'phone':
        setChallengeData(prev => ({ ...prev, company: userInput }));
        setCurrentStep('company');
        addMessage('assistant', language === 'es'
          ? 'Excelente. Ahora cuéntame: ¿Qué desafío, proyecto o idea tienes en mente? Sé lo más específico posible.'
          : 'Excellent. Now tell me: What challenge, project or idea do you have in mind? Be as specific as possible.');
        break;

      case 'company':
        setChallengeData(prev => ({ ...prev, challenge: userInput }));
        setCurrentStep('challenge');
        addMessage('assistant', language === 'es'
          ? 'Muy bien. ¿Cuáles son tus objetivos principales con este proyecto? ¿Qué esperas lograr?'
          : 'Very good. What are your main objectives with this project? What do you hope to achieve?');
        break;

      case 'challenge':
        setChallengeData(prev => ({ ...prev, objectives: userInput }));
        setCurrentStep('objectives');
        addMessage('assistant', language === 'es'
          ? '¿Qué expectativas tienes sobre el resultado final? ¿Cómo sabrás que el proyecto fue exitoso?'
          : 'What expectations do you have about the final result? How will you know the project was successful?');
        break;

      case 'objectives':
        setChallengeData(prev => ({ ...prev, expectations: userInput }));
        setCurrentStep('expectations');
        addMessage('assistant', language === 'es'
          ? '¿Tienes un presupuesto estimado para este proyecto? (Puedes indicar un rango o "Por definir")'
          : 'Do you have an estimated budget for this project? (You can indicate a range or "To be defined")');
        break;

      case 'expectations':
        setChallengeData(prev => ({ ...prev, budget: userInput }));
        setCurrentStep('budget');
        addMessage('assistant', language === 'es'
          ? '¿Cuál es tu timeline ideal? ¿Cuándo necesitas tener esto listo?'
          : 'What\'s your ideal timeline? When do you need this ready?');
        break;

      case 'budget':
        const updatedData = { ...challengeData, timeline: userInput };
        setChallengeData(updatedData);
        setCurrentStep('summary');
        addMessage('assistant', getSummaryText(updatedData));
        break;

      case 'summary':
        if (lowerInput.includes('yes') || lowerInput.includes('sí') || lowerInput.includes('si')) {
          setCurrentStep('request_datetime');
          addMessage('assistant', language === 'es'
            ? `¡Excelente! Tengo toda la información necesaria. 📋\n\n¿Cuándo te gustaría agendar la reunión?\n\nPuedes decirme la fecha y hora que prefieras, por ejemplo:\n• "Mañana a las 10am"\n• "El viernes a las 3 de la tarde"\n• "La próxima semana en la mañana"`
            : `Excellent! I have all the necessary information. 📋\n\nWhen would you like to schedule the meeting?\n\nYou can tell me your preferred date and time, for example:\n• "Tomorrow at 10am"\n• "Friday at 3pm"\n• "Next week in the morning"`);
        } else {
          setCurrentStep('correction');
          addMessage('assistant', language === 'es'
            ? '¿Qué campo quieres corregir?\n\n1. Nombre\n2. Email\n3. Teléfono\n4. Empresa\n5. Desafío\n6. Objetivos\n7. Expectativas\n8. Presupuesto\n9. Timeline\n\nEscribe el número o el nombre del campo.'
            : 'Which field do you want to correct?\n\n1. Name\n2. Email\n3. Phone\n4. Company\n5. Challenge\n6. Objectives\n7. Expectations\n8. Budget\n9. Timeline\n\nType the number or field name.');
        }
        break;

      case 'correction':
        if (fieldToCorrect) {
          setChallengeData(prev => ({ ...prev, [fieldToCorrect]: userInput }));
          setFieldToCorrect(null);
          setCurrentStep('summary');
          const newData = { ...challengeData, [fieldToCorrect]: userInput };
          addMessage('assistant', getSummaryText(newData));
        } else {
          let targetField: keyof ChallengeData | null = null;

          if (lowerInput.includes('1') || lowerInput.includes('nombre') || lowerInput.includes('name')) targetField = 'name';
          else if (lowerInput.includes('2') || lowerInput.includes('email') || lowerInput.includes('correo')) targetField = 'email';
          else if (lowerInput.includes('3') || lowerInput.includes('teléfono') || lowerInput.includes('telefono') || lowerInput.includes('phone')) targetField = 'phone';
          else if (lowerInput.includes('4') || lowerInput.includes('empresa') || lowerInput.includes('company')) targetField = 'company';
          else if (lowerInput.includes('5') || lowerInput.includes('desafío') || lowerInput.includes('desafio') || lowerInput.includes('challenge')) targetField = 'challenge';
          else if (lowerInput.includes('6') || lowerInput.includes('objetivo') || lowerInput.includes('objectives')) targetField = 'objectives';
          else if (lowerInput.includes('7') || lowerInput.includes('expectativa') || lowerInput.includes('expectations')) targetField = 'expectations';
          else if (lowerInput.includes('8') || lowerInput.includes('presupuesto') || lowerInput.includes('budget')) targetField = 'budget';
          else if (lowerInput.includes('9') || lowerInput.includes('timeline') || lowerInput.includes('plazo')) targetField = 'timeline';

          if (targetField) {
            setFieldToCorrect(targetField);
            const fieldNames: Record<string, Record<keyof ChallengeData, string>> = {
              es: { name: 'nombre', email: 'email', phone: 'teléfono', company: 'empresa', challenge: 'desafío', objectives: 'objetivos', expectations: 'expectativas', budget: 'presupuesto', timeline: 'timeline' },
              en: { name: 'name', email: 'email', phone: 'phone', company: 'company', challenge: 'challenge', objectives: 'objectives', expectations: 'expectations', budget: 'budget', timeline: 'timeline' }
            };
            addMessage('assistant', language === 'es'
              ? `¿Cuál es el nuevo valor para ${fieldNames.es[targetField]}?`
              : `What's the new value for ${fieldNames.en[targetField]}?`);
          } else {
            addMessage('assistant', language === 'es'
              ? 'No entendí qué campo quieres corregir. Por favor, escribe el número (1-9) o el nombre del campo.'
              : 'I didn\'t understand which field you want to correct. Please type the number (1-9) or field name.');
          }
        }
        break;

      case 'request_datetime':
      case 'show_alternatives':
        // Validar que la entrada parezca una fecha/hora antes de hacer la llamada al API
        const seemsLikeDateTime = /\d+|tomorrow|mañana|today|hoy|next|próxim|lunes|martes|miércoles|jueves|viernes|monday|tuesday|wednesday|thursday|friday|morning|tarde|afternoon|evening|noche|am|pm/i.test(userInput);
        
        if (!seemsLikeDateTime) {
          addMessage('assistant', language === 'es'
            ? '❌ Por favor, proporciona una fecha y hora específica.\n\nIndica la fecha y hora que prefieras:\n• "Mañana a las 10am"\n• "El viernes a las 3pm"\n• "27 de enero a las 2pm"'
            : '❌ Please provide a specific date and time.\n\nPlease provide the date and time clearly:\n• "Tomorrow at 10am"\n• "Friday at 3pm"\n• "January 27th at 2pm"');
          setIsLoading(false);
          return;
        }
        
        await checkDateTimeAvailability(userInput);
        return;

      case 'confirming': {
        const normalized = lowerInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalized.includes('yes') || normalized.includes('si')) {
          if (requestedSlot) {
            await scheduleWithSlot(requestedSlot.datetime, requestedSlot.displayText);
            return;
          }
          addMessage('assistant', language === 'es'
            ? 'No tengo el horario seleccionado. Por favor, indica otra fecha y hora.'
            : 'I do not have a selected time. Please provide another date and time.');
          setCurrentStep('request_datetime');
          break;
        }

        setCurrentStep('request_datetime');
        addMessage('assistant', language === 'es'
          ? '¿Qué otra fecha y hora te gustaría?'
          : 'What other date and time would you like?');
        break;
      }

      default:
        break;
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg" style={{ height: '600px' }}>
      {/* Header */}
      <div className="text-white p-4 rounded-t-xl" style={{ background: 'linear-gradient(to right, rgb(37, 99, 235), rgb(29, 78, 216))' }}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold">{language === 'es' ? 'Asistente Virtual' : 'Virtual Assistant'}</h3>
            <p className="text-xs text-blue-100">
              {currentStep === 'request_datetime' || currentStep === 'show_alternatives'
                ? (language === 'es' ? 'Selecciona fecha y hora' : 'Select date and time')
                : (language === 'es' ? 'Siempre disponible' : 'Always available')}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 shadow-md'}`}>
              <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Alternativas */}
        {currentStep === 'show_alternatives' && alternatives.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="space-y-2">
              {alternatives.map((alt, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectAlternative(alt)}
                  disabled={isLoading}
                  className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 disabled:opacity-50"
                >
                  <span className="text-green-700 font-medium">📅 {alt.displayText}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {language === 'es' ? '¿Ninguna te conviene? Escribe otra fecha y hora abajo:' : 'None of these work? Type another date and time below:'}
              </p>
            </div>
          </div>
        )}

        {/* Confirming */}
        {currentStep === 'confirming' && (
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="space-y-2">
              <button
                onClick={async () => {
                  addMessage('user', language === 'es' ? 'Si' : 'Yes');
                  if (requestedSlot) {
                    await scheduleWithSlot(requestedSlot.datetime, requestedSlot.displayText);
                  }
                }}
                disabled={isLoading}
                className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 disabled:opacity-50"
              >
                <span className="text-green-700 font-medium">
                  {language === 'es' ? 'Si, confirmar' : 'Yes, confirm'}
                </span>
              </button>
              <button
                onClick={() => {
                  addMessage('user', language === 'es' ? 'No' : 'No');
                  setCurrentStep('request_datetime');
                  addMessage('assistant', language === 'es'
                    ? '¿Qué otra fecha y hora te gustaría?'
                    : 'What other date and time would you like?');
                }}
                disabled={isLoading}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
              >
                <span className="text-gray-700 font-medium">
                  {language === 'es' ? 'No, cambiar horario' : 'No, change time'}
                </span>
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {currentStep !== 'scheduling' && currentStep !== 'checking_availability' && currentStep !== 'completed' && (
        <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentStep === 'request_datetime'
                  ? (language === 'es' ? 'Ej: "mañana a las 10am"...' : 'E.g.: "tomorrow at 10am"...')
                  : currentStep === 'show_alternatives'
                    ? (language === 'es' ? 'Escribe otra fecha o selecciona arriba...' : 'Type another date or select above...')
                    : currentStep === 'confirming'
                      ? (language === 'es' ? 'Escribe Sí o No...' : 'Type Yes or No...')
                      : (language === 'es' ? 'Escribe tu respuesta...' : 'Type your answer...')
              }
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors font-medium"
            >
              {language === 'es' ? 'Enviar' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
