
import React from 'react';

interface LegalReminderProps {
  onAccept: () => void;
}

const LegalReminder: React.FC<LegalReminderProps> = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 overflow-y-auto p-6 font-sans">
        {/* Background Decor */}
        <div className="fixed inset-0 pointer-events-none opacity-20" style={{backgroundImage: 'radial-gradient(circle at 50% 50%, #14b8a6 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>

        <div className="py-12 relative z-10">
            <div className="w-full max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                {/* Header Highlight */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-zinc-700 shadow-inner">
                        <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">System Compliance</h2>
                    <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">Protocol Agreement Required</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                        <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                            Privacy Policy
                        </h3>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                            We process your bio-data and images locally or via secure cloud encryption solely for metabolic analysis. No personal data is sold to third parties.
                        </p>
                    </div>

                    <div className="bg-black/40 p-4 rounded-xl border border-zinc-800">
                        <h3 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                            Terms of Service
                        </h3>
                        <p className="text-zinc-400 text-xs leading-relaxed">
                            Moriesly AI is an advisory tool for entertainment and wellness tracking. It does not replace professional medical advice. By proceeding, you accept full responsibility for your dietary choices.
                        </p>
                    </div>
                </div>

                <button
                    onClick={onAccept}
                    className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black uppercase rounded-xl shadow-lg transition-all active:scale-95 text-xs tracking-widest flex items-center justify-center gap-2 group"
                >
                    <span>I Accept & Proceed</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>

                <div className="mt-4 text-center">
                    <p className="text-[10px] text-zinc-600">
                        Accessing Moriesly AI implies consent to all legal protocols.
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LegalReminder;
