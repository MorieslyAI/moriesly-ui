
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface DeathWaiverProps {
  itemName: string;
  sugarGrams: number;
  userProfile: UserProfile;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeathWaiver: React.FC<DeathWaiverProps> = ({ itemName, sugarGrams, userProfile, onConfirm, onCancel }) => {
  const [progress, setProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  // Long press logic
  useEffect(() => {
    let interval: number;
    if (isScanning && !scanComplete) {
      interval = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setScanComplete(true);
            return 100;
          }
          return prev + 2; // Speed of scan (approx 1.5s total)
        });
      }, 30);
    } else if (!scanComplete) {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanComplete]);

  // Auto confirm after scan complete animation
  useEffect(() => {
    if (scanComplete) {
      const timeout = setTimeout(() => {
        onConfirm();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [scanComplete, onConfirm]);

  const calories = sugarGrams * 4;
  const insulinSpike = Math.min(sugarGrams * 2.5, 100).toFixed(0);
  const fatStorageHours = (sugarGrams / 10).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto p-4 animate-in fade-in duration-300">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #3f3f46 10px, #3f3f46 11px)' }}></div>

      <div className="min-h-full flex items-center justify-center py-8 relative z-10">
        <div className="relative w-full max-w-md bg-white text-black font-mono p-6 rounded-sm shadow-2xl border-t-8 border-rose-600 rotate-1">
        
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-center mb-2">
             <div className="border-2 border-black rounded-full p-2">
                <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Liability Release</h2>
          <p className="text-xs font-bold uppercase mt-1">Form: META-666-DMG</p>
        </div>

        {/* The Contract */}
        <div className="text-[10px] md:text-xs leading-relaxed space-y-4 mb-8">
          <p>
            I, <span className="font-bold underline uppercase">{userProfile.name}</span>, hereby acknowledge that I am about to voluntarily consume <span className="font-bold underline uppercase text-rose-600">{itemName}</span> containing <span className="font-bold bg-black text-white px-1">{sugarGrams}g of Sugar</span>.
          </p>
          
          <div className="bg-zinc-100 p-3 border border-zinc-300 space-y-2">
             <div className="font-bold uppercase underline">By signing this, I accept:</div>
             <ul className="list-disc pl-4 space-y-1">
                 <li>An estimated <strong>{insulinSpike}% spike</strong> in blood insulin levels.</li>
                 <li>Immediate cessation of fat-burning for approx <strong>{fatStorageHours} hours</strong>.</li>
                 <li>Adding <strong>{calories} empty calories</strong> to my visceral storage.</li>
                 <li>Potential degradation of collagen (skin aging).</li>
             </ul>
          </div>

          <p className="italic">
            I absolve "Moriesly AI" of all responsibility for the resulting lethargy, mood swings, and long-term metabolic damage. This act is committed with full sound mind and intentional disregard for my biological limits.
          </p>
        </div>

        {/* Signature Area */}
        <div className="flex flex-col items-center gap-4">
           {scanComplete ? (
               <div className="text-rose-600 font-black text-xl border-4 border-rose-600 px-4 py-2 uppercase rotate-[-10deg] opacity-80 animate-pulse">
                   ACCEPTED
               </div>
           ) : (
               <>
                <div 
                    className="relative w-20 h-24 border-2 border-dashed border-zinc-400 rounded-xl flex items-center justify-center cursor-pointer select-none transition-all active:scale-95"
                    onMouseDown={() => setIsScanning(true)}
                    onMouseUp={() => setIsScanning(false)}
                    onMouseLeave={() => setIsScanning(false)}
                    onTouchStart={(e) => { e.preventDefault(); setIsScanning(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); setIsScanning(false); }}
                    onTouchCancel={(e) => { e.preventDefault(); setIsScanning(false); }}
                >
                    {/* Fingerprint Icon */}
                    <svg className={`w-12 h-12 transition-colors duration-200 ${isScanning ? 'text-rose-600' : 'text-zinc-300'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                    </svg>

                    {/* Progress Fill */}
                    <div className="absolute inset-0 bg-rose-500/20 origin-bottom transition-all duration-75 ease-linear pointer-events-none" style={{ height: `${progress}%` }}></div>
                </div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase text-center animate-pulse">
                    Hold 3s to Sign & Accept Damage
                </div>
               </>
           )}
        </div>

        {/* Cancel Button */}
        {!scanComplete && (
            <button 
                onClick={onCancel}
                className="absolute top-2 right-2 text-zinc-400 hover:text-black p-2"
            >
                CANCEL
            </button>
        )}
      </div>
    </div>
  </div>
);
};

export default DeathWaiver;
