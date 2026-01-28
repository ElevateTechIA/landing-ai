'use client';

import { useState } from 'react';

interface CallButtonProps {
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  agentId: string;
  customVariables?: Record<string, any>;
  onCallInitiated?: (callSid: string, callId: string) => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function CallButton({
  phoneNumber,
  customerName,
  customerEmail,
  agentId,
  customVariables,
  onCallInitiated,
  onError,
  className = '',
  children,
}: CallButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCall = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/twilio/initiate-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          customerName,
          customerEmail,
          agentId,
          customVariables,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      setSuccess(true);

      if (onCallInitiated) {
        onCallInitiated(data.callSid, data.callId);
      }

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: any) {
      const errorMessage = err.message || 'Error al iniciar la llamada';
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }

      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCall}
        disabled={isLoading || success}
        className={`
          inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg
          font-semibold text-white transition-all duration-200
          ${
            success
              ? 'bg-green-600 cursor-default'
              : isLoading
              ? 'bg-gray-400 cursor-wait'
              : 'bg-green-500 hover:bg-green-600 active:scale-95'
          }
          disabled:opacity-75
          ${className}
        `}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Iniciando llamada...</span>
          </>
        ) : success ? (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Llamada iniciada</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            {children || <span>Llamar ahora</span>}
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-semibold">Llamada iniciada</p>
            <p>Recibirás una llamada en breve desde nuestro agente de IA.</p>
          </div>
        </div>
      )}
    </div>
  );
}
