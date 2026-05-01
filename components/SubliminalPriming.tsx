import React, { useState, useEffect } from 'react';

const NEGATIVE_PRIMES = [
    "INFLAMMATION", "INSULIN SPIKE", "VISCERAL FAT", "BRAIN FOG", 
    "COLLAGEN DAMAGE", "LETHARGY", "ADDICTION", "SUGAR CRASH", 
    "DECAY", "AGE FASTER", "EMPTY CALORIES", "TOXIC"
];

const SubliminalPriming: React.FC = () => {
    const [word, setWord] = useState("");
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: '50%', left: '50%' });

    useEffect(() => {
        // Flash a word every 150ms-400ms randomly
        const interval = setInterval(() => {
            if (Math.random() > 0.6) { // 40% chance to flash
                const randomWord = NEGATIVE_PRIMES[Math.floor(Math.random() * NEGATIVE_PRIMES.length)];
                
                // Random position slightly offset from center
                const top = 30 + Math.random() * 40; // 30% to 70%
                const left = 20 + Math.random() * 60; // 20% to 80%
                
                setWord(randomWord);
                setPosition({ top: `${top}%`, left: `${left}%` });
                setVisible(true);

                // Hide quickly (Subliminal effect: < 100ms is best, but let's do 150ms for visibility)
                setTimeout(() => setVisible(false), 150);
            }
        }, 300);

        return () => clearInterval(interval);
    }, []);

    if (!visible) return null;

    return (
        <div 
            className="absolute z-50 pointer-events-none text-red-600/20 dark:text-red-500/20 font-black uppercase tracking-widest text-4xl blur-[1px] select-none transform -translate-x-1/2 -translate-y-1/2 rotate-[-5deg]"
            style={{ top: position.top, left: position.left }}
        >
            {word}
        </div>
    );
};

export default SubliminalPriming;