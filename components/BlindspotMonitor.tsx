import React, { useState, useEffect } from 'react';

const INTEL_FACTS = [
    {
        title: "Condiment Amnesia",
        text: "Ketchup is 25% sugar. A single tablespoon contains more sugar than a chocolate chip cookie.",
        risk: "High"
    },
    {
        title: "Liquid Stealth",
        text: "Your brain doesn't register liquid calories. That 'healthy' smoothie often has more fructose than a cola.",
        risk: "Critical"
    },
    {
        title: "The 'Healthy' Halo",
        text: "Organic Cane Sugar is chemically identical to table sugar. Your liver can't tell the difference.",
        risk: "Moderate"
    },
    {
        title: "Stress Eating",
        text: "Cortisol spikes crave quick energy. You aren't hungry; you are stressed. Drink water first.",
        risk: "High"
    },
    {
        title: "Yogurt Deception",
        text: "Low-fat yogurt replaces fat with sugar for taste. 'Fruit on the bottom' is essentially jam.",
        risk: "Moderate"
    },
    {
        title: "Bread Bombs",
        text: "Many commercial breads add sugar for browning and shelf life. Check the label for 'Added Sugars'.",
        risk: "Low"
    },
    {
        title: "Barbecue Trap",
        text: "BBQ sauce is often 33% sugar by weight. You are essentially glazing your meat in candy syrup.",
        risk: "High"
    }
];

const BlindspotMonitor: React.FC = () => {
    const [factIndex, setFactIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Randomize start fact on mount
        setFactIndex(Math.floor(Math.random() * INTEL_FACTS.length));
    }, []);

    const nextFact = () => {
        setIsVisible(false);
        setTimeout(() => {
            setFactIndex((prev) => (prev + 1) % INTEL_FACTS.length);
            setIsVisible(true);
        }, 300);
    };

    const fact = INTEL_FACTS[factIndex];

    return (
        <div className="bg-zinc-100 dark:bg-zinc-900 border-l-4 border-amber-500 rounded-r-xl p-4 shadow-sm relative overflow-hidden group">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" 
                 style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b 0, #f59e0b 1px, transparent 1px, transparent 10px)' }}>
            </div>

            <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <div className="bg-amber-500 text-black px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                        Blindspot Detected
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">Intel #{factIndex + 1}</span>
                </div>
                <button onClick={nextFact} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </div>

            <div className={`transition-all duration-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wide mb-1">
                    {fact.title}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {fact.text}
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Unconscious Risk Level:</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 rounded ${
                        fact.risk === 'Critical' ? 'bg-rose-500 text-white' : 
                        fact.risk === 'High' ? 'bg-orange-500 text-white' : 
                        'bg-zinc-300 text-zinc-800'
                    }`}>
                        {fact.risk}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BlindspotMonitor;
