'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChallengeData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  purpose?: string;
  language: 'en' | 'es';
}

interface AvailableSlot {
  datetime: string;
  date: string;
  time: string;
  dayOfWeek: string;
}

interface Alternative {
  datetime: string;
  displayText: string;
}

interface ActionPayload {
  slots?: AvailableSlot[];
  alternatives?: Alternative[];
  success?: boolean;
  zoomLink?: string;
  [key: string]: unknown;
}

export default function ChallengeChatbot() {
  const { language } = useLanguage();

  const getInitialMessage = (): Message => ({
    role: 'assistant',
    content: '¡Hola! Hello! 👋\n\nPlease select your preferred language / Por favor selecciona tu idioma preferido:\n\n1. 🇺🇸 English\n2. 🇪🇸 Español',
    timestamp: new Date()
  });

  // State management
  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [challengeData, setChallengeData] = useState<ChallengeData>({
    language
  });
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSelectingLanguage, setIsSelectingLanguage] = useState(true);
  const [isConfirmingData, setIsConfirmingData] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Loading messages in both languages
  const loadingMessages = {
    es: [
      '🤖 Pensando...',
      '✨ Trabajando para ti...',
      '🧠 Procesando tu solicitud...',
      '💡 Haciendo algo inteligente...',
      '⚡ Analizando información...',
      '🎯 Encontrando la mejor opción...'
    ],
    en: [
      '🤖 Thinking...',
      '✨ Working for you...',
      '🧠 Processing your request...',
      '💡 Doing something smart...',
      '⚡ Analyzing information...',
      '🎯 Finding the best option...'
    ]
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && !isScheduling) {
      inputRef.current?.focus();
    }
  }, [isLoading, isScheduling]);

  // Update language in data when context changes
  useEffect(() => {
    setChallengeData(prev => ({ ...prev, language }));
  }, [language]);

  // Rotate loading messages while loading
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex(prev => (prev + 1) % loadingMessages[challengeData.language].length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [isLoading, challengeData.language, loadingMessages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  /**
   * Handle language selection
   */
  const handleSelectLanguage = (lang: 'en' | 'es') => {
    addMessage('user', lang === 'en' ? '🇺🇸 English' : '🇪🇸 Español');
    setChallengeData(prev => ({ ...prev, language: lang }));
    setIsSelectingLanguage(false);
    setIsLoading(true);

    // Send language selection to AI
    setTimeout(async () => {
      try {
        const updatedMessages = [
          ...messages,
          { role: 'user', content: lang === 'en' ? 'English' : 'Español', timestamp: new Date().toISOString() }
        ];

        const response = await fetch('/api/chat-scheduler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            language: lang,
            currentData: { language: lang }
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[CHATBOT] AI Response:', data);

        // Update state with extracted data
        if (data.extractedData) {
          setChallengeData(prev => ({ ...prev, ...data.extractedData }));
        }

        // Add AI response
        addMessage('assistant', data.response);

        // Check if this is a confirmation request
        if (data.action === 'confirm_data') {
          setIsConfirmingData(true);
        } else {
          setIsConfirmingData(false);
        }

        // Execute action (always execute, even if payload is empty)
        await executeAction(data.action, data.actionPayload || {});
      } catch (error) {
        console.error('[CHATBOT] Error:', error);
        addMessage('assistant', lang === 'en'
          ? '❌ Sorry, there was an error. Please try again.'
          : '❌ Disculpa, hubo un error. Por favor intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  /**
   * Main message handler - sends to AI scheduler
   */
  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    // Add user message to chat
    addMessage('user', userMessage);
    setInput('');
    setIsLoading(true);
    setAlternatives([]);
    setIsConfirmingData(false);

    try {
      // Call AI conversation API
      const response = await fetch('/api/chat-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }],
          language: challengeData.language,
          currentData: challengeData
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[CHATBOT] AI Response:', data);

      // Update state with extracted data
      if (data.extractedData) {
        setChallengeData(prev => ({ ...prev, ...data.extractedData }));
      }

      // Add AI response
      addMessage('assistant', data.response);

      // Check if this is a confirmation request
      if (data.action === 'confirm_data') {
        setIsConfirmingData(true);
      } else {
        setIsConfirmingData(false);
      }

      // Execute action (always execute, even if payload is empty)
      await executeAction(data.action, data.actionPayload || {});

    } catch (error) {
      console.error('[CHATBOT] Error:', error);
      addMessage('assistant', challengeData.language === 'es'
        ? '❌ Disculpa, hubo un error procesando tu mensaje. Por favor intenta de nuevo.'
        : '❌ Sorry, there was an error processing your message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Executes actions returned by AI
   */
  const executeAction = async (action: string, payload: ActionPayload) => {
    switch (action) {
      case 'show_available_slots':
      case 'show_specific_date_slots':
        // Display available slots as buttons
        if (payload.slots && payload.slots.length > 0) {
          const slots = payload.slots.map((slot: AvailableSlot) => ({
            datetime: slot.datetime,
            displayText: `${slot.dayOfWeek}, ${slot.date} at ${slot.time}`
          }));
          setAlternatives(slots);
        }
        break;

      case 'check_specific_time':
        // Show alternatives if available slots exist
        if (payload.alternatives && payload.alternatives.length > 0) {
          setAlternatives(payload.alternatives);
        }
        break;

      case 'schedule_meeting':
        // Don't add extra message here - the backend already returned the success message
        setIsScheduling(false);
        break;

      default:
        // No action needed (collect_info, confirm_data, completed, error)
        break;
    }
  };

  /**
   * Handle slot selection from alternatives
   */
  const handleSelectSlot = async (slot: Alternative) => {
    // Add user message showing their selection
    addMessage('user', slot.displayText);
    setInput('');
    setIsLoading(true);
    setAlternatives([]);
    setIsConfirmingData(false);

    try {
      // Directly call schedule API with slot data
      const response = await fetch('/api/chat-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: slot.displayText, timestamp: new Date().toISOString() }],
          language: challengeData.language,
          currentData: challengeData,
          selectedSlot: slot // Pass the full slot object directly
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[CHATBOT] Schedule Response:', data);

      // Update state with extracted data
      if (data.extractedData) {
        setChallengeData(prev => ({ ...prev, ...data.extractedData }));
      }

      // Add AI response
      addMessage('assistant', data.response);

      // Execute action
      await executeAction(data.action, data.actionPayload || {});

    } catch (error) {
      console.error('[CHATBOT] Error scheduling:', error);
      addMessage('assistant', challengeData.language === 'es'
        ? '❌ Disculpa, hubo un error al agendar. Por favor intenta de nuevo.'
        : '❌ Sorry, there was an error scheduling. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle confirmation response
   */
  const handleConfirmation = (confirmed: boolean) => {
    setIsConfirmingData(false);
    if (confirmed) {
      handleSendMessage(challengeData.language === 'es' ? 'Sí, es correcto' : 'Yes, that\'s correct');
    } else {
      handleSendMessage(challengeData.language === 'es' ? 'Quiero cambiar algo' : 'I want to change something');
    }
  };

  /**
   * Handle input submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="flex h-[600px] bg-gradient-to-b from-blue-50 via-white to-blue-50">
      {/* Chat container */}
      <div className="flex flex-col w-full max-w-2xl mx-auto bg-gradient-to-b from-blue-50 via-white to-blue-50 shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
        {/* AI Assistant Avatar Section */}
        <div className="px-5 py-4 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                  {avatarError ? (
                    <span className="text-3xl">🤖</span>
                  ) : (
                    <Image
                      src="/images/ai-assistant-avatar.png"
                      alt="AI Assistant"
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">AI Assistant</h4>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {challengeData.language === 'es' ? 'Siempre disponible' : 'Always available'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          {/* Language Selection Screen */}
          {isSelectingLanguage && (
            <>
              {/* Welcome Message */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-gray-800 text-sm leading-relaxed">
                  ¡Hola! Hello! 👋
                </p>
                <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                  Selecciona tu idioma para comenzar / Please select your preferred language to get started:
                </p>
                <p className="text-gray-400 text-xs mt-3">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Language Selection Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => handleSelectLanguage('en')}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
                    language === 'en'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🇺🇸</span>
                    <span className="font-medium text-gray-800">English</span>
                  </span>
                  {language === 'en' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  onClick={() => handleSelectLanguage('es')}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
                    language === 'es'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">🇪🇸</span>
                    <span className="font-medium text-gray-800">Español</span>
                  </span>
                  {language === 'es' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              {/* Privacy Note */}
              <p className="text-center text-xs text-gray-500 mt-4">
                {language === 'es'
                  ? 'Tu información se usa solo para agendar tu reunión.'
                  : 'Your information is only used to schedule your meeting.'}
              </p>
            </>
          )}

          {/* Chat Messages (after language selected) */}
          {!isSelectingLanguage && messages.slice(1).map((msg, idx) => (
            <div key={idx}>
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Show confirmation buttons when confirming data */}
              {msg.role === 'assistant' && idx === messages.slice(1).length - 1 && isConfirmingData && (
                <div className="flex justify-start mt-3">
                  <div className="space-y-2 w-full">
                    <button
                      onClick={() => handleConfirmation(true)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm text-green-800 font-medium"
                    >
                      <span>✅ {challengeData.language === 'es' ? 'Sí, es correcto' : 'Yes, that\'s correct'}</span>
                    </button>
                    <button
                      onClick={() => handleConfirmation(false)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm text-amber-800 font-medium"
                    >
                      <span>✏️ {challengeData.language === 'es' ? 'Quiero cambiar algo' : 'I want to change something'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Show alternatives/slots right after assistant message */}
              {msg.role === 'assistant' && idx === messages.slice(1).length - 1 && !isConfirmingData && alternatives.length > 0 && (
                <div className="flex justify-start mt-3">
                  <div className="space-y-2 w-full">
                    {alternatives.map((slot, slotIdx) => (
                      <button
                        key={slotIdx}
                        onClick={() => handleSelectSlot(slot)}
                        disabled={isLoading || isScheduling}
                        className="w-full flex items-center justify-between px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm text-green-800 font-medium"
                      >
                        <span>📅 {slot.displayText}</span>
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div
                      className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-600 animate-pulse">
                    {loadingMessages[challengeData.language][loadingMessageIndex]}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="bg-white border-t border-gray-100 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isScheduling || isSelectingLanguage}
              placeholder={
                isSelectingLanguage
                  ? (language === 'es' ? 'Selecciona un idioma...' : 'Select a language...')
                  : (challengeData.language === 'es' ? 'Escribe tu mensaje...' : 'Type your message...')
              }
              className="flex-1 bg-transparent py-2 text-base text-gray-800 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || isScheduling || !input.trim() || isSelectingLanguage}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              {challengeData.language === 'es' ? 'Enviar' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
