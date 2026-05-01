import React, { useState } from 'react';
import { ConsumptionTrigger } from '../types';

interface TriggerModalProps {
  onSelect: (trigger: ConsumptionTrigger, ratio: number) => void;
  onCancel: () => void;
}

const TRIGGERS: { id: ConsumptionTrigger; icon: string; label: string; desc: string }[] = [
  { id: 'Hunger', icon: '🍽️', label: 'True Hunger', desc: 'Physical need for calories.' },
  { id: 'Boredom', icon: '🥱', label: 'Boredom', desc: 'Seeking stimulation/dopamine.' },
  { id: 'Stress', icon: '🤯', label: 'Stress', desc: 'Cortisol-induced craving.' },
  { id: 'Social', icon: '🎉', label: 'Social', desc: 'Peer pressure or celebration.' },
  { id: 'Fatigue', icon: '🔋', label: 'Fatigue', desc: 'Trying to wake up.' },
  { id: 'Habit', icon: '🤖', label: 'Habit', desc: 'Routine / "Just because".' },
];

const TriggerModal: React.FC<TriggerModalProps> = ({ onSelect, onCancel }) => {
  const [ratio, setRatio] = useState(1); // 1 = 100%

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border-2 border-zinc-800 w-full max-w-md rounded-3xl p-6 relative shadow-2xl overflow-hidden">
         {/* Background Effect */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.1),transparent_70%)] pointer-events-none"></div>

         <div className="text-center mb-6 relative z-10">
             <div className="inline-block bg-teal-500/10 text-teal-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-teal-500/20 animate-pulse">
                 Psych-Ops Protocol
             </div>
             <h3 className="text-2xl font-black text-white uppercase tracking-tight">State Your Motive</h3>
             <p className="text-zinc-500 text-sm mt-1">Why are you consuming this target?</p>
         </div>

         <div className="mb-6 relative z-10">
            <label className="text-white text-xs font-bold uppercase tracking-widest mb-2 block">
                Consumption Amount: {Math.round(ratio * 100)}%
            </label>
            <input 
                type="range" 
                min="0.1" 
                max="1" 
                step="0.1" 
                value={ratio} 
                onChange={(e) => setRatio(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
         </div>

         <div className="grid grid-cols-2 gap-3 relative z-10">
             {TRIGGERS.map((t) => (
                 <button
                    key={t.id}
                    onClick={() => onSelect(t.id, ratio)}
                    className="group bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-teal-500 p-3 rounded-2xl text-left transition-all duration-200 active:scale-95"
                 >
                     <div className="text-2xl mb-1 group-hover:scale-110 transition-transform origin-left">{t.icon}</div>
                     <div className="font-bold text-white text-sm">{t.label}</div>
                     <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{t.desc}</div>
                 </button>
             ))}
         </div>

         <button 
            onClick={onCancel}
            className="w-full mt-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
         >
             Cancel Consumption
         </button>
      </div>
    </div>
  );
};

export default TriggerModal;