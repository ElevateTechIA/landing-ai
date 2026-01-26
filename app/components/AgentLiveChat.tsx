'use client';

import { useState, useEffect, useRef } from 'react';

interface TranscriptMessage {
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
  isPartial?: boolean;
}

interface AgentLiveChatProps {
  onClose: () => void;
}

export default function AgentLiveChat({ onClose }: AgentLiveChatProps) {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to ElevenLabs widget and listen for events
  useEffect(() => {
    const setupWidget = () => {
      const widget = document.querySelector('elevenlabs-convai') as HTMLElement & {
        addEventListener: (event: string, callback: (e: CustomEvent) => void) => void;
        removeEventListener: (event: string, callback: (e: CustomEvent) => void) => void;
      };

      if (!widget) {
        setTimeout(setupWidget, 500);
        return;
      }

      widgetRef.current = widget;

      // Show the widget
      widget.style.display = 'block';

      // Listen to widget events
      const handleMessage = (e: CustomEvent) => {
        const detail = e.detail;
        console.log('Widget event:', e.type, detail);

        if (e.type === 'elevenlabs-convai:call-started') {
          setIsConnected(true);
          setMessages(prev => [...prev, {
            role: 'agent',
            text: 'Connected! I\'m listening...',
            timestamp: new Date()
          }]);
        }

        if (e.type === 'elevenlabs-convai:call-ended') {
          setIsConnected(false);
          setIsListening(false);
          setAgentSpeaking(false);
        }

        if (e.type === 'elevenlabs-convai:agent-response') {
          setAgentSpeaking(true);
          const text = detail?.text || detail?.message || '';
          if (text) {
            setMessages(prev => {
              // Check if last message is a partial agent message
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === 'agent' && lastMsg?.isPartial) {
                // Update the partial message
                return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + ' ' + text }];
              }
              return [...prev, { role: 'agent', text, timestamp: new Date(), isPartial: true }];
            });
          }
        }

        if (e.type === 'elevenlabs-convai:agent-response-end') {
          setAgentSpeaking(false);
          // Mark last agent message as complete
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'agent' && lastMsg?.isPartial) {
              return [...prev.slice(0, -1), { ...lastMsg, isPartial: false }];
            }
            return prev;
          });
        }

        if (e.type === 'elevenlabs-convai:user-transcript') {
          setIsListening(true);
          const text = detail?.text || detail?.transcript || '';
          if (text) {
            setMessages(prev => {
              // Check if last message is a partial user message
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === 'user' && lastMsg?.isPartial) {
                return [...prev.slice(0, -1), { role: 'user', text, timestamp: new Date(), isPartial: true }];
              }
              return [...prev, { role: 'user', text, timestamp: new Date(), isPartial: true }];
            });
          }
        }

        if (e.type === 'elevenlabs-convai:user-transcript-end') {
          setIsListening(false);
          // Mark last user message as complete
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'user' && lastMsg?.isPartial) {
              return [...prev.slice(0, -1), { ...lastMsg, isPartial: false }];
            }
            return prev;
          });
        }
      };

      // Subscribe to all possible events
      const events = [
        'elevenlabs-convai:call-started',
        'elevenlabs-convai:call-ended',
        'elevenlabs-convai:agent-response',
        'elevenlabs-convai:agent-response-end',
        'elevenlabs-convai:user-transcript',
        'elevenlabs-convai:user-transcript-end',
        'elevenlabs-convai:error'
      ];

      events.forEach(event => {
        widget.addEventListener(event, handleMessage as EventListener);
      });

      // Also listen on window/document for bubbled events
      events.forEach(event => {
        window.addEventListener(event, handleMessage as EventListener);
      });

      return () => {
        events.forEach(event => {
          widget.removeEventListener(event, handleMessage as EventListener);
          window.removeEventListener(event, handleMessage as EventListener);
        });
      };
    };

    const cleanup = setupWidget();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Send text message to agent
  const sendTextMessage = () => {
    if (!textInput.trim()) return;

    const widget = widgetRef.current as HTMLElement & {
      sendText?: (text: string) => void;
      dispatchEvent: (event: Event) => void;
    };

    // Add user message to transcript
    setMessages(prev => [...prev, {
      role: 'user',
      text: textInput,
      timestamp: new Date()
    }]);

    // Try to send text to widget
    if (widget) {
      // Method 1: Try sendText method if available
      if (typeof widget.sendText === 'function') {
        widget.sendText(textInput);
      } else {
        // Method 2: Dispatch custom event
        const event = new CustomEvent('elevenlabs-convai:send-text', {
          detail: { text: textInput },
          bubbles: true
        });
        widget.dispatchEvent(event);
      }
    }

    setTextInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 w-full sm:w-96 h-full sm:h-[500px] bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ${agentSpeaking ? 'animate-pulse' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Voice Agent</h3>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></span>
              <span className="text-xs text-purple-100">
                {isConnected
                  ? agentSpeaking
                    ? 'Speaking...'
                    : isListening
                      ? 'Listening...'
                      : 'Connected'
                  : 'Click widget to start'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Live Transcript */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium">Voice Agent Ready</p>
            <p className="text-xs mt-1">Click the purple widget below to start talking</p>
            <p className="text-xs mt-2 text-gray-400">You can also type messages below</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
              } ${msg.isPartial ? 'opacity-70' : ''}`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.isPartial && (
                  <span className="text-xs animate-pulse">...</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Listening indicator */}
        {isListening && (
          <div className="flex justify-end">
            <div className="bg-purple-100 text-purple-600 rounded-2xl px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs">Listening...</span>
            </div>
          </div>
        )}

        {/* Agent speaking indicator */}
        {agentSpeaking && !messages.some(m => m.role === 'agent' && m.isPartial) && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs text-gray-500">Agent speaking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Text Input */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message or speak..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
          <button
            onClick={sendTextMessage}
            disabled={!textInput.trim()}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Speak with voice or type your message
        </p>
      </div>
    </div>
  );
}
