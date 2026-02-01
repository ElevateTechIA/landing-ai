'use client';

import { useConversation } from '@elevenlabs/react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';

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

interface Alternative {
  datetime: string;
  displayText: string;
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
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  // Button display state
  const [isConfirmingData, setIsConfirmingData] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Alternative[]>([]);
  const [lastAgentMessageId, setLastAgentMessageId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const goodbyeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (goodbyeTimeoutRef.current) {
        clearTimeout(goodbyeTimeoutRef.current);
      }
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
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
      setCallDuration(0);
      setIsAgentThinking(false);

      // Clear button state
      setIsConfirmingData(false);
      setAvailableSlots([]);
      setLastAgentMessageId('');

      // Clear goodbye timeout if exists
      if (goodbyeTimeoutRef.current) {
        clearTimeout(goodbyeTimeoutRef.current);
        goodbyeTimeoutRef.current = null;
      }

      // Clear thinking timeout if exists
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
        thinkingTimeoutRef.current = null;
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

        // Clear buttons when user speaks
        setIsConfirmingData(false);
        setAvailableSlots([]);
      }
      // Agent response
      else if ('agent_response' in message && message.agent_response) {
        console.log('✅ Adding AGENT message:', message.agent_response);
        const newMsg = addMessage('agent', message.agent_response);

        // Analyze agent message for button triggers
        analyzeAgentMessage(message.agent_response, newMsg.id);
      }
      // Alternative message structure
      else if ('message' in message && message.source === 'ai') {
        console.log('✅ Adding AGENT message (alt format):', message.message);
        const newMsg = addMessage('agent', message.message);

        // Analyze agent message for button triggers
        analyzeAgentMessage(message.message, newMsg.id);
      }
      else if ('message' in message && message.source === 'user') {
        console.log('✅ Adding USER message (alt format):', message.message);
        addMessage('user', message.message);

        // Clear buttons when user speaks
        setIsConfirmingData(false);
        setAvailableSlots([]);
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

  /**
   * Detects if agent message contains confirmation request
   * Patterns:
   * - ES: "¿es correcto?", "¿está bien?", "¿confirmas?"
   * - EN: "is this correct?", "does this look right?", "confirm?"
   */
  const detectConfirmationRequest = (message: string): boolean => {
    const patterns = [
      // Spanish patterns
      /¿es correcto\??/i,
      /¿está bien\??/i,
      /¿todo bien\??/i,
      /confirma(r|s)?\??/i,
      /¿(es correcta?|están correctos?) (la información|los datos|todo)\??/i,

      // English patterns
      /is (this|that|everything) correct\??/i,
      /does (this|that|everything) look (good|right|ok|okay)\??/i,
      /confirm\??/i,
      /is (this|the) information correct\??/i,
      /correct\??$/i
    ];

    return patterns.some(pattern => pattern.test(message));
  };

  /**
   * Detects if agent message contains time slot offerings
   * Patterns:
   * - ES: "horarios disponibles", "estas son las opciones", "puedes elegir"
   * - EN: "available times", "here are the options", "you can choose"
   */
  const detectTimeSlotOffering = (message: string): boolean => {
    const patterns = [
      // Spanish patterns
      /horarios? disponibles?/i,
      /estas? son? las? opciones?/i,
      /puedes? elegir/i,
      /¿qué hora (te conviene|te funciona|prefieres)\??/i,
      /tengo estos? (horarios?|tiempos?)/i,

      // English patterns
      /available (times?|slots?)/i,
      /(here are|these are) (the )?(options?|times?|slots?)/i,
      /you can (choose|select|pick)/i,
      /which time (works|suits)/i,
      /I have (these|the following) (times?|slots?)/i
    ];

    return patterns.some(pattern => pattern.test(message));
  };

  /**
   * Extracts time slots from agent message
   * Looks for patterns like:
   * - "lunes, 3 de febrero a las 10:00 AM"
   * - "Monday, February 3 at 10:00 AM"
   * - "martes 4 de febrero, 2:00 PM"
   */
  const extractTimeSlotsFromMessage = (message: string): Alternative[] => {
    const slots: Alternative[] = [];

    // Spanish format: "lunes, 3 de febrero a las 10:00 AM"
    const esRegex = /(lunes|martes|miércoles|jueves|viernes|sábado|domingo),?\s+\d{1,2}\s+de\s+\w+\s+(a las?|de)\s+\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/gi;

    // English format: "Monday, February 3 at 10:00 AM"
    const enRegex = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/gi;

    // Try Spanish format
    let match;
    while ((match = esRegex.exec(message)) !== null) {
      slots.push({
        displayText: match[0],
        datetime: match[0] // Backend can parse this later
      });
    }

    // Try English format
    while ((match = enRegex.exec(message)) !== null) {
      slots.push({
        displayText: match[0],
        datetime: match[0]
      });
    }

    return slots;
  };

  /**
   * Analyzes agent message to determine if buttons should be shown
   */
  const analyzeAgentMessage = (messageText: string, messageId: string) => {
    setLastAgentMessageId(messageId);

    // Check for confirmation request
    if (detectConfirmationRequest(messageText)) {
      console.log('[BUTTONS] Confirmation request detected');
      setIsConfirmingData(true);
      setAvailableSlots([]);
      return;
    }

    // Check for time slot offerings
    if (detectTimeSlotOffering(messageText)) {
      const extractedSlots = extractTimeSlotsFromMessage(messageText);
      if (extractedSlots.length > 0) {
        console.log('[BUTTONS] Time slots detected:', extractedSlots);
        setAvailableSlots(extractedSlots);
        setIsConfirmingData(false);
        return;
      }
    }

    // No buttons needed
    setIsConfirmingData(false);
    setAvailableSlots([]);
  };

  const addMessage = (role: 'user' | 'agent', text: string): Message => {
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

    // Show typing indicator when user speaks, hide when agent responds
    if (role === 'user') {
      // Clear any existing timeout
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
      }
      // Show typing indicator immediately
      setIsAgentThinking(true);
    } else if (role === 'agent') {
      // Keep typing indicator for at least 800ms before hiding
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
      }
      thinkingTimeoutRef.current = setTimeout(() => {
        setIsAgentThinking(false);
      }, 800);
    }

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

    // Return the message so caller can use its ID
    return newMessage;
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

  /**
   * Handles confirmation button clicks (Yes/Change)
   */
  const handleConfirmation = (confirmed: boolean) => {
    setIsConfirmingData(false);

    const response = confirmed
      ? (language === 'es' ? 'Sí, es correcto' : 'Yes, that\'s correct')
      : (language === 'es' ? 'Necesito cambiar algo' : 'I need to change something');

    // Send to conversation
    conversation.sendUserMessage(response);

    // Add to chat display
    addMessage('user', response);
  };

  /**
   * Handles time slot selection
   */
  const handleSelectSlot = (slot: Alternative) => {
    setAvailableSlots([]);

    // Send to conversation
    conversation.sendUserMessage(slot.displayText);

    // Add to chat display
    addMessage('user', slot.displayText);
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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={language === 'es' ? 'Volver a la página principal' : 'Back to main page'}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                {language === 'es' ? 'Agenda tu Reunión por Voz' : 'Schedule Your Meeting by Voice'}
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 line-clamp-2">
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
                    {messages.map((msg, idx) => (
                      <div key={msg.id}>
                        <div
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

                        {/* Confirmation buttons */}
                        {msg.role === 'agent' &&
                         msg.id === lastAgentMessageId &&
                         isConfirmingData &&
                         isCallStarted && (
                          <div className="flex justify-start mt-4">
                            <div className="space-y-3 w-full max-w-[85%]">
                              <button
                                onClick={() => handleConfirmation(true)}
                                className="group w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl hover:from-green-100 hover:to-emerald-100 hover:border-green-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
                              >
                                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                  <span className="text-2xl">✅</span>
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-base font-semibold text-green-900">
                                    {language === 'es' ? 'Sí, es correcto' : 'Yes, that\'s correct'}
                                  </p>
                                  <p className="text-xs text-green-700 mt-0.5">
                                    {language === 'es' ? 'Confirmar información' : 'Confirm information'}
                                  </p>
                                </div>
                                <svg className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleConfirmation(false)}
                                className="group w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl hover:from-yellow-100 hover:to-orange-100 hover:border-yellow-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
                              >
                                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                  <span className="text-2xl">✏️</span>
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-base font-semibold text-yellow-900">
                                    {language === 'es' ? 'Necesito cambiar algo' : 'I need to change something'}
                                  </p>
                                  <p className="text-xs text-yellow-700 mt-0.5">
                                    {language === 'es' ? 'Modificar información' : 'Modify information'}
                                  </p>
                                </div>
                                <svg className="w-5 h-5 text-yellow-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Time slot buttons */}
                        {msg.role === 'agent' &&
                         msg.id === lastAgentMessageId &&
                         availableSlots.length > 0 &&
                         !isConfirmingData &&
                         isCallStarted && (
                          <div className="flex justify-start mt-4">
                            <div className="space-y-3 w-full max-w-[85%]">
                              {availableSlots.map((slot, slotIdx) => (
                                <button
                                  key={slotIdx}
                                  onClick={() => handleSelectSlot(slot)}
                                  className="group w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
                                >
                                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className="text-base font-semibold text-blue-900">
                                      {slot.displayText}
                                    </p>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                      {language === 'es' ? 'Click para seleccionar' : 'Click to select'}
                                    </p>
                                  </div>
                                  <svg className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Typing Indicator */}
                    {isAgentThinking && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold opacity-75">Cesar</span>
                          </div>
                          <div className="flex items-center space-x-1">
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-gray-900"
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
