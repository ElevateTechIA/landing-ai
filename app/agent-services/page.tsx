'use client';

import { useConversation } from '@elevenlabs/react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import CallButton from '../components/CallButton';
import Image from 'next/image';

export default function AgentServicesPage() {
  const { language } = useLanguage();
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [callType, setCallType] = useState<'web' | 'phone'>('web');

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setIsCallStarted(true);
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setIsCallStarted(false);
    },
    onMessage: (message) => {
      console.log('Message:', message);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

  const startConversation = async () => {
    try {
      // Request microphone permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream

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

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'es' ? 'Servicios de Agente AI' : 'AI Agent Services'}
          </h1>
          <p className="mt-2 text-gray-600">
            {language === 'es'
              ? 'Conéctate con nuestro agente de voz impulsado por IA'
              : 'Connect with our AI-powered voice agent'
            }
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {language === 'es' ? '¿Qué puedo hacer por ti?' : 'What can I do for you?'}
              </h2>
              <ul className="space-y-4">
                {[
                  {
                    icon: '📅',
                    title: language === 'es' ? 'Agendar reuniones' : 'Schedule meetings',
                    description: language === 'es'
                      ? 'Ayudo a coordinar y agendar tus reuniones'
                      : 'I help coordinate and schedule your meetings'
                  },
                  {
                    icon: '💡',
                    title: language === 'es' ? 'Responder preguntas' : 'Answer questions',
                    description: language === 'es'
                      ? 'Información sobre servicios, precios y procesos'
                      : 'Information about services, pricing, and processes'
                  },
                  {
                    icon: '🎯',
                    title: language === 'es' ? 'Entender tu proyecto' : 'Understand your project',
                    description: language === 'es'
                      ? 'Analizo tus necesidades y te guío hacia soluciones'
                      : 'I analyze your needs and guide you to solutions'
                  },
                  {
                    icon: '📧',
                    title: language === 'es' ? 'Enviar información' : 'Send information',
                    description: language === 'es'
                      ? 'Te envío detalles y confirmaciones por email'
                      : 'I send you details and confirmations by email'
                  }
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-2xl p-6">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {language === 'es' ? 'Consejos para una mejor conversación' : 'Tips for a better conversation'}
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{language === 'es' ? 'Habla claramente y a un ritmo normal' : 'Speak clearly and at a normal pace'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{language === 'es' ? 'Usa audífonos para mejor calidad de audio' : 'Use headphones for better audio quality'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{language === 'es' ? 'Asegúrate de estar en un lugar tranquilo' : 'Make sure you\'re in a quiet place'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column - Agent Interface */}
          <div className="lg:sticky lg:top-8">
            {/* Call Type Selector */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {language === 'es' ? 'Elige cómo conectar' : 'Choose how to connect'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCallType('web')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    callType === 'web'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="font-semibold">{language === 'es' ? 'Web' : 'Web'}</div>
                  <div className="text-xs opacity-75">{language === 'es' ? 'En tu navegador' : 'In your browser'}</div>
                </button>
                <button
                  onClick={() => setCallType('phone')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    callType === 'phone'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <div className="font-semibold">{language === 'es' ? 'Teléfono' : 'Phone'}</div>
                  <div className="text-xs opacity-75">{language === 'es' ? 'Te llamamos' : 'We call you'}</div>
                </button>
              </div>
            </div>

            {callType === 'phone' ? (
              /* Phone Call Interface */
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{language === 'es' ? 'Recibe una llamada' : 'Get a call'}</h2>
                      <p className="text-green-100 text-sm">
                        {language === 'es' ? 'Te llamaremos a tu teléfono' : 'We\'ll call your phone'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center mb-4">
                        <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {language === 'es'
                          ? 'Ingresa tu número y te llamaremos en segundos'
                          : 'Enter your number and we\'ll call you in seconds'
                        }
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {language === 'es' ? 'Tu nombre (opcional)' : 'Your name (optional)'}
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={language === 'es' ? 'Ej: Juan Pérez' : 'Ex: John Doe'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {language === 'es' ? 'Número de teléfono' : 'Phone number'}
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        {language === 'es'
                          ? 'Incluye el código de país (ej: +1 para USA, +52 para México)'
                          : 'Include country code (ex: +1 for USA, +52 for Mexico)'
                        }
                      </p>
                    </div>

                    <CallButton
                      phoneNumber={phoneNumber}
                      customerName={customerName}
                      agentId="agent_2301kg3qxsdcfgha22tf1eq8vr4z"
                      onCallInitiated={(callSid, callId) => {
                        console.log('Call initiated:', callSid, callId);
                      }}
                      onError={(error) => {
                        console.error('Call error:', error);
                      }}
                      className="w-full"
                    >
                      <span>{language === 'es' ? '📞 Llamarme ahora' : '📞 Call me now'}</span>
                    </CallButton>

                    <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>
                          {language === 'es'
                            ? 'Recibirás una llamada desde nuestro número. La llamada es gratuita y tu número no será compartido.'
                            : 'You\'ll receive a call from our number. The call is free and your number won\'t be shared.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 text-center text-xs text-gray-500">
                  Powered by <span className="text-green-600 font-semibold">Twilio</span> + <span className="text-blue-600 font-semibold">ElevenLabs</span>
                </div>
              </div>
            ) : (
            /* Web Call Interface (existing) */
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Agent Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ${isCallStarted ? 'animate-pulse' : ''}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Cesar</h2>
                    <p className="text-blue-100 text-sm">
                      {isCallStarted
                        ? (language === 'es' ? 'En llamada...' : 'On call...')
                        : (language === 'es' ? 'Asistente virtual' : 'Virtual assistant')
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Agent Body */}
              <div className="p-8">
                {!isCallStarted ? (
                  <div className="text-center space-y-6">
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden flex items-center justify-center">
                      <Image
                        src="/images/cesarvega.png"
                        alt="Cesar"
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {language === 'es' ? '¡Hola! Soy Cesar' : 'Hi! I\'m Cesar'}
                      </h3>
                      <p className="text-gray-600">
                        {language === 'es'
                          ? 'Haz clic en el botón para iniciar una conversación de voz'
                          : 'Click the button to start a voice conversation'
                        }
                      </p>
                    </div>

                    <button
                      onClick={startConversation}
                      disabled={conversation.status === 'connecting'}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-3 shadow-lg"
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
                          <span>{language === 'es' ? 'Iniciar llamada' : 'Start call'}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className="w-32 h-32 mx-auto rounded-full overflow-hidden flex items-center justify-center animate-pulse">
                        <Image
                          src="/images/cesarvega.png"
                          alt="Cesar"
                          width={128}
                          height={128}
                          className="object-cover w-full h-full"
                        />
                      </div>

                      {/* Animated rings */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-40 h-40 rounded-full border-4 border-green-300 animate-ping opacity-20" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {language === 'es' ? 'Llamada en curso' : 'Call in progress'}
                      </h3>
                      <p className="text-gray-600">
                        {language === 'es'
                          ? 'Puedo escucharte. ¿En qué puedo ayudarte?'
                          : 'I can hear you. How can I help you?'
                        }
                      </p>
                    </div>

                    {/* Call controls */}
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() => {
                          const newVolume = isMuted ? 1 : 0;
                          conversation.setVolume({ volume: newVolume });
                          setIsMuted(!isMuted);
                        }}
                        className="p-4 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={endConversation}
                        className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{language === 'es' ? 'Finalizar llamada' : 'End call'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Status indicators */}
                <div className="mt-6 pt-6 border-t border-gray-200">
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
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 text-center text-xs text-gray-500">
                Powered by <span className="text-blue-600 font-semibold">ElevenLabs</span> Conversational AI
              </div>
            </div>
            )
            }
          </div>
        </div>
      </div>
    </main>
  );
}
