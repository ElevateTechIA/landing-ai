'use client';

import { useState, useEffect } from 'react';
import Chatbot from './Chatbot';

type ChatMode = 'chatbot' | 'agent';

export default function ChatModeToggle() {
  const [mode, setMode] = useState<ChatMode>('chatbot');
  const [isOpen, setIsOpen] = useState(false);

  // Control visibility of ElevenLabs widget based on mode
  useEffect(() => {
    const widget = document.querySelector('elevenlabs-convai') as HTMLElement;
    if (widget) {
      if (mode === 'agent' && isOpen) {
        widget.style.display = 'block';
      } else {
        widget.style.display = 'none';
      }
    }
  }, [mode, isOpen]);

  // Hide widget on initial load
  useEffect(() => {
    const hideWidget = () => {
      const widget = document.querySelector('elevenlabs-convai') as HTMLElement;
      if (widget) {
        widget.style.display = 'none';
      }
    };

    // Try immediately and after a delay (widget loads async)
    hideWidget();
    const timeout = setTimeout(hideWidget, 1000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Mode Toggle Panel - shown when main button is clicked */}
        {isOpen && (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 mb-2 animate-in slide-in-from-bottom-2">
            <p className="text-xs text-gray-500 mb-3 font-medium">Select chat mode:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('chatbot')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'chatbot'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chatbot
                </span>
              </button>
              <button
                onClick={() => setMode('agent')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'agent'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Agent Call
                </span>
              </button>
            </div>

            {/* Info text */}
            <p className="text-xs text-gray-400 mt-3 text-center">
              {mode === 'chatbot'
                ? 'Text-based chat assistant'
                : 'Voice AI agent (11Labs)'}
            </p>
          </div>
        )}

        {/* Main Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
            isOpen
              ? 'bg-gray-700 hover:bg-gray-800'
              : mode === 'chatbot'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {isOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : mode === 'chatbot' ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Chatbot Window - only shown when mode is chatbot and isOpen */}
      {mode === 'chatbot' && isOpen && (
        <div className="fixed bottom-24 right-6 z-50">
          <Chatbot />
        </div>
      )}
    </>
  );
}
