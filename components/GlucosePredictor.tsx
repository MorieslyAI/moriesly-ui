
import React, { useMemo } from 'react';

interface GlucosePredictorProps {
  sugar: number;
  gi: number;
}

const GlucosePredictor: React.FC<GlucosePredictorProps> = ({ sugar, gi }) => {
  if (sugar < 5) return null;

  // Generate curve points
  // x = time (minutes 0 to 180)
  // y = energy level (baseline 50)
  const points = useMemo(() => {
    const pts = [];
    const width = 300;
    const height = 100;
    const baseline = 50; // Y middle

    // Simulation logic
    // High GI (>70) = Fast spike, deep crash
    // Low GI (<55) = Slow rise, minimal crash
    const intensity = Math.min(sugar / 20, 1.5); // Cap at 1.5x multiplier based on grams
    const speed = gi / 100; // 0 to 1

    for (let x = 0; x <= width; x += 5) {
      const timePct = x / width; // 0 to 1 (representing 3 hours)
      
      // Math to simulate spike and crash
      // Rise phase (0 to 0.3)
      // Crash phase (0.3 to 0.7)
      // Recovery phase (0.7 to 1.0)
      
      let y = baseline;
      
      // Simple sine-based simulation combined with exponential decay
      // We want a peak around 30-60 mins depending on GI
      const timeInMins = timePct * 180;
      
      // Peak time: High GI = 45mins, Low GI = 70mins
      const peakTime = 90 - (speed * 50); 
      
      if (timeInMins < peakTime * 3) {
          // Rise and Fall logic
          const val = Math.sin((timeInMins / (peakTime * 2.5)) * Math.PI);
          
          if (timeInMins > peakTime) {
             // Crash Logic: Go below baseline if High GI
             const crashDepth = (speed > 0.6) ? 25 * intensity : 5;
             y = baseline - (val * crashDepth) + (val * 40 * intensity * speed); 
             // Correction to force distinct crash curve
             if (y < baseline && timeInMins > peakTime) {
                 y = baseline - (Math.abs(y - baseline) * 1.5);
             }
          } else {
             // Rise Logic
             y = baseline + (val * 40 * intensity);
          }
      } else {
          // Recovery to baseline
          y = baseline;
      }
      
      // Clamp Y to viewbox
      y = Math.max(10, Math.min(90, y));
      pts.push(`${x},${100 - y}`); // Invert Y for SVG
    }
    return pts.join(" ");
  }, [sugar, gi]);

  const isHighGi = gi > 60;
  const isHighSugar = sugar > 20;

  return (
    <div className="mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Energy Forecast</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-500">Next 3 Hours</div>
                </div>
            </div>
            {isHighGi && isHighSugar && (
                <div className="px-2 py-1 bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase rounded border border-rose-500/30 animate-pulse">
                    Heavy Crash Detected
                </div>
            )}
        </div>

        {/* The Graph */}
        <div className="relative h-24 w-full">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-zinc-500 dark:text-zinc-600 font-mono pointer-events-none">
                <div className="border-b border-zinc-100 dark:border-zinc-800/50 w-full h-px"></div>
                <div className="border-b border-dashed border-zinc-200 dark:border-zinc-700 w-full h-px flex items-center">
                    <span className="bg-white dark:bg-zinc-900 px-1 ml-1 text-zinc-500 dark:text-zinc-500">Baseline</span>
                </div>
                <div className="border-b border-zinc-100 dark:border-zinc-800/50 w-full h-px"></div>
            </div>

            {/* Time Labels */}
            <div className="absolute bottom-0 inset-x-0 flex justify-between text-[9px] text-zinc-500 dark:text-zinc-600 font-mono pt-1">
                <span>Now</span>
                <span>+1h</span>
                <span>+2h</span>
                <span>+3h</span>
            </div>

            <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible preserve-3d">
                <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#a855f7" /> {/* Purple Rise */}
                        <stop offset="40%" stopColor="#fbbf24" /> {/* Amber Peak */}
                        <stop offset="100%" stopColor="#ef4444" /> {/* Red Crash */}
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                
                {/* The Curve */}
                <polyline 
                    points={points} 
                    fill="none" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    className="drop-shadow-lg"
                />
                
                {/* Annotations */}
                {isHighSugar && (
                    <>
                        <text x="70" y="20" className="text-[8px] fill-zinc-400 font-bold uppercase" textAnchor="middle">
                            Sugar Rush ⚡
                        </text>
                        {isHighGi && (
                            <text x="220" y="90" className="text-[8px] fill-rose-500 font-bold uppercase" textAnchor="middle">
                                ☠️ The Crash
                            </text>
                        )}
                    </>
                )}
            </svg>
        </div>

        {/* Verdict Text */}
        <div className="mt-3 text-[10px] bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-700/50 leading-relaxed">
            {isHighGi && isHighSugar ? (
                <span>
                    <strong className="text-zinc-900 dark:text-white">Warning:</strong> Expect a short burst of energy followed by brain fog and hunger in ~90 mins. Not ideal for productivity.
                </span>
            ) : isHighSugar ? (
                <span>
                    <strong className="text-zinc-900 dark:text-white">Caution:</strong> Sustained energy, but high calorie load. You might feel sluggish later.
                </span>
            ) : (
                <span>
                    <strong className="text-zinc-900 dark:text-white">Good:</strong> Stable energy release. No major crash predicted.
                </span>
            )}
        </div>
    </div>
  );
};

export default GlucosePredictor;
