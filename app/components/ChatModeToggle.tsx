'use client';

import { useState, useEffect } from 'react';

export default function ChatModeToggle() {
  const [widgetVisible, setWidgetVisible] = useState(false);

  // Control visibility of ElevenLabs widget
  useEffect(() => {
    const widget = document.querySelector('elevenlabs-convai') as HTMLElement;
    if (widget) {
      if (widgetVisible) {
        widget.style.display = 'block';
        widget.style.position = 'fixed';
        widget.style.zIndex = '9999';
        widget.style.bottom = '100px';
        widget.style.right = '24px';
      } else {
        widget.style.display = 'none';
      }
    }
  }, [widgetVisible]);

  // Hide widget on initial load
  useEffect(() => {
    const hideWidget = () => {
      const widget = document.querySelector('elevenlabs-convai') as HTMLElement;
      if (widget) {
        widget.style.display = 'none';
      }
    };

    hideWidget();
    const timeout = setTimeout(hideWidget, 500);
    const timeout2 = setTimeout(hideWidget, 1000);
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, []);

  return (
    <>
      {/* Floating Call Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setWidgetVisible(!widgetVisible)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
            widgetVisible
              ? 'bg-gray-700 hover:bg-gray-800'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {widgetVisible ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
