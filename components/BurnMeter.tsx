import React from 'react';

interface BurnMeterProps {
  sugarGrams: number;
}

const BurnMeter: React.FC<BurnMeterProps> = ({ sugarGrams }) => {
  // 1g Sugar = 4 Calories
  const calories = sugarGrams * 4;

  // Estimates (calories per minute)
  // Walking: ~4 cal/min
  // Running: ~11 cal/min
  // Burpees: ~10 cal/min (high intensity)
  const walkingMins = Math.ceil(calories / 4);
  const runningMins = Math.ceil(calories / 11);
  const burpeesMins = Math.ceil(calories / 10);

  if (sugarGrams < 5) return null;

  return (
    <div className="mt-4 bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">The Physical Cost</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Walking */}
        <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
           <span className="text-xl mb-1">🚶</span>
           <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{walkingMins}<span className="text-[10px] font-medium text-zinc-400 ml-0.5">m</span></span>
           <span className="text-[9px] font-bold text-zinc-400 uppercase">Walking</span>
        </div>

        {/* Running */}
        <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
           {runningMins > 20 && <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full animate-pulse mr-1 mt-1"></div>}
           <span className="text-xl mb-1">🏃</span>
           <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{runningMins}<span className="text-[10px] font-medium text-zinc-400 ml-0.5">m</span></span>
           <span className="text-[9px] font-bold text-zinc-400 uppercase">Running</span>
        </div>

        {/* Burpees */}
        <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
           <span className="text-xl mb-1">🥵</span>
           <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{burpeesMins}<span className="text-[10px] font-medium text-zinc-400 ml-0.5">m</span></span>
           <span className="text-[9px] font-bold text-zinc-400 uppercase">Burpees</span>
        </div>
      </div>
      
      <div className="text-center mt-3 text-[10px] text-zinc-400 italic">
         Based on {calories} kcal intake from sugar alone.
      </div>
    </div>
  );
};

export default BurnMeter;