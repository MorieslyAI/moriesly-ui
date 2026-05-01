
import React from 'react';
import { ReceiptAnalysis as ReceiptData } from '../types';

interface ReceiptAnalysisProps {
  data: ReceiptData;
  onClose: () => void;
}

const ReceiptAnalysis: React.FC<ReceiptAnalysisProps> = ({ data, onClose }) => {
  const isBad = data.sugarPercentage > 30;
  const currencySymbol = data.currency || "$";

  // Helper to format currency correctly (handle large IDR numbers vs small USD)
  const formatMoney = (amount: number) => {
      // Check if likely IDR or similar high-value currency (no decimals needed usually)
      if (currencySymbol.toLowerCase().includes('rp') || currencySymbol.toLowerCase().includes('idr') || currencySymbol.toLowerCase().includes('¥')) {
          return amount.toLocaleString('id-ID'); // Standard format for IDR
      }
      return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Background Money Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)', backgroundSize: '15px 15px' }}>
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-900/30 rounded-lg text-emerald-500 border border-emerald-500/20">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">Financial Audit</h3>
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Receipt Forensics</div>
                </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Verdict Banner */}
        <div className={`p-4 rounded-xl border mb-6 text-center ${isBad ? 'bg-rose-950/30 border-rose-500/50' : 'bg-emerald-950/30 border-emerald-500/50'}`}>
            <h4 className={`text-lg font-black uppercase mb-1 ${isBad ? 'text-rose-500' : 'text-emerald-500'}`}>
                {isBad ? 'FISCAL IRRESPONSIBILITY' : 'SMART ALLOCATION'}
            </h4>
            <p className="text-sm text-zinc-300 italic">"{data.financialVerdict}"</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-black/30 p-3 rounded-xl border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Total Bill</div>
                <div className="text-xl font-mono font-bold text-white truncate">
                    <span className="text-sm mr-1 text-zinc-400">{currencySymbol}</span>
                    {formatMoney(data.totalSpent)}
                </div>
            </div>
            <div className="bg-black/30 p-3 rounded-xl border border-zinc-800 text-center relative overflow-hidden">
                <div className={`absolute inset-0 opacity-10 ${isBad ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Wasted on Sugar</div>
                <div className={`text-xl font-mono font-bold truncate ${isBad ? 'text-rose-500' : 'text-emerald-500'}`}>
                    <span className="text-sm mr-1 opacity-70">{currencySymbol}</span>
                    {formatMoney(data.wastedOnSugar)}
                </div>
                <div className="text-[9px] text-zinc-400 mt-1">{data.sugarPercentage.toFixed(0)}% of Bill</div>
            </div>
        </div>

        {/* Item List */}
        <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800 max-h-60 overflow-y-auto">
            <div className="text-[10px] font-bold text-zinc-500 uppercase mb-3 flex justify-between">
                <span>Line Items</span>
                <span>Audit</span>
            </div>
            <div className="space-y-2">
                {data.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 last:border-0">
                        <div className="flex-1 pr-2">
                            <div className={`font-bold truncate ${item.isSugary ? 'text-rose-400' : 'text-zinc-300'}`}>
                                {item.name}
                            </div>
                            {item.isSugary && <div className="text-[9px] text-rose-600 font-mono">DETECTED: ~{item.sugarGrams}g Sugar</div>}
                        </div>
                        <div className="font-mono text-zinc-500 text-xs whitespace-nowrap">
                            {currencySymbol} {formatMoney(item.price)}
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

export default ReceiptAnalysis;
