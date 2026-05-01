
import React, { useEffect, useState, useMemo } from 'react';

interface AgentAvatarProps {
  volume: number; // 0 to 100
  isActive: boolean;
}

const AgentAvatar: React.FC<AgentAvatarProps> = ({ volume, isActive }) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Realistic Blinking Engine
  useEffect(() => {
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150); // Fast blink (150ms)
      
      // Random double blink chance
      if (Math.random() > 0.8) {
          setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => setIsBlinking(false), 150);
          }, 300);
      }
    };

    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000; // Blink every 2-6 seconds
      setTimeout(() => {
        triggerBlink();
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
  }, []);

  // Talking Simulation (Scale & Mouth)
  const talkingIntensity = useMemo(() => {
      const v = Math.min(volume, 60) / 60; // Normalize 0-1
      return 1 + (v * 0.05); // Max 5% scale increase
  }, [volume]);

  const mouthHeight = Math.max(4, (volume / 100) * 20);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-zinc-900 flex items-center justify-center transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* --- MASCOT SVG --- */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        style={{
            transform: `scale(${talkingIntensity})`,
            transition: 'transform 0.1s ease-out',
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F1F5F9" />
                    <stop offset="100%" stopColor="#CBD5E1" />
                </linearGradient>
                <linearGradient id="visorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E293B" />
                    <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Floating Animation Group */}
            <g className="animate-float">
                
                {/* Antenna */}
                <line x1="100" y1="40" x2="100" y2="20" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                <circle cx="100" cy="20" r="6" fill="#33ADAE" />

                {/* Head Shape */}
                <rect x="40" y="40" width="120" height="110" rx="35" fill="url(#bodyGrad)" stroke="#fff" strokeWidth="3" />
                
                {/* Inner Face Panel / Visor */}
                <rect x="50" y="65" width="100" height="60" rx="20" fill="url(#visorGrad)" stroke="#334155" strokeWidth="2" />

                {/* Eyes (Teal Glowing) */}
                <g fill="#2DD4BF" filter="url(#glow)">
                    {isBlinking ? (
                        <>
                            {/* Closed Eyes */}
                            <rect x="70" y="92" width="20" height="4" rx="2" opacity="0.8" />
                            <rect x="110" y="92" width="20" height="4" rx="2" opacity="0.8" />
                        </>
                    ) : (
                        <>
                            {/* Open Eyes */}
                            <ellipse cx="80" cy="95" rx="10" ry="12" />
                            <ellipse cx="120" cy="95" rx="10" ry="12" />
                            
                            {/* Eye Highlights */}
                            <circle cx="84" cy="90" r="3" fill="white" opacity="0.8" />
                            <circle cx="124" cy="90" r="3" fill="white" opacity="0.8" />
                        </>
                    )}
                </g>

                {/* Cheeks */}
                <circle cx="60" cy="110" r="4" fill="#F472B6" opacity="0.4" />
                <circle cx="140" cy="110" r="4" fill="#F472B6" opacity="0.4" />

                {/* Mouth (Voice Reactive) */}
                <g transform="translate(100, 135)">
                    {volume > 5 ? (
                        <rect x="-10" y={-mouthHeight/2} width="20" height={mouthHeight} rx="5" fill="#334155" />
                    ) : (
                        <path d="M -10 0 Q 0 5 10 0" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
                    )}
                </g>
            </g>
        </svg>
      </div>

      {/* --- MEDICAL HUD OVERLAY (Simplified) --- */}
      <div className="absolute inset-0 pointer-events-none">
          
          {/* Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.1)_50%)] z-10 bg-[length:100%_4px] pointer-events-none opacity-30"></div>
          
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.4)_100%)]"></div>

          {/* Name Tag */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Moriesly AI</span>
          </div>

      </div>

      <style>{`
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
        }
        .animate-float {
            animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AgentAvatar;
