'use client';

import { useConversation } from '@elevenlabs/react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

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

export default function VoiceChatPage() {
  const { language } = useLanguage();
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      saveConversationToStorage();

      // Process conversation: extract info, create meeting, send emails
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

      const data = await response.json();

      if (data.success) {
        console.log('[PROCESS] Conversation processed successfully:', data);
        alert(
          language === 'es'
            ? `✅ Procesado exitosamente!\n\n${data.data.emailsSent.clientEmail ? 'Email enviado a tu dirección.' : 'Email enviado al host.'}\n\nRevisarás un email con los detalles de la reunión.`
            : `✅ Processed successfully!\n\n${data.data.emailsSent.clientEmail ? 'Email sent to your address.' : 'Email sent to host.'}\n\nYou'll receive an email with meeting details.`
        );
      } else {
        console.error('[PROCESS] Processing failed:', data);
      }
    } catch (error) {
      console.error('[PROCESS] Error processing conversation:', error);
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

      // Show success message
      alert(
        language === 'es'
          ? `✅ Conversación guardada! (${currentMessages.length} mensajes)\n\nRevisa: DevTools > Application > Local Storage`
          : `✅ Conversation saved! (${currentMessages.length} messages)\n\nCheck: DevTools > Application > Local Storage`
      );
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
      alert(
        language === 'es'
          ? `❌ Error al guardar: ${error}`
          : `❌ Error saving: ${error}`
      );
    }
  };

  const viewHistory = () => {
    const history = localStorage.getItem('voiceChatHistory');
    if (!history) {
      alert(language === 'es' ? 'No hay conversaciones guardadas' : 'No saved conversations');
      return;
    }

    const conversations: ConversationHistory[] = JSON.parse(history);
    console.log('📚 Conversation history:', conversations);
    alert(language === 'es'
      ? `Hay ${conversations.length} conversación(es) guardada(s). Revisa la consola para ver los detalles.`
      : `There are ${conversations.length} saved conversation(s). Check the console for details.`
    );
  };

  const startConversation = async () => {
    try {
      // Request microphone permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      await conversation.startSession({
        agentId: 'agent_1601kg04pgp8eqaan7fy0h6ngea5',
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

  const clearHistory = () => {
    if (confirm(language === 'es'
      ? '¿Estás seguro de que quieres borrar todo el historial?'
      : 'Are you sure you want to clear all history?')) {
      localStorage.removeItem('voiceChatHistory');
      alert(language === 'es' ? 'Historial borrado' : 'History cleared');
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
                {language === 'es' ? 'Chat de Voz con Transcripción' : 'Voice Chat with Transcription'}
              </h1>
              <p className="mt-2 text-gray-600">
                {language === 'es'
                  ? 'Habla con el agente y ve la conversación en tiempo real'
                  : 'Talk with the agent and see the conversation in real-time'
                }
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={viewHistory}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {language === 'es' ? '📚 Ver Historial' : '📚 View History'}
              </button>
              <button
                onClick={clearHistory}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                {language === 'es' ? '🗑️ Borrar Historial' : '🗑️ Clear History'}
              </button>
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
                    <h2 className="text-xl font-bold">Andrea</h2>
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
                      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4">
                        <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
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
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center animate-pulse">
                          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 rounded-full border-4 border-green-300 animate-ping opacity-20" />
                        </div>
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
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>{language === 'es' ? 'Finalizar Llamada' : 'End Call'}</span>
                    </button>

                    {/* Manual Save Button */}
                    {messages.length > 0 && (
                      <button
                        onClick={saveConversationToStorage}
                        className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span className="text-sm">{language === 'es' ? 'Guardar Ahora' : 'Save Now'}</span>
                      </button>
                    )}
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
                  {language === 'es' ? '📝 Transcripción en Tiempo Real' : '📝 Real-Time Transcription'}
                </h3>
                <p className="text-sm text-purple-100">
                  {language === 'es'
                    ? 'La conversación se guarda automáticamente al finalizar'
                    : 'Conversation is automatically saved when finished'
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
                                : 'Andrea'
                              }
                            </span>
                            <span className="text-xs opacity-50">
                              {new Date(msg.timestamp).toLocaleTimeString()}
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
