
import React from 'react';
import { BarcodeScanResult } from '../types';

interface FullDisclosureProps {
  data: BarcodeScanResult;
  onClose: () => void;
}

const FullDisclosure: React.FC<FullDisclosureProps> = ({ data, onClose }) => {
  return (
    <div className="bg-[#0B0C10] rounded-[2rem] p-6 border border-zinc-800 shadow-2xl relative overflow-y-auto w-full max-w-md mx-auto font-sans animate-in zoom-in-95 duration-300 max-h-[90vh]">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-indigo-900/20 blur-[60px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
            <div>
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-1">DIGITAL NUTRITION LABEL</div>
                <h2 className="text-3xl font-black text-white tracking-tighter leading-none">Full Disclosure</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-indigo-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
        </div>

        {/* Tab Buttons (Visual Only) */}
        <div className="flex gap-3 mb-8">
            <div className="bg-slate-800/80 text-slate-300 text-[10px] font-bold px-4 py-2 rounded-lg border border-slate-700 uppercase tracking-wide">
                HIDDEN DATA
            </div>
            <div className="bg-rose-950/30 text-rose-500 text-[10px] font-bold px-4 py-2 rounded-lg border border-rose-900/50 uppercase tracking-wide">
                HEALTH RISK
            </div>
        </div>

        {/* Section 1: PRIMARY OFFENDERS */}
        <div className="mb-8">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">PRIMARY OFFENDERS (HIDDEN)</h3>
            <div className="space-y-3">
                {data.additives.map((item, idx) => (
                    <div key={idx} className="bg-[#13141a] border border-zinc-800 p-3 rounded-xl flex justify-between items-center group">
                        <div>
                            <div className="text-sm font-bold text-white leading-tight mb-0.5">{item.name}</div>
                            <div className="text-[10px] text-zinc-500 font-medium">{item.role}</div>
                        </div>
                        <div className="bg-rose-950/30 border border-rose-900/40 text-rose-400 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wide shadow-[0_0_10px_rgba(225,29,72,0.1)]">
                            {item.risk}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Section 2: SIDE EFFECT FORECAST */}
        <div>
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">SIDE EFFECT FORECAST</h3>
            <div className="space-y-4">
                {data.side_effects.map((effect, idx) => {
                    // Specific styling for Water Retention (Blue/Indigo) vs Digestive/Inflammation (Pink/Rose)
                    const isBlueTheme = effect.condition.toLowerCase().includes('water') || effect.condition.toLowerCase().includes('bloating');
                    
                    const borderColor = isBlueTheme ? 'border-indigo-500/30' : 'border-pink-500/30';
                    const bgColor = isBlueTheme ? 'bg-indigo-950/20' : 'bg-pink-950/20';
                    const titleColor = isBlueTheme ? 'text-indigo-400' : 'text-pink-400';
                    const barColor = isBlueTheme ? 'bg-indigo-500' : 'bg-pink-500';
                    const icon = isBlueTheme 
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />;

                    return (
                        <div key={idx} className={`rounded-2xl p-4 border ${borderColor} ${bgColor} relative overflow-hidden`}>
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <div className={`font-bold text-sm ${titleColor}`}>{effect.condition}</div>
                                <div className="text-white font-bold text-xs">{effect.severity}</div>
                            </div>
                            
                            <p className="text-[11px] text-zinc-400 leading-relaxed mb-4 relative z-10 max-w-[90%]">
                                {effect.description}
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden relative z-10">
                                <div className={`h-full ${barColor} rounded-full`} style={{ width: effect.severity === 'High' ? '85%' : effect.severity === 'Moderate' ? '60%' : '30%' }}></div>
                            </div>

                            {/* Background Icon Opacity */}
                            <div className={`absolute right-2 bottom-2 w-16 h-16 ${titleColor} opacity-10 pointer-events-none`}>
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {icon}
                                </svg>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Close Button (Hidden but clickable area or external) - Adding explicit close for usability */}
        <button onClick={onClose} className="mt-6 w-full py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors border border-zinc-800">
            Close Report
        </button>

      </div>
    </div>
  );
};

export default FullDisclosure;
