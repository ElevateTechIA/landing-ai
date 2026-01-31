'use client';

import { useConversation } from '@elevenlabs/react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'agent';
  message: string;
  timestamp: Date;
}

interface ConversationHistory {
  conversationId: string;
  messages: Message[];
  startedAt: Date;
  endedAt?: Date;
}

/**
 * Formats transcript text to convert spoken numbers and dates to readable format
 * Examples:
 * - "three zero five, three two two, zero zero seven zero" → "305-322-0070"
 * - "January thirtieth" → "January 30th"
 * - "twelve zero zero PM" → "12:00 PM"
 */
function formatTranscriptText(text: string): string {
  // Map of spoken numbers to digits
  const numberWords: { [key: string]: string } = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
  };

  // Map of ordinal words to numbers with suffix
  const ordinalWords: { [key: string]: string } = {
    first: '1st',
    second: '2nd',
    third: '3rd',
    fourth: '4th',
    fifth: '5th',
    sixth: '6th',
    seventh: '7th',
    eighth: '8th',
    ninth: '9th',
    tenth: '10th',
    eleventh: '11th',
    twelfth: '12th',
    thirteenth: '13th',
    fourteenth: '14th',
    fifteenth: '15th',
    sixteenth: '16th',
    seventeenth: '17th',
    eighteenth: '18th',
    nineteenth: '19th',
    twentieth: '20th',
    'twenty-first': '21st',
    'twenty-second': '22nd',
    'twenty-third': '23rd',
    'twenty-fourth': '24th',
    'twenty-fifth': '25th',
    'twenty-sixth': '26th',
    'twenty-seventh': '27th',
    'twenty-eighth': '28th',
    'twenty-ninth': '29th',
    thirtieth: '30th',
    'thirty-first': '31st',
  };

  let formatted = text;

  // Replace ordinal dates (e.g., "January thirtieth" → "January 30th")
  Object.entries(ordinalWords).forEach(([word, number]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    formatted = formatted.replace(regex, number);
  });

  // Format phone numbers: "three zero five, three two two, zero zero seven zero"
  // Pattern: looks for sequences of number words separated by spaces/commas
  const phonePattern = /\b(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]*(,\s*)?(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]*(,\s*)?(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s,]+(zero|one|two|three|four|five|six|seven|eight|nine)\b/gi;

  formatted = formatted.replace(phonePattern, (match) => {
    // Extract all number words
    const words = match.toLowerCase().match(/zero|one|two|three|four|five|six|seven|eight|nine/g);
    if (!words || words.length !== 10) return match;

    // Convert to digits
    const digits = words.map((word) => numberWords[word]).join('');
    // Format as phone number: 305-322-0070
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  });

  // Extended time words mapping for hours
  const hourWords: { [key: string]: string } = {
    ...numberWords,
    ten: '10',
    eleven: '11',
    twelve: '12',
  };

  // Mapping for common minute values
  const minuteWords: { [key: string]: string } = {
    'o\'clock': '00',
    'oclock': '00',
    'fifteen': '15',
    'thirty': '30',
    'forty-five': '45',
    'fortyfive': '45',
  };

  // Format times with word-based minutes: "eight thirty AM" → "8:30 AM"
  const timeWithMinutesPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[\s]+(fifteen|thirty|forty-five|fortyfive|o'clock|oclock)[\s]+(AM|PM|am|pm)\b/gi;

  formatted = formatted.replace(timeWithMinutesPattern, (match) => {
    const parts = match.toLowerCase().match(/one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|thirty|forty-five|fortyfive|o'clock|oclock|am|pm/g);
    if (!parts || parts.length < 3) return match;

    const hour = hourWords[parts[0]] || parts[0];
    const minutes = minuteWords[parts[1]] || parts[1];
    const period = parts[2].toUpperCase();

    return `${hour}:${minutes} ${period}`;
  });

  // Format times with digit-by-digit minutes: "twelve zero zero PM" → "12:00 PM"
  const timeDigitPattern = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[\s]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s]+(zero|one|two|three|four|five|six|seven|eight|nine)[\s]+(AM|PM|am|pm)\b/gi;

  formatted = formatted.replace(timeDigitPattern, (match) => {
    const parts = match.toLowerCase().match(/zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|am|pm/g);
    if (!parts || parts.length !== 4) return match;

    const hour = hourWords[parts[0]] || parts[0];
    const minute1 = hourWords[parts[1]] || parts[1];
    const minute2 = hourWords[parts[2]] || parts[2];
    const period = parts[3].toUpperCase();

    return `${hour}:${minute1}${minute2} ${period}`;
  });

  return formatted;
}

// Goodbye phrases in both languages for auto call termination
const GOODBYE_PHRASES = [
  // English
  'goodbye', 'bye', 'talk soon', 'talk to you soon', 'see you',
  'take care', 'have a good', 'thanks for your time',
  // Spanish
  'adios', 'adiós', 'hasta luego', 'nos vemos', 'chao', 'chau',
  'que tengas', 'gracias por tu tiempo', 'hasta pronto'
];

export default function VoiceChatPage() {
  const { language } = useLanguage();
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [textInput, setTextInput] = useState('');
  const [callDuration, setCallDuration] = useState(0); // Duration in seconds
  const [goodbyeDetected, setGoodbyeDetected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const goodbyeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to maintain latest values for saving
  const messagesRef = useRef<Message[]>([]);
  const conversationIdRef = useRef<string>('');
  const startTimeRef = useRef<Date | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  // Cleanup goodbye timeout on unmount
  useEffect(() => {
    return () => {
      if (goodbyeTimeoutRef.current) {
        clearTimeout(goodbyeTimeoutRef.current);
      }
    };
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setIsCallStarted(true);
      const now = new Date();
      setStartTime(now);
      const newConvId = `conv_${Date.now()}`;
      setConversationId(newConvId);
    },
    onDisconnect: async () => {
      console.log('Disconnected from ElevenLabs');
      setIsCallStarted(false);
      setGoodbyeDetected(false);

      // Clear goodbye timeout if exists
      if (goodbyeTimeoutRef.current) {
        clearTimeout(goodbyeTimeoutRef.current);
        goodbyeTimeoutRef.current = null;
      }

      saveConversationToStorage();

      // NOTE: Webhook handles appointment scheduling now
      // Frontend processing kept as fallback for testing
      await processConversation();
    },
    onMessage: (message: any) => {
      console.log('📨 Raw message received:', message);
      console.log('📨 Message keys:', Object.keys(message));
      console.log('📨 Message type:', typeof message);

      // Add message to chat based on message structure
      // User transcript
      if ('user_transcript' in message && message.user_transcript) {
        console.log('✅ Adding USER message:', message.user_transcript);
        addMessage('user', message.user_transcript);
      }
      // Agent response
      else if ('agent_response' in message && message.agent_response) {
        console.log('✅ Adding AGENT message:', message.agent_response);
        addMessage('agent', message.agent_response);
      }
      // Alternative message structure
      else if ('message' in message && message.source === 'ai') {
        console.log('✅ Adding AGENT message (alt format):', message.message);
        addMessage('agent', message.message);
      }
      else if ('message' in message && message.source === 'user') {
        console.log('✅ Adding USER message (alt format):', message.message);
        addMessage('user', message.message);
      }
      else {
        console.warn('⚠️ Message format not recognized. Skipping:', message);
      }
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

  // Function to detect goodbye phrases in message
  const detectGoodbye = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return GOODBYE_PHRASES.some(phrase => lowerMessage.includes(phrase));
  };

  const addMessage = (role: 'user' | 'agent', text: string) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      role,
      message: text,
      timestamp: new Date(),
    };
    console.log('➕ Adding message to state:', newMessage);
    setMessages(prev => {
      const updated = [...prev, newMessage];
      console.log('📊 Updated messages array:', updated.length, 'messages');
      return updated;
    });

    // Check for goodbye in both agent and user messages
    if (detectGoodbye(text) && isCallStarted) {
      console.log('[GOODBYE] Detected goodbye phrase:', text);
      setGoodbyeDetected(true);

      // Clear any existing timeout
      if (goodbyeTimeoutRef.current) {
        clearTimeout(goodbyeTimeoutRef.current);
      }

      // Wait 2 seconds then auto-end call
      goodbyeTimeoutRef.current = setTimeout(() => {
        console.log('[AUTO-END] Ending conversation after goodbye');
        conversation.endSession();
      }, 2000);
    }
  };

  const processConversation = async () => {
    const currentMessages = messagesRef.current;
    const currentConvId = conversationIdRef.current;

    if (!currentConvId || currentMessages.length === 0) {
      console.log('[PROCESS] No messages to process, skipping');
      return;
    }

    console.log('[PROCESS] Processing conversation...', {
      conversationId: currentConvId,
      messageCount: currentMessages.length,
    });

    try {
      const response = await fetch('/api/voice-chat/process-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toString(),
          })),
          conversationId: currentConvId,
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('[PROCESS] Server returned error:', errorData);
        } else {
          // Server returned HTML error page
          const errorText = await response.text();
          console.error('[PROCESS] Server returned HTML error (status:', response.status, ')');
          console.error('[PROCESS] Error text preview:', errorText.substring(0, 500));
        }
        console.log('[PROCESS] Conversation saved locally but server processing failed');
        return;
      }

      const data = await response.json();

      if (data.success) {
        console.log('[PROCESS] Conversation processed successfully:', data);
        // Alert disabled - emails will be sent automatically
      } else {
        console.error('[PROCESS] Processing failed:', data);
      }
    } catch (error) {
      console.error('[PROCESS] Error processing conversation:', error);
      console.log('[PROCESS] Conversation saved locally but server processing failed');
      // Don't show error to user, it's already saved locally
    }
  };

  const saveConversationToStorage = () => {
    // Use refs instead of state to avoid stale closure
    const currentMessages = messagesRef.current;
    const currentConvId = conversationIdRef.current;
    const currentStartTime = startTimeRef.current;

    console.log('💾 Attempting to save conversation...', {
      conversationId: currentConvId,
      messagesLength: currentMessages.length,
      hasMessages: currentMessages.length > 0,
      hasConvId: !!currentConvId,
    });

    if (!currentConvId || currentMessages.length === 0) {
      console.error('❌ Cannot save: conversationId or messages missing', {
        conversationId: currentConvId,
        messagesLength: currentMessages.length,
      });
      return;
    }

    const conversationHistory: ConversationHistory = {
      conversationId: currentConvId,
      messages: currentMessages,
      startedAt: currentStartTime || new Date(),
      endedAt: new Date(),
    };

    try {
      // Get existing conversations
      const existingConversations = localStorage.getItem('voiceChatHistory');
      const conversations: ConversationHistory[] = existingConversations
        ? JSON.parse(existingConversations)
        : [];

      // Add new conversation
      conversations.push(conversationHistory);

      // Save to localStorage
      localStorage.setItem('voiceChatHistory', JSON.stringify(conversations));
      console.log('✅ Conversation saved to localStorage:', conversationHistory);
      console.log('📦 Total conversations in storage:', conversations.length);
      console.log('🔑 localStorage key "voiceChatHistory" created/updated');

      // Verify it was saved
      const verification = localStorage.getItem('voiceChatHistory');
      console.log('✓ Verification - Data in localStorage:', verification ? 'Found' : 'NOT FOUND');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  };

  const startConversation = async () => {
    try {
      // Request microphone permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      await conversation.startSession({
        agentId: 'agent_2301kg3qxsdcfgha22tf1eq8vr4z',
        connectionType: 'webrtc' as const,
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Por favor permite el acceso al micrófono para usar esta función. / Please allow microphone access to use this feature.');
    }
  };

  const endConversation = async () => {
    await conversation.endSession();
  };

  const sendTextMessage = () => {
    if (!textInput.trim() || !isCallStarted) return;

    // Send message to agent
    conversation.sendUserMessage(textInput);

    // Add to chat immediately
    addMessage('user', textInput);

    // Clear input
    setTextInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isCallStarted && startTime) {
      // Update every second
      interval = setInterval(() => {
        const now = new Date();
        const durationInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setCallDuration(durationInSeconds);
      }, 1000);
    } else {
      // Reset duration when call ends
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallStarted, startTime]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Log conversation state changes
  useEffect(() => {
    console.log('📊 Conversation state:', {
      isCallStarted,
      conversationId,
      messagesCount: messages.length,
      status: conversation.status,
    });
  }, [isCallStarted, conversationId, messages.length, conversation.status]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {language === 'es' ? 'Agenda tu Reunión por Voz' : 'Schedule Your Meeting by Voice'}
              </h1>
              <p className="mt-2 text-gray-600">
                {language === 'es'
                  ? 'Habla naturalmente con nuestro asistente IA y agenda tu consulta en minutos'
                  : 'Talk naturally with our AI assistant and schedule your consultation in minutes'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Agent Control */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-8">
              {/* Agent Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ${isCallStarted ? 'animate-pulse' : ''}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Cesar</h2>
                    <p className="text-purple-100 text-sm">
                      {isCallStarted
                        ? (language === 'es' ? 'En llamada...' : 'On call...')
                        : (language === 'es' ? 'Asistente virtual' : 'Virtual assistant')
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Control Panel */}
              <div className="p-6">
                {!isCallStarted ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto rounded-full overflow-hidden flex items-center justify-center mb-4">
                        <Image
                          src="/images/cesarvega.png"
                          alt="Cesar"
                          width={96}
                          height={96}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <p className="text-gray-600 text-sm mb-4">
                        {language === 'es'
                          ? 'Haz clic para iniciar la conversación'
                          : 'Click to start the conversation'
                        }
                      </p>
                    </div>

                    <button
                      onClick={startConversation}
                      disabled={conversation.status === 'connecting'}
                      className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-3 shadow-lg"
                    >
                      {conversation.status === 'connecting' ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{language === 'es' ? 'Conectando...' : 'Connecting...'}</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{language === 'es' ? 'Iniciar Conversación' : 'Start Conversation'}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="relative mb-4">
                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden flex items-center justify-center animate-pulse">
                          <Image
                            src="/images/cesarvega.png"
                            alt="Cesar"
                            width={96}
                            height={96}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 rounded-full border-4 border-green-300 animate-ping opacity-20" />
                        </div>
                      </div>

                      {/* Call Duration */}
                      <div className="mb-3 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-2xl font-mono font-bold text-gray-900 tabular-nums">
                          {formatDuration(callDuration)}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm">
                        {language === 'es'
                          ? '¡Estoy escuchando! Habla con normalidad'
                          : 'I\'m listening! Speak normally'
                        }
                      </p>
                    </div>

                    {/* Call Controls */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const newVolume = isMuted ? 1 : 0;
                          conversation.setVolume({ volume: newVolume });
                          setIsMuted(!isMuted);
                        }}
                        className="flex-1 p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <>
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                            <span className="text-sm font-medium">Muted</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                            <span className="text-sm font-medium">Mute</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={endConversation}
                      className="hidden lg:flex w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-105 items-center justify-center gap-2 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{language === 'es' ? 'Finalizar Llamada' : 'End Call'}</span>
                    </button>
                  </div>
                )}

                {/* Status */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {language === 'es' ? 'Estado:' : 'Status:'}
                    </span>
                    <span className={`font-medium ${
                      conversation.status === 'connected' ? 'text-green-600' :
                      conversation.status === 'connecting' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {conversation.status === 'connected' && (language === 'es' ? 'Conectado' : 'Connected')}
                      {conversation.status === 'connecting' && (language === 'es' ? 'Conectando' : 'Connecting')}
                      {conversation.status === 'disconnected' && (language === 'es' ? 'Desconectado' : 'Disconnected')}
                    </span>
                  </div>
                  {messages.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {messages.length} {language === 'es' ? 'mensajes' : 'messages'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Chat Transcript */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg h-[calc(100vh-12rem)] flex flex-col">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-2xl">
                <h3 className="text-lg font-semibold">
                  {language === 'es' ? '💬 Conversación' : '💬 Conversation'}
                </h3>
                <p className="text-sm text-purple-100">
                  {language === 'es'
                    ? 'Tu información se procesa automáticamente al finalizar'
                    : 'Your information is processed automatically when finished'
                  }
                </p>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg font-medium">
                        {language === 'es'
                          ? 'Inicia una conversación para ver la transcripción'
                          : 'Start a conversation to see the transcript'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        } rounded-2xl px-4 py-3 shadow-sm`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold opacity-75">
                              {msg.role === 'user'
                                ? (language === 'es' ? 'Tú' : 'You')
                                : 'Cesar'
                              }
                            </span>
                            <span className="text-xs opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{formatTranscriptText(msg.message)}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Footer - Text Input or Info */}
              {isCallStarted ? (
                <div className="bg-white px-4 py-3 rounded-b-2xl border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={language === 'es'
                        ? 'Escribe un mensaje (email, nombre, etc.)...'
                        : 'Type a message (email, name, etc.)...'
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    />
                    <button
                      onClick={sendTextMessage}
                      disabled={!textInput.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="hidden sm:inline">{language === 'es' ? 'Enviar' : 'Send'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    {language === 'es'
                      ? '💡 Usa el teclado para información compleja (emails, nombres, direcciones)'
                      : '💡 Use keyboard for complex info (emails, names, addresses)'
                    }
                  </p>
                  {/* Mobile End Call Button */}
                  <button
                    onClick={endConversation}
                    className="lg:hidden w-full mt-3 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{language === 'es' ? 'Finalizar Llamada' : 'End Call'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-gray-100 px-6 py-3 rounded-b-2xl border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    {language === 'es'
                      ? '💾 Las conversaciones se guardan en tu navegador (localStorage)'
                      : '💾 Conversations are saved in your browser (localStorage)'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
