
import React from 'react';
import { LabelScanResult } from '../types';

interface DeceptionDetectorProps {
  data: LabelScanResult;
  onClose: () => void;
}

const DeceptionDetector: React.FC<DeceptionDetectorProps> = ({ data, onClose }) => {
  // Parsing the honesty score for the progress bar
  const deceptionLevel = Math.min(Math.max(data.label_honesty_score, 1), 10);
  
  // Helper to highlight ingredients in the snippet
  const renderHighlightedSnippet = () => {
      if (!data.ingredients_snippet) return null;
      
      const words = data.ingredients_snippet.split(' ');
      return (
          <p className="font-mono text-[10px] md:text-xs text-zinc-400 leading-relaxed break-words">
              {words.map((word, i) => {
                  const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
                  const isBad = data.hidden_additives.some(h => h.toLowerCase().includes(cleanWord) || cleanWord.includes(h.toLowerCase()));
                  
                  return (
                      <span key={i} className={isBad ? "text-rose-500 font-bold bg-rose-900/30 px-0.5 rounded" : ""}>
                          {word}{' '}
                      </span>
                  );
              })}
          </p>
      );
  };

  return (
    <div className="bg-[#0B0C10] rounded-3xl p-6 border border-zinc-800 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 w-full max-w-md mx-auto">
      
      {/* Dark Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,29,72,0.1),transparent_70%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white leading-none">DECEPTION DETECTOR</h3>
                    <div className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.2em] mt-1">FORENSIC LABEL SCAN</div>
                </div>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Product Identity */}
        {data.product_name && (
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
                <div className="text-[10px] font-bold text-zinc-500 uppercase">SUBJECT DETECTED</div>
                <div className="text-sm font-black text-white uppercase">{data.product_name}</div>
            </div>
        )}

        {/* Label Honesty Meter */}
        <div>
            <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">LABEL HONESTY</span>
                <span className="text-xs font-black text-rose-500 uppercase tracking-widest">
                    {deceptionLevel > 7 ? 'MANIPULATIVE' : deceptionLevel > 4 ? 'QUESTIONABLE' : 'TRANSPARENT'}
                </span>
            </div>
            <div className="flex gap-1 h-2">
                {[...Array(4)].map((_, i) => {
                    // Map 1-10 score to 4 bars
                    const isActive = (deceptionLevel / 10) * 4 > i;
                    let colorClass = 'bg-zinc-800';
                    if (isActive) {
                        colorClass = deceptionLevel > 7 ? 'bg-rose-600 shadow-[0_0_10px_#e11d48]' : deceptionLevel > 4 ? 'bg-amber-500' : 'bg-teal-500';
                    }
                    return (
                        <div key={i} className={`flex-1 rounded-full transition-all duration-1000 ${colorClass}`}></div>
                    );
                })}
            </div>
        </div>

        {/* Hidden Additives */}
        <div>
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">HIDDEN COMPOUNDS ({data.hidden_additives.length})</span>
                {data.hidden_additives.length > 0 && (
                    <span className="bg-rose-950/50 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-900/50">Trace Found</span>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {data.hidden_additives.length > 0 ? (
                    data.hidden_additives.map((additive, i) => (
                        <span key={i} className="px-3 py-1.5 bg-rose-900/20 border border-rose-500/20 text-rose-300 text-xs font-bold rounded-lg uppercase tracking-wide">
                            {additive}
                        </span>
                    ))
                ) : (
                    <span className="text-xs text-zinc-500 italic">No hidden additives detected.</span>
                )}
            </div>
        </div>

        {/* Technique Card */}
        <div className="bg-zinc-900 border-l-4 border-rose-500 rounded-r-xl p-4 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
                <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h4 className="text-sm font-black text-rose-500 uppercase mb-1">Technique: {data.deception_technique || "None Detected"}</h4>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                {data.technique_explanation || "Label appears to follow standard naming conventions."}
            </p>
        </div>

        {/* OCR Raw Data Snippet */}
        <div className="bg-[#0f172a] rounded-xl p-4 border border-zinc-800 relative">
            <div className="absolute top-0 right-0 bg-zinc-800 text-zinc-500 text-[8px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                OCR RAW DATA
            </div>
            <div className="mt-2 mb-3">
                {renderHighlightedSnippet()}
            </div>
            <div className="border-t border-white/5 pt-2 mt-2">
                <span className="text-rose-500 font-bold text-xs uppercase mr-1">Verdict:</span>
                <span className="text-white text-xs font-medium">{data.verdict}</span>
            </div>
        </div>

        {/* Bottom Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl relative overflow-hidden">
                <div className="text-[9px] font-bold text-zinc-500 uppercase mb-1">CONFIRMED SUGAR</div>
                <div className="text-2xl font-black text-rose-500">{data.hidden_sugar_grams}<span className="text-sm text-zinc-600 ml-0.5">g</span></div>
                {data.serving_size && <div className="text-[9px] text-zinc-400 font-mono mt-1">Per {data.serving_size}</div>}
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl relative overflow-hidden">
                <div className="text-[9px] font-bold text-zinc-500 uppercase mb-1">SODIUM IMPACT</div>
                <div className={`text-2xl font-black ${
                    data.sodium_impact === 'Critical' ? 'text-amber-500' : 
                    data.sodium_impact === 'High' ? 'text-orange-500' : 
                    'text-teal-500'
                }`}>
                    {data.sodium_impact}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1">{data.sodium_explanation || "Water Retention"}</div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DeceptionDetector;
