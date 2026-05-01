import React, { useEffect, useState, useMemo } from 'react';

interface SugarPileProps {
  grams: number;
}

interface SugarCubeProps {
  delay: number;
  isVisible: boolean;
  rotation: number;
  offsetX: number;
}

const SugarCube: React.FC<SugarCubeProps> = ({ delay, isVisible, rotation, offsetX }) => {
  return (
    <div 
      className={`relative w-10 h-10 transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-[40vh] opacity-0 rotate-180'}`}
      style={{ 
        transitionDelay: `${delay}ms`,
        transform: isVisible 
            ? `rotate(${rotation}deg) translateX(${offsetX}px)` 
            : undefined
      }}
    >
        {/* Realistic Cube CSS */}
        <div className="relative w-full h-full">
            {/* Shadow */}
            <div className="absolute -bottom-2 left-1 right-1 h-2 bg-black/20 blur-sm rounded-full opacity-50"></div>
            
            {/* Main Block (Front) */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-50 to-zinc-200 rounded-[4px] border border-white/50 shadow-inner z-20">
                {/* Granular Texture */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-multiply"></div>
                {/* Highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent rounded-t-[4px]"></div>
            </div>
            
            {/* 3D Sides (Pseudo-3D) */}
            <div className="absolute top-0 right-0 w-3 h-full bg-zinc-300 transform skew-y-[45deg] origin-top-right -translate-x-full z-10 rounded-r-[2px]"></div>
            <div className="absolute top-0 left-0 w-full h-3 bg-white transform skew-x-[45deg] origin-top-left -translate-y-full z-10 rounded-t-[2px]"></div>
        </div>
    </div>
  );
};

const SugarPile: React.FC<SugarPileProps> = ({ grams }) => {
  const [visibleCubes, setVisibleCubes] = useState(0);
  
  // 1 Sugar Cube approx 4 grams
  const totalCubes = Math.max(1, Math.round(grams / 4));
  const isShocking = grams > 24; 
  const teaspoons = (grams / 4).toFixed(1);

  useEffect(() => {
    setVisibleCubes(0);
    // Faster accumulation for shock value
    const interval = setInterval(() => {
      setVisibleCubes(prev => {
        if (prev < totalCubes) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 150); 

    return () => clearInterval(interval);
  }, [totalCubes]);

  // Generate deterministic random positions
  const cubesData = useMemo(() => {
    return Array.from({ length: totalCubes }).map((_, i) => ({
      rotation: ((i * 1337) % 20) - 10, // Slight rotation -10 to 10
      offsetX: ((i * 997) % 10) - 5,    // Slight jitter X
      delay: 0 // We handle delay via state increment for "piling" effect, but individual css transition handles the fall
    }));
  }, [totalCubes]);

  return (
    <div className={`w-full relative rounded-3xl overflow-hidden transition-all duration-500 min-h-[320px] flex flex-col
      ${isShocking 
        ? 'bg-rose-50 border-2 border-rose-200 shadow-[inset_0_0_40px_rgba(225,29,72,0.1)]' 
        : 'bg-white border border-zinc-200'}`}>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 dark:to-black/30 pointer-events-none"></div>

      {/* Info Header */}
      <div className="relative z-20 pt-6 px-6 text-center">
         <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border
            ${isShocking 
                ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700' 
                : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'}`}>
             Sugar Content
         </div>
         
         <div className="flex flex-col items-center justify-center">
             <div className="flex items-baseline gap-1">
                 <span className={`text-5xl font-black tracking-tight ${isShocking ? 'text-rose-600 dark:text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                    {Math.min(visibleCubes * 4, grams)}
                 </span>
                 <span className="text-xl font-bold text-zinc-400">g</span>
             </div>
             <div className="text-sm font-medium text-zinc-500 mt-1">
                ≈ {Math.min(visibleCubes, totalCubes)} Cubes / {((Math.min(visibleCubes, totalCubes) * 4) / 4).toFixed(1)} Tsp
             </div>
         </div>
      </div>

      {/* The Pile Container */}
      <div className="flex-1 w-full flex items-end justify-center pb-6 px-8 relative z-10 overflow-hidden">
         {/* Container for cubes to pile up */}
         <div className="flex flex-wrap-reverse justify-center content-start gap-1 w-full max-w-[300px]" style={{ minHeight: '100px' }}>
             {cubesData.map((cube, i) => (
                <SugarCube 
                    key={i} 
                    delay={0} // Controlled by visibleCubes state
                    isVisible={i < visibleCubes}
                    rotation={cube.rotation}
                    offsetX={cube.offsetX}
                />
             ))}
         </div>
      </div>

      {/* Shock Warning */}
      {isShocking && visibleCubes > 0 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="bg-rose-600 text-white px-4 py-2 rounded-xl shadow-xl shadow-rose-600/30 flex items-center gap-2 animate-pulse">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               <span className="font-bold text-xs uppercase tracking-wide">Sugar Spike Warning</span>
            </div>
        </div>
      )}
    </div>
  );
};

export default SugarPile;