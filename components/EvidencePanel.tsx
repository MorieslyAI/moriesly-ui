
import React from 'react';

interface EvidencePanelProps {
  confidence: number;
  sugarSources: string[];
  visualCues: string[];
  dataRef: string;
  itemName: string;
  sugarAmount: number;
}

const EvidencePanel: React.FC<EvidencePanelProps> = ({ confidence, sugarSources, visualCues, dataRef, itemName, sugarAmount }) => {
  // Determine color based on confidence
  const confColor = confidence > 90 ? 'bg-emerald-500' : confidence > 75 ? 'bg-teal-500' : 'bg-amber-500';
  const confText = confidence > 90 ? 'text-emerald-500' : confidence > 75 ? 'text-teal-500' : 'text-amber-500';

  return (
    <div className="mt-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm animate-in slide-in-from-bottom-2">
      
      {/* Header */}
      <div className="bg-zinc-50 px-4 py-2 flex items-center justify-between border-b border-zinc-200">
          <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Validation Protocol</span>
          </div>
          <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold ${confText}`}>{confidence}% Match</span>
              <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div className={`h-full ${confColor} transition-all duration-1000 ease-out`} style={{ width: `${confidence}%` }}></div>
              </div>
          </div>
      </div>

      <div className="p-4 space-y-4">
          
          {/* 1. Reasoning & Sources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Chemical Breakdown */}
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      Detected Sources
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                      {sugarSources && sugarSources.length > 0 ? sugarSources.map((source, i) => (
                          <span key={i} className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium rounded-md">
                              {source}
                          </span>
                      )) : (
                          <span className="text-[10px] text-zinc-500 italic">No specific sources isolated.</span>
                      )}
                  </div>
              </div>

              {/* Visual Evidence */}
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      Visual Indicators
                  </h4>
                  <ul className="space-y-1">
                      {visualCues && visualCues.length > 0 ? visualCues.map((cue, i) => (
                          <li key={i} className="flex items-center gap-2 text-[10px] text-zinc-600 dark:text-zinc-400">
                              <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                              {cue}
                          </li>
                      )) : (
                          <li className="text-[10px] text-zinc-500 italic">Standard profile match.</li>
                      )}
                  </ul>
              </div>
          </div>

          {/* 2. Reference Comparison */}
          <div className="relative pt-4 pb-2">
              <div className="flex justify-between text-[9px] text-zinc-400 uppercase font-bold mb-2">
                  <span>Relative Density Comparison</span>
                  <span>Source: {dataRef || "Generic Food Database"}</span>
              </div>
              
              {/* Bar Chart */}
              <div className="space-y-2">
                  {/* Current Item */}
                  <div className="flex items-center gap-2">
                      <div className="w-20 text-right text-[10px] font-bold text-zinc-900 dark:text-white truncate">{itemName}</div>
                      <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${sugarAmount > 25 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min(sugarAmount * 1.5, 100)}%` }}
                          ></div>
                      </div>
                      <div className="w-8 text-[10px] font-mono">{sugarAmount}g</div>
                  </div>

                  {/* Healthy Ref (Apple) */}
                  <div className="flex items-center gap-2 opacity-50">
                      <div className="w-20 text-right text-[10px] font-bold text-zinc-500">Apple</div>
                      <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${19 * 1.5}%` }}></div>
                      </div>
                      <div className="w-8 text-[10px] font-mono">19g</div>
                  </div>

                  {/* Bad Ref (Cola) */}
                  <div className="flex items-center gap-2 opacity-50">
                      <div className="w-20 text-right text-[10px] font-bold text-zinc-500">Cola Can</div>
                      <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${39 * 1.5}%` }}></div>
                      </div>
                      <div className="w-8 text-[10px] font-mono">39g</div>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
};

export default EvidencePanel;
