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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
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

      // Execute action
      if (data.actionPayload) {
        await executeAction(data.action, data.actionPayload);
      }

    } catch (error) {
      console.error('[CHATBOT] Error:', error);
      addMessage('assistant', language === 'es'
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
        // Schedule and show success
        if (payload.success) {
          setIsScheduling(true);
          // Meeting scheduled successfully
          if (payload.zoomLink) {
            const meetingInfo = language === 'es'
              ? `🎉 ¡Reunión agendada exitosamente!\n\n📅 Tu reunión ha sido confirmada.\n\n🔗 Link Zoom: ${payload.zoomLink}`
              : `🎉 Meeting scheduled successfully!\n\n📅 Your meeting has been confirmed.\n\n🔗 Zoom Link: ${payload.zoomLink}`;
            addMessage('assistant', meetingInfo);
          }
          setIsScheduling(false);
        }
        break;

      default:
        // No action needed (collect_info, confirm_data, completed, error)
        break;
    }
  };

  /**
   * Handle slot selection from alternatives
   */
  const handleSelectSlot = (slot: Alternative) => {
    handleSendMessage(slot.displayText);
  };

  /**
   * Handle input submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chat container */}
      <div className="flex flex-col w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
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
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                <div className="flex space-x-2">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Alternatives/Slots section */}
        {alternatives.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3 font-medium">
              {language === 'es' ? 'Selecciona un horario:' : 'Select a time:'}
            </p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {alternatives.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSlot(slot)}
                  disabled={isLoading || isScheduling}
                  className="text-left px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  📅 {slot.displayText}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isScheduling}
              placeholder={language === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={isLoading || isScheduling || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading || isScheduling ? '...' : (language === 'es' ? 'Enviar' : 'Send')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
