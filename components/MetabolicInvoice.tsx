
import React from 'react';

interface MetabolicInvoiceProps {
  focusTax: number;
  agingGrade: 'Low' | 'Medium' | 'High' | 'Severe';
  sleepPenalty: 'None' | 'Mild' | 'Disruptive';
}

const MetabolicInvoice: React.FC<MetabolicInvoiceProps> = ({ focusTax, agingGrade, sleepPenalty }) => {
  const isSevere = agingGrade === 'High' || agingGrade === 'Severe' || focusTax > 45;

  return (
    <div className="mt-4 animate-in slide-in-from-top-4 duration-700">
      <div className="relative bg-white dark:bg-zinc-900 text-zinc-900 font-mono p-5 rounded-sm shadow-xl border-t-8 border-zinc-200 mx-2 transform rotate-1">
        
        {/* Receipt Cut Pattern Top */}
        <div className="absolute -top-2 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgdmlld0JveD0iMCAwIDEwIDEwIj48cGF0aCBkPSJNMCAxMEw1IDBMMTAgMTBIMFoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-repeat-x"></div>

        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-zinc-300 pb-3 mb-3">
            <div className="text-xl font-black uppercase tracking-widest">TRUE COST</div>
            <div className="text-[10px] text-zinc-500">METABOLIC TRANSACTION RECEIPT</div>
            <div className="text-[10px] text-zinc-400">{new Date().toLocaleString()}</div>
        </div>

        {/* Line Items */}
        <div className="space-y-3 text-sm">
            
            {/* Focus Tax */}
            <div className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🧠</span>
                    <div>
                        <div className="font-bold uppercase text-xs">Focus Tax</div>
                        <div className="text-[9px] text-zinc-500">Brain Fog / Lethargy</div>
                    </div>
                </div>
                <div className={`font-bold ${focusTax > 30 ? 'text-rose-600' : 'text-zinc-700'}`}>
                   -{focusTax} <span className="text-[10px]">MINS</span>
                </div>
            </div>

            {/* Aging */}
            <div className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🧬</span>
                    <div>
                        <div className="font-bold uppercase text-xs">Inflammation</div>
                        <div className="text-[9px] text-zinc-500">Skin & Cellular Aging</div>
                    </div>
                </div>
                <div className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase
                    ${agingGrade === 'Severe' ? 'bg-rose-100 text-rose-700' : 
                      agingGrade === 'High' ? 'bg-orange-100 text-orange-700' : 
                      'bg-zinc-100 text-zinc-600'}`}>
                   {agingGrade}
                </div>
            </div>

            {/* Sleep */}
            <div className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💤</span>
                    <div>
                        <div className="font-bold uppercase text-xs">Sleep Quality</div>
                        <div className="text-[9px] text-zinc-500">Recovery Impact</div>
                    </div>
                </div>
                <div className={`font-bold text-xs uppercase ${sleepPenalty === 'Disruptive' ? 'text-rose-600' : 'text-zinc-600'}`}>
                   {sleepPenalty}
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t-2 border-dashed border-zinc-300 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Total Body Impact</div>
            {isSevere ? (
                <div className="text-rose-600 font-black text-lg tracking-tight animate-pulse">
                    REJECT RECOMMENDED
                </div>
            ) : (
                <div className="text-zinc-800 font-bold text-sm">
                    PROCEED WITH CAUTION
                </div>
            )}
            <div className="mt-2 text-[9px] text-zinc-400 italic">
                *Non-refundable. Paid with your future energy.
            </div>
        </div>

        {/* Receipt Cut Pattern Bottom */}
        <div className="absolute -bottom-2 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgdmlld0JveD0iMCAwIDEwIDEwIj48cGF0aCBkPSJNMCAwTDUgMTBMMTAgMEgwWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')] bg-repeat-x"></div>

      </div>
    </div>
  );
};

export default MetabolicInvoice;
