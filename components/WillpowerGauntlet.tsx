
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Lock } from 'lucide-react';

interface WillpowerGauntletProps {
  onSuccess: () => void;
  onFail: () => void;
  sugarAmount: number;
}

const WillpowerGauntlet: React.FC<WillpowerGauntletProps> = ({ onSuccess, onFail, sugarAmount }) => {
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Difficulty multiplier based on sugar amount (More sugar = Harder to pull)
  const difficulty = Math.min(1.5, Math.max(0.8, sugarAmount / 30));

  const handleStart = (clientX: number) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !trackRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rect = trackRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const width = rect.width;
      
      // Calculate raw percentage (0 to 1)
      let rawPercent = Math.max(0, Math.min(1, offsetX / width));
      
      // Apply difficulty resistance
      let resistedPercent = rawPercent;
      if (difficulty > 1) {
          resistedPercent = Math.pow(rawPercent, difficulty); 
      }
      
      setProgress(resistedPercent * 100);
      
      if (navigator.vibrate && rawPercent > 0.7) {
         if (Math.random() > 0.8) navigator.vibrate(10);
      }
    };

    const handleGlobalEnd = () => {
      if (isDragging) {
        handleEnd();
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalEnd);
      window.addEventListener('touchmove', handleGlobalMove, { passive: false });
      window.addEventListener('touchend', handleGlobalEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, difficulty, progress]);

  const handleEnd = () => {
    setIsDragging(false);
    if (progress > 90) {
      setProgress(100);
      onSuccess();
    } else {
      // Snap back animation
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 8; // Faster snap back
        });
      }, 16);
    }
  };

  // Warning text changes based on progress
  const getWarningText = () => {
      if (progress > 80) return "⚠️ FINAL WARNING ⚠️";
      if (progress > 50) return "METABOLIC DAMAGE IMMINENT";
      if (progress > 20) return "DON'T DO IT";
      return "OVERRIDE SAFETY";
  };

  // Dynamic Styles for the "Stress" effect
  const containerStyle = {
      transform: isDragging && progress > 50 ? `translate(${Math.random() * 2 - 1}px, ${Math.random() * 2 - 1}px)` : 'none',
  };

  return (
    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom duration-500">
        
        {/* Reject Button (Easy Choice) */}
        <button 
            onClick={onFail}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase text-base shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
        >
            <Check className="w-5 h-5" strokeWidth={3} />
            Reject & Save Health
        </button>

        <div className="relative flex items-center justify-center py-1">
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full"></div>
            <span className="absolute bg-white dark:bg-zinc-900 px-2 text-[9px] text-zinc-400 font-bold uppercase tracking-widest">OR FIGHT THE SYSTEM</span>
        </div>

        {/* The Gauntlet Override (Slide to Override) */}
        <div className="relative flex flex-col gap-2">
            <div 
                ref={trackRef}
                className={`relative h-14 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 select-none touch-none transition-all ${isDragging ? 'border-rose-500/30' : ''}`}
                style={containerStyle}
            >
                {/* Caution Striping Background */}
                <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #000, #000 10px, #fbbf24 10px, #fbbf24 20px)' }}></div>
                
                {/* Progress Fill */}
                <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-rose-900/30 to-rose-600/30"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                />

                {/* Text Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                    <span className={`font-black uppercase tracking-[0.2em] text-[8px] mb-0.5 transition-all ${progress > 50 ? 'text-rose-400' : 'text-zinc-500'}`}>
                        {getWarningText()}
                    </span>
                    <span className={`font-black uppercase tracking-widest text-xs transition-all ${progress > 50 ? 'text-white scale-105' : 'text-zinc-400'}`}>
                        {isDragging ? 'OVERRIDING...' : 'SLIDE TO OVERRIDE'}
                    </span>
                </div>

                {/* The Handle / Lock Indicator (The Draggable Part) */}
                <motion.div 
                    onMouseDown={(e) => handleStart(e.clientX)}
                    onTouchStart={(e) => { handleStart(e.touches[0].clientX); }}
                    className="absolute left-1 top-1 bottom-1 w-12 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 shadow-lg"
                    animate={{ x: `${(progress / 100) * (trackRef.current?.clientWidth ? trackRef.current.clientWidth - 52 : 0)}px` }}
                    transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                >
                    {progress > 90 ? (
                         <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }}>
                            <Lock className="w-4 h-4 text-rose-500" strokeWidth={3} />
                         </motion.div>
                    ) : (
                         <Lock className="w-4 h-4 text-zinc-500" strokeWidth={2.5} />
                    )}
                </motion.div>
            </div>
            
            {/* Progress Bar under the button */}
            <div className="h-1 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full bg-rose-500/50"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', damping: 25, stiffness: 150 }}
                />
            </div>
        </div>
        
        <div className="text-center text-[9px] text-zinc-400 font-mono uppercase tracking-tighter">
             PROTOCOL: RESISTANCE ACTIVE. SLIDE TO OVERRIDE.
        </div>
    </div>
  );
};

export default WillpowerGauntlet;
