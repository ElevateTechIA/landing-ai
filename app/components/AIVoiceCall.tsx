'use client';

import { useState, useRef, useEffect } from 'react';

export default function AIVoiceCall() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);

  // Format call duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start call timer
  useEffect(() => {
    if (isInCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isInCall]);

  const startCall = async () => {
    try {
      setIsConnecting(true);

      // Get user's microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Initialize AudioContext with proper sample rate
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Resume audio context (required for some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Connect to ElevenLabs WebSocket
      const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'your-agent-id';

      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`
      );

      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnecting(false);
        setIsInCall(true);
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message type:', data.type);

          if (data.type === 'conversation_initiation_metadata') {
            console.log('Conversation ID:', data.conversation_id);
          } else if (data.type === 'audio') {
            console.log('Audio message received. Has audio data:', !!data.audio, 'Audio length:', data.audio ? data.audio.length : 0);
            
            if (!data.audio) {
              console.warn('Audio message received but data.audio is empty');
              return;
            }
            
            // Play audio from AI - ElevenLabs sends base64 encoded PCM16 audio
            console.log('Processing audio chunk, base64 length:', data.audio.length);
            
            try {
              if (!audioContextRef.current) {
                console.error('AudioContext not initialized');
                return;
              }

              console.log('AudioContext state:', audioContextRef.current.state);
              console.log('AudioContext sampleRate:', audioContextRef.current.sampleRate);

              // Resume audio context if suspended
              if (audioContextRef.current.state === 'suspended') {
                console.log('Resuming suspended AudioContext...');
                await audioContextRef.current.resume();
                console.log('AudioContext resumed, new state:', audioContextRef.current.state);
              }

              // Decode base64 to binary string
              const binaryString = atob(data.audio);
              console.log('Decoded binary string length:', binaryString.length);
              
              // Convert binary string to Uint8Array
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Convert PCM16 to Float32 for Web Audio API
              const pcm16 = new Int16Array(bytes.buffer);
              const float32 = new Float32Array(pcm16.length);
              
              for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / 32768.0; // Convert to -1.0 to 1.0 range
              }

              console.log('Float32 samples:', float32.length, 'Duration:', float32.length / 16000, 'seconds');

              // Create audio buffer and play
              const audioBuffer = audioContextRef.current.createBuffer(
                1, // mono
                float32.length,
                16000 // Must match the sample rate
              );
              audioBuffer.getChannelData(0).set(float32);

              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              
              // Create gain node for volume control
              const gainNode = audioContextRef.current.createGain();
              gainNode.gain.value = 1.0; // Full volume
              
              source.connect(gainNode);
              gainNode.connect(audioContextRef.current.destination);
              
              console.log('Starting audio playback, duration:', audioBuffer.duration, 'seconds');
              source.start();
              
              // Track active sources
              audioQueueRef.current.push(source);
              source.onended = () => {
                console.log('Audio chunk finished playing');
                const index = audioQueueRef.current.indexOf(source);
                if (index > -1) {
                  audioQueueRef.current.splice(index, 1);
                }
              };
            } catch (audioError) {
              console.error('Error processing audio:', audioError);
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        endCall();
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        endCall();
      };

      // Send audio from microphone to WebSocket
      if (audioContextRef.current && stream) {
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContextRef.current.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && !isMuted) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
            }

            ws.send(JSON.stringify({
              type: 'audio',
              audio: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))
            }));
          }
        };
      }

    } catch (error) {
      console.error('Error starting call:', error);
      setIsConnecting(false);
      alert('Could not access microphone. Please allow microphone access and try again.');
    }
  };

  const endCall = () => {
    // Stop all audio sources
    audioQueueRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source may already be stopped
      }
    });
    audioQueueRef.current = [];

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsInCall(false);
    setIsConnecting(false);
    setCallDuration(0);
    setIsOpen(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // Toggle
      });
    }
  };

  return (
    <>
      {/* Floating Call Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Start AI Call"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
          />
        </svg>
      </button>

      {/* Call Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <span className="font-semibold">Talk to us!</span>
              </div>
              <button
                onClick={() => !isInCall && setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>
            </div>

            {/* Call Interface */}
            <div className="p-8 text-center">
              {/* AI Avatar */}
              <div className="mb-6 flex justify-center">
                <div className={`relative ${isInCall ? 'animate-pulse-ring' : ''}`}>
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-16 h-16 text-blue-600"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Name */}
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Andrea</h3>

              {/* Call Status */}
              <div className="mb-8">
                {isConnecting && (
                  <p className="text-gray-600">Connecting...</p>
                )}
                {isInCall && (
                  <p className="text-blue-600 font-semibold">
                    Talking <span className="text-blue-500">{formatDuration(callDuration)}</span>
                  </p>
                )}
                {!isConnecting && !isInCall && (
                  <p className="text-gray-600">Ready to help you</p>
                )}
              </div>

              {/* Call Controls */}
              <div className="flex justify-center gap-6">
                {!isInCall ? (
                  <button
                    onClick={startCall}
                    disabled={isConnecting}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-7 h-7"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                      />
                    </svg>
                  </button>
                ) : (
                  <>
                    {/* Mute Button */}
                    <button
                      onClick={toggleMute}
                      className={`${
                        isMuted ? 'bg-gray-400' : 'bg-white border-2 border-gray-300'
                      } rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110`}
                    >
                      {isMuted ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="white"
                          className="w-6 h-6"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 3l18 18"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-6 h-6 text-gray-700"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                          />
                        </svg>
                      )}
                    </button>

                    {/* End Call Button */}
                    <button
                      onClick={endCall}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-7 h-7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Call Info */}
              {!isInCall && (
                <div className="mt-8 text-sm text-gray-500">
                  <p>Get instant answers about our AI services</p>
                  <p className="mt-1">Book a demo or ask any questions</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-3 text-center text-xs text-gray-500">
              Powered by <span className="text-blue-600 font-semibold">ElevenLabs</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s infinite;
        }
      `}</style>
    </>
  );
}
