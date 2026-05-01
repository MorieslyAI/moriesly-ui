
import React from 'react';
import { VersusResult } from '../types';

interface VersusArenaProps {
  data: VersusResult;
  imgA?: string;
  imgB?: string;
  onClose: () => void;
  onChoose?: (winner: 'A' | 'B' | 'Reject') => void;
}

const VersusArena: React.FC<VersusArenaProps> = ({ data, imgA, imgB, onClose, onChoose }) => {
  const winner = data.winner;
  
  // Tactical breakdown merger: Combine Pros (+) and Cons (-) for display in the grid
  const getBreakdownList = (item: typeof data.itemA) => {
      const list = [];
      item.pros.forEach(p => list.push({ text: p, type: 'pro' }));
      item.cons.forEach(c => list.push({ text: c, type: 'con' }));
      return list;
  };

  const listA = getBreakdownList(data.itemA);
  const listB = getBreakdownList(data.itemB);

  // Helper to render the item card
  const renderItemCard = (item: typeof data.itemA, img: string | undefined, isWinner: boolean, label: string) => (
      <div className={`relative flex flex-col items-center bg-transparent rounded-3xl p-2 md:p-4 transition-all duration-500 w-1/2 ${isWinner ? 'scale-105 z-10' : 'scale-95 opacity-80'}`}>
          {/* Winner Badge */}
          {isWinner && (
              <div className="absolute -top-2 md:-top-3 z-20 bg-teal-500 text-black font-black text-[9px] md:text-xs px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest shadow-[0_0_15px_#14b8a6]">
                  WINNER
              </div>
          )}

          {/* Avatar */}
          <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 overflow-hidden mb-3 md:mb-4 relative shadow-2xl ${isWinner ? 'border-teal-500 shadow-teal-500/20' : 'border-zinc-700'}`}>
              {img ? (
                  <img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover" />
              ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-2xl md:text-3xl">{label}</div>
              )}
          </div>

          {/* Info */}
          <h3 className={`text-sm md:text-lg font-bold text-center leading-tight mb-1 break-words w-full px-1 ${isWinner ? 'text-teal-400' : 'text-rose-400'}`}>
              {item.name}
          </h3>
          <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-wide mb-2 md:mb-3 text-center min-h-[15px] leading-tight px-1">
              {item.description || "Analyzed Item"}
          </p>

          {/* Big Score */}
          <div className="text-center mb-2 md:mb-3">
              <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">{item.score}</span>
              <span className="text-[10px] md:text-sm font-bold text-zinc-600">/100</span>
          </div>

          {/* Sugar Bar */}
          <div className="w-full bg-zinc-800 h-1.5 md:h-2 rounded-full overflow-hidden mb-1">
              <div 
                  className={`h-full ${isWinner ? 'bg-teal-500' : 'bg-rose-500'} transition-all duration-1000`} 
                  style={{ width: `${Math.min(item.sugar * 2, 100)}%` }} // Rough scale: 50g = 100%
              ></div>
          </div>
          <div className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase">
              Sugar: <span className="text-white">{item.sugar}g</span>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 md:p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#0B0C10] border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden relative flex flex-col h-[90vh] md:max-h-[90vh]">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 flex justify-between items-center p-4 md:p-6 border-b border-zinc-800/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className="text-xl md:text-2xl">⚔️</div>
                <div>
                    <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight leading-none">TACTICAL DUEL</h2>
                    <div className="text-[9px] md:text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-0.5 md:mt-1">ID: {Math.floor(Math.random() * 10000)}-AX</div>
                </div>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            
            {/* The Duel Arena */}
            <div className="flex justify-center items-center py-4 md:py-8 relative shrink-0">
                
                {/* VS Badge Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-[#0B0C10] border-2 border-zinc-800 flex items-center justify-center text-zinc-700 font-black italic text-sm md:text-xl shadow-xl">
                        VS
                    </div>
                </div>

                <div className="flex w-full justify-between items-start px-2 md:px-4 gap-2 md:gap-4">
                    {renderItemCard(data.itemA, imgA, winner === 'A', 'A')}
                    {renderItemCard(data.itemB, imgB, winner === 'B', 'B')}
                </div>
            </div>

            {/* Tactical Breakdown */}
            <div className="px-4 md:px-6 pb-6">
                <div className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2 text-center md:text-left">
                    Tactical Breakdown
                </div>
                
                <div className="grid grid-cols-2 gap-4 md:gap-8">
                    {/* Column A */}
                    <div className="space-y-2 md:space-y-3">
                        {listA.map((point, i) => (
                            <div key={i} className="flex items-start gap-1.5 md:gap-2 text-[10px] md:text-xs font-medium leading-snug">
                                <span className={`flex-shrink-0 font-bold ${point.type === 'pro' ? 'text-teal-500' : 'text-rose-500'}`}>
                                    {point.type === 'pro' ? '+' : '-'}
                                </span>
                                <span className={point.type === 'pro' ? 'text-teal-100' : 'text-rose-100/80'}>
                                    {point.text}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Column B */}
                    <div className="space-y-2 md:space-y-3">
                        {listB.map((point, i) => (
                            <div key={i} className="flex items-start gap-1.5 md:gap-2 text-[10px] md:text-xs font-medium leading-snug">
                                <span className={`flex-shrink-0 font-bold ${point.type === 'pro' ? 'text-teal-500' : 'text-rose-500'}`}>
                                    {point.type === 'pro' ? '+' : '-'}
                                </span>
                                <span className={point.type === 'pro' ? 'text-teal-100' : 'text-rose-100/80'}>
                                    {point.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>

        {/* Footer Actions */}
        {onChoose && (
            <div className="p-3 md:p-4 border-t border-zinc-800 bg-[#0B0C10] relative z-20 flex gap-2 md:gap-3 shrink-0">
                <button 
                    onClick={() => onChoose('A')}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-teal-900/50 border border-zinc-700 hover:border-teal-500/50 rounded-xl text-[10px] md:text-xs font-bold uppercase text-zinc-300 hover:text-teal-400 transition-all active:scale-95 truncate"
                >
                    Consume A
                </button>
                <button 
                    onClick={() => onChoose('Reject')}
                    className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-white rounded-xl text-[10px] md:text-xs font-bold uppercase transition-all active:scale-95 truncate"
                >
                    Reject Both
                </button>
                <button 
                    onClick={() => onChoose('B')}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-rose-900/50 border border-zinc-700 hover:border-rose-500/50 rounded-xl text-[10px] md:text-xs font-bold uppercase text-zinc-300 hover:text-rose-400 transition-all active:scale-95 truncate"
                >
                    Consume B
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default VersusArena;
