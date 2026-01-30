'use client';

import { useState, useRef, useEffect } from 'react';
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
    <div className="flex h-[600px] bg-gray-50">
      {/* Chat container */}
      <div className="flex flex-col w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none shadow'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {/* Show language selection buttons after initial message */}
              {msg.role === 'assistant' && idx === messages.length - 1 && isSelectingLanguage && (
                <div className="flex justify-start mt-3 ml-0">
                  <div className="space-y-2 w-full">
                    <button
                      onClick={() => handleSelectLanguage('en')}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-blue-900 font-medium"
                    >
                      🇺🇸 English
                    </button>
                    <button
                      onClick={() => handleSelectLanguage('es')}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-green-900 font-medium"
                    >
                      🇪🇸 Español
                    </button>
                  </div>
                </div>
              )}
              {/* Show confirmation buttons when confirming data */}
              {msg.role === 'assistant' && idx === messages.length - 1 && !isSelectingLanguage && isConfirmingData && (
                <div className="flex justify-start mt-3 ml-0">
                  <div className="space-y-2 w-full">
                    <button
                      onClick={() => handleConfirmation(true)}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-green-900 font-medium"
                    >
                      ✅ {challengeData.language === 'es' ? 'Sí, es correcto' : 'Yes, that\'s correct'}
                    </button>
                    <button
                      onClick={() => handleConfirmation(false)}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2 bg-yellow-50 border border-yellow-300 rounded-lg hover:bg-yellow-100 hover:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-yellow-900 font-medium"
                    >
                      ✏️ {challengeData.language === 'es' ? 'Quiero cambiar algo' : 'I want to change something'}
                    </button>
                  </div>
                </div>
              )}
              {/* Show alternatives/slots right after assistant message */}
              {msg.role === 'assistant' && idx === messages.length - 1 && !isSelectingLanguage && !isConfirmingData && alternatives.length > 0 && (
                <div className="flex justify-start mt-3 ml-0">
                  <div className="space-y-2 w-full">
                    {alternatives.map((slot, slotIdx) => (
                      <button
                        key={slotIdx}
                        onClick={() => handleSelectSlot(slot)}
                        disabled={isLoading || isScheduling}
                        className="w-full text-left px-4 py-2 bg-green-50 border border-green-300 rounded-lg hover:bg-green-100 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm text-green-900 font-medium"
                      >
                        📅 {slot.displayText}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-800 px-5 py-3 rounded-lg rounded-bl-none shadow-sm border border-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  <p className="text-sm font-medium animate-pulse">
                    {loadingMessages[challengeData.language][loadingMessageIndex]}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isScheduling}
              placeholder={challengeData.language === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={isLoading || isScheduling || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading || isScheduling ? '...' : (challengeData.language === 'es' ? 'Enviar' : 'Send')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
