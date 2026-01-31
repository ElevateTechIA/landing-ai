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

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function VoiceChatModal({ isOpen, onClose }: VoiceChatModalProps) {
  const { language } = useLanguage();
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [textInput, setTextInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [goodbyeDetected, setGoodbyeDetected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const goodbyeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to maintain latest values
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

  // Close modal when ESC is pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isCallStarted) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isCallStarted, onClose]);

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

      if (goodbyeTimeoutRef.current) {
        clearTimeout(goodbyeTimeoutRef.current);
        goodbyeTimeoutRef.current = null;
      }

      saveConversationToStorage();
      await processConversation();
    },
    onMessage: (message: any) => {
      console.log('📨 Raw message received:', message);

      if ('user_transcript' in message && message.user_transcript) {
        addMessage('user', message.user_transcript);
      } else if ('agent_response' in message && message.agent_response) {
        addMessage('agent', message.agent_response);
      } else if ('message' in message && message.source === 'ai') {
        addMessage('agent', message.message);
      } else if ('message' in message && message.source === 'user') {
        addMessage('user', message.message);
      }
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

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
    setMessages(prev => [...prev, newMessage]);

    if (detectGoodbye(text) && isCallStarted) {
      console.log('[GOODBYE] Detected goodbye phrase:', text);
      setGoodbyeDetected(true);

      if (goodbyeTimeoutRef.current) {
        clearTimeout(goodbyeTimeoutRef.current);
      }

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

    console.log('[PROCESS] Processing conversation...');

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

      if (!response.ok) {
        console.error('[PROCESS] Server returned error');
        return;
      }

      const data = await response.json();

      if (data.success) {
        console.log('[PROCESS] Conversation processed successfully');
      }
    } catch (error) {
      console.error('[PROCESS] Error processing conversation:', error);
    }
  };

  const saveConversationToStorage = () => {
    const currentMessages = messagesRef.current;
    const currentConvId = conversationIdRef.current;
    const currentStartTime = startTimeRef.current;

    if (!currentConvId || currentMessages.length === 0) {
      return;
    }

    const conversationHistory = {
      conversationId: currentConvId,
      messages: currentMessages,
      startedAt: currentStartTime || new Date(),
      endedAt: new Date(),
    };

    try {
      const existingConversations = localStorage.getItem('voiceChatHistory');
      const conversations = existingConversations
        ? JSON.parse(existingConversations)
        : [];

      conversations.push(conversationHistory);
      localStorage.setItem('voiceChatHistory', JSON.stringify(conversations));
      console.log('✅ Conversation saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  };

  const startConversation = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      await conversation.startSession({
        agentId: 'agent_2301kg3qxsdcfgha22tf1eq8vr4z',
        connectionType: 'webrtc' as const,
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert(language === 'es'
        ? 'Por favor permite el acceso al micrófono para usar esta función.'
        : 'Please allow microphone access to use this feature.');
    }
  };

  const endConversation = async () => {
    await conversation.endSession();
  };

  const sendTextMessage = () => {
    if (!textInput.trim() || !isCallStarted) return;

    conversation.sendUserMessage(textInput);
    addMessage('user', textInput);
    setTextInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isCallStarted && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const durationInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setCallDuration(durationInSeconds);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallStarted, startTime]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-white/20 flex items-center justify-center ${isCallStarted ? 'animate-pulse' : ''}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {language === 'es' ? 'Agenda tu Reunión por Voz' : 'Schedule Your Meeting by Voice'}
              </h2>
              <p className="text-sm text-purple-100">
                {isCallStarted
                  ? (language === 'es' ? 'En llamada...' : 'On call...')
                  : (language === 'es' ? 'Asistente virtual' : 'Virtual assistant')
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!isCallStarted) {
                onClose();
              }
            }}
            disabled={isCallStarted}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Agent Control */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col">
            <div className="text-center mb-4">
              <div className={`w-24 h-24 mx-auto rounded-full overflow-hidden flex items-center justify-center mb-3 ${isCallStarted ? 'animate-pulse' : ''}`}>
                <Image
                  src="/images/cesarvega.png"
                  alt="Cesar"
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <h3 className="font-bold text-gray-900">Cesar</h3>
              {isCallStarted && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-lg font-mono font-bold text-gray-900 tabular-nums">
                    {formatDuration(callDuration)}
                  </span>
                </div>
              )}
            </div>

            {!isCallStarted ? (
              <button
                onClick={startConversation}
                disabled={conversation.status === 'connecting'}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {conversation.status === 'connecting' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{language === 'es' ? 'Conectando...' : 'Connecting...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{language === 'es' ? 'Iniciar' : 'Start'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const newVolume = isMuted ? 1 : 0;
                    conversation.setVolume({ volume: newVolume });
                    setIsMuted(!isMuted);
                  }}
                  className="w-full p-3 bg-gray-200 hover:bg-gray-300 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isMuted ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                      <span className="text-sm font-medium">Muted</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span className="text-sm font-medium">Mute</span>
                    </>
                  )}
                </button>

                <button
                  onClick={endConversation}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{language === 'es' ? 'Finalizar' : 'End Call'}</span>
                </button>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-300">
              <div className="text-xs text-gray-500 text-center">
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
            </div>
          </div>

          {/* Right Panel - Chat */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">
                      {language === 'es'
                        ? 'Inicia la conversación para ver la transcripción'
                        : 'Start the conversation to see the transcript'
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
                      } rounded-2xl px-4 py-2 shadow-sm`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold opacity-75">
                            {msg.role === 'user'
                              ? (language === 'es' ? 'Tú' : 'You')
                              : 'Cesar'
                            }
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Text Input */}
            {isCallStarted && (
              <div className="bg-white px-4 py-3 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={language === 'es'
                      ? 'Escribe un mensaje...'
                      : 'Type a message...'
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  />
                  <button
                    onClick={sendTextMessage}
                    disabled={!textInput.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
