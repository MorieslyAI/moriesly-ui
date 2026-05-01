
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';

interface ChronoInterceptProps {
  itemName: string;
  userProfile: UserProfile;
  message: string; // The AI generated text
  onDismiss: (accepted: boolean) => void; // accepted = true means they listened and rejected the food
}

const ChronoIntercept: React.FC<ChronoInterceptProps> = ({ itemName, userProfile, message, onDismiss }) => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Vibrate device on mount if supported (Ringing pattern)
    if (navigator.vibrate) {
        try {
            navigator.vibrate([500, 200, 500, 200, 1000]);
        } catch (e) {
            // Ignore vibration errors
        }
    }
    
    return () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (navigator.vibrate) navigator.vibrate(0);
    };
  }, []);

  const handleAnswer = () => {
    setCallState('connected');
    if (navigator.vibrate) navigator.vibrate(0); // Stop vibration

    if ('speechSynthesis' in window) {
        // Use the AI message or a fallback
        const textToSpeak = message || `Agent ${userProfile.name}, listen to me! I am calling from 20 years in the future. Put down the ${itemName}. My health is failing because of decisions like this. Don't do it!`;
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        // Try to find a deeper/older voice
        const voices = window.speechSynthesis.getVoices();
        // Prefer "Google US English" or similar if available, else first available
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en-US')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        
        // Voice Modulation to sound "Older" and "Serious"
        utterance.rate = 0.85; // Slower
        utterance.pitch = 0.6; // Deeper
        utterance.volume = 1;
        
        utterance.onend = () => {
             setTimeout(() => setCallState('ended'), 1500);
        };

        audioRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    } else {
        // Fallback if no TTS
        setTimeout(() => setCallState('ended'), 5000);
    }
  };

  const handleDecline = () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      // If declined, user insists on eating (consumed)
      onDismiss(false); 
  };

  const handleHangUpAfterTalk = () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      // If listened to the end, user decides. We'll prompt again or assume rejection.
      // For this flow, let's say answering puts them back to decision screen to reconsider.
      onDismiss(true); 
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between py-12 px-6 animate-in slide-in-from-bottom duration-500 font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-black to-black opacity-80"></div>
      
      {/* Glitch Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff00 3px)' }}></div>

      {/* CALLER ID */}
      <div className="relative z-10 flex flex-col items-center gap-6 mt-16">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-zinc-600 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                {/* Silhouette Icon */}
                <svg className="w-20 h-20 text-zinc-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                
                {/* Static/Glitch Overlay on Avatar */}
                <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-20 mix-blend-overlay"></div>
            </div>
            {callState === 'ringing' && (
                <div className="absolute inset-0 rounded-full animate-ping border-2 border-rose-500 opacity-75"></div>
            )}
          </div>
          
          {/* TEXT REMOVED HERE AS REQUESTED */}
      </div>

      {/* CONTROLS */}
      <div className="relative z-10 w-full max-w-sm grid grid-cols-2 gap-6">
          {callState === 'ringing' ? (
              <>
                  <button 
                    onClick={handleDecline}
                    className="flex flex-col items-center gap-2 group"
                  >
                      <div className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/50 group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                      </div>
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ignore</span>
                  </button>

                  <button 
                    onClick={handleAnswer}
                    className="flex flex-col items-center gap-2 group"
                  >
                      <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/50 group-hover:scale-110 transition-transform animate-bounce">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                      </div>
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Accept</span>
                  </button>
              </>
          ) : callState === 'connected' ? (
              <div className="col-span-2 flex flex-col items-center">
                  <div className="w-full h-16 bg-zinc-900 rounded-2xl border border-zinc-700 flex items-center justify-center overflow-hidden mb-8 relative">
                      {/* Audio Waveform Animation */}
                      <div className="flex gap-1 items-center h-full">
                          {[...Array(10)].map((_, i) => (
                              <div key={i} className="w-1 bg-teal-500 animate-[pulse_0.5s_ease-in-out_infinite]" style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.1}s` }}></div>
                          ))}
                      </div>
                  </div>
                  
                  <button 
                    onClick={handleHangUpAfterTalk}
                    className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50 hover:scale-110 transition-transform"
                  >
                      <svg className="w-8 h-8 text-white transform rotate-135" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                  </button>
              </div>
          ) : (
              <div className="col-span-2 text-center text-zinc-500 text-xs">
                  DISCONNECTED
              </div>
          )}
      </div>

    </div>
  );
};

export default ChronoIntercept;
