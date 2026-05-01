import React, { useMemo, useState } from 'react';
import { HistoryItem, ConsumptionTrigger } from '../types';

interface PsychoProfileProps {
  history: HistoryItem[];
  limit: number;
}

const PsychoProfile: React.FC<PsychoProfileProps> = ({ history, limit }) => {
  const [profileMode, setProfileMode] = useState<'weakness' | 'taste'>('weakness');
  const [showDetails, setShowDetails] = useState(false);

  // 1. Analyze Triggers (Weakness)
  const triggerStats = useMemo(() => {
      const consumed = history.filter(h => h.action === 'consumed' && h.trigger);
      const total = consumed.length;
      
      // Default counts if no data
      const counts: Record<string, number> = { Hunger: 0, Boredom: 0, Stress: 0, Social: 0, Fatigue: 0, Habit: 0 };
      
      if (total > 0) {
          consumed.forEach(h => {
              if (h.trigger) counts[h.trigger] = (counts[h.trigger] || 0) + 1;
          });
      }

      // Find primary weakness
      let maxTrigger = 'None';
      let maxCount = 0;
      Object.entries(counts).forEach(([k, v]) => {
          if (v > maxCount) {
              maxCount = v;
              maxTrigger = k;
          }
      });

      return { counts, total: total || 1, maxTrigger }; // Prevent div by zero
  }, [history]);

  // 2. Analyze Taste Profile (New Request)
  const tasteStats = useMemo(() => {
      // Sweet: Based on actual sugar consumption vs limit
      // If average daily sugar > limit, Sweet score is high
      const consumed = history.filter(h => h.action === 'consumed');
      const totalSugar = consumed.reduce((acc, h) => acc + h.sugarg, 0);
      const days = Math.max(1, new Set(consumed.map(h => new Date(h.timestamp).toDateString())).size);
      const avgDailySugar = totalSugar / days;
      
      const sweetScore = Math.min(100, Math.round((avgDailySugar / limit) * 80)); // 80% if hitting limit exactly
      
      // Mock/Heuristic for others (since we don't have full nutritional data yet)
      // We'll base it slightly on item types if available, otherwise randomize for the UI demo
      const foodCount = consumed.filter(h => h.itemType === 'food').length;
      const drinkCount = consumed.filter(h => h.itemType === 'drink').length;
      
      const saltyScore = Math.min(90, 30 + (foodCount * 5)); 
      const bitterScore = Math.min(60, 10 + (drinkCount * 2)); // Coffee/Tea?
      const cholesterolScore = Math.min(100, 20 + (foodCount * 8)); // Fast food?

      return {
          Sweet: sweetScore || 10,
          Salty: saltyScore,
          Bitter: bitterScore,
          Cholesterol: cholesterolScore
      };
  }, [history, limit]);

  // 3. Future Projection (The "Time Machine")
  const projection = useMemo(() => {
      const consumed = history.filter(h => h.action === 'consumed');
      if (consumed.length === 0) return null;

      // Calculate daily average based on history duration
      const oldest = new Date(Math.min(...consumed.map(h => new Date(h.timestamp).getTime())));
      const now = new Date();
      const diffDays = Math.max(1, (now.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));
      
      const totalSugar = consumed.reduce((acc, c) => acc + c.sugarg, 0);
      const dailyAvg = totalSugar / diffDays;
      
      const yearProjectionKg = (dailyAvg * 365) / 1000;
      
      // Fun comparisons
      let comparison = "A small dog";
      if (yearProjectionKg > 100) comparison = "A Baby Elephant";
      else if (yearProjectionKg > 50) comparison = "A Large Sack of Cement";
      else if (yearProjectionKg > 30) comparison = "A Car Tire";
      else if (yearProjectionKg > 10) comparison = "A Bowling Ball";
      else comparison = "A Domestic Cat";

      return { dailyAvg, yearProjectionKg, comparison };
  }, [history]);

  // Radar Chart Helper
  const renderRadar = () => {
      const isWeakness = profileMode === 'weakness';
      const keys = isWeakness 
        ? ['Hunger', 'Boredom', 'Stress', 'Social', 'Fatigue', 'Habit']
        : ['Sweet', 'Salty', 'Bitter', 'Cholesterol'];
      
      const data = isWeakness ? triggerStats.counts : tasteStats;
      const total = isWeakness ? triggerStats.total : 100; // Taste scores are 0-100
      
      const radius = 60;
      const center = 80;
      
      // Calculate points
      const points = keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
          const val = (data as any)[key] || 0;
          const normalizedVal = isWeakness ? val / total : val / 100;
          const r = normalizedVal * radius;
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          return `${x},${y}`;
      }).join(' ');

      // Calculate label positions (outer rim)
      const labels = keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
          const r = radius + 18;
          const x = center + Math.cos(angle) * r;
          const y = center + Math.sin(angle) * r;
          const val = (data as any)[key] || 0;
          const pct = isWeakness ? Math.round((val/total)*100) : val;
          return { x, y, label: key, val: pct };
      });

      return (
          <div className="relative w-full aspect-square max-w-[240px] mx-auto mt-4">
              <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
                  {/* Grid */}
                  {[0.25, 0.5, 0.75, 1].map(scale => (
                      <polygon 
                        key={scale}
                        points={keys.map((_, i) => {
                            const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
                            const r = radius * scale;
                            return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
                        }).join(' ')}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        className="opacity-30 text-zinc-300 dark:text-zinc-700"
                      />
                  ))}
                  
                  {/* Data Blob */}
                  <polygon 
                      points={points} 
                      fill={isWeakness ? "rgba(20, 184, 166, 0.2)" : "rgba(244, 63, 94, 0.2)"}
                      stroke={isWeakness ? "#14b8a6" : "#f43f5e"}
                      strokeWidth="2" 
                      className="drop-shadow-lg transition-all duration-500 ease-out"
                  />
                  
                  {/* Labels */}
                  {labels.map((l, i) => (
                      <g key={i}>
                          <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-zinc-500 dark:fill-zinc-400 font-bold uppercase tracking-wider">
                              {l.label}
                          </text>
                          <text x={l.x} y={l.y + 8} textAnchor="middle" dominantBaseline="middle" className={`text-[7px] font-bold ${isWeakness ? 'fill-teal-600 dark:fill-teal-500' : 'fill-rose-600 dark:fill-rose-500'}`}>
                              {l.val}%
                          </text>
                      </g>
                  ))}
              </svg>
          </div>
      );
  };

  if (!projection) return null;

  // --- COMPACT VIEW (Default) ---
  if (!showDetails) {
      return (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Mini Projection Card */}
              <button 
                  onClick={() => setShowDetails(true)}
                  className="bg-white rounded-[2rem] p-5 border border-zinc-100 shadow-sm hover:shadow-md transition-all flex flex-col items-start justify-between h-28 relative overflow-hidden group"
              >
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-16 h-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest mb-1">1-Year Gain</div>
                  <div className="relative z-10">
                      <div className="text-3xl font-black text-zinc-900 tracking-tighter leading-none mb-1">
                        +{projection.yearProjectionKg.toFixed(1)}<span className="text-sm text-zinc-400 font-bold ml-0.5">kg</span>
                      </div>
                      <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full inline-block truncate max-w-full">
                        {projection.comparison}
                      </div>
                  </div>
              </button>

              {/* Mini Weakness Card */}
              <button 
                  onClick={() => setShowDetails(true)}
                  className="bg-white rounded-[2rem] p-5 border border-zinc-100 shadow-sm hover:shadow-md transition-all flex flex-col items-start justify-between h-28 relative overflow-hidden group"
              >
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-16 h-16 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <div className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest mb-1">Weakness</div>
                  <div className="relative z-10">
                      <div className="text-2xl font-black text-teal-600 tracking-tight leading-none mb-1">
                        {triggerStats.maxTrigger}
                      </div>
                      <div className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        Click for Analysis <span className="text-teal-500">→</span>
                      </div>
                  </div>
              </button>

          </div>
      );
  }

  // --- DETAILED VIEW (Modal Overlay) ---
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowDetails(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            
            {/* Close Button */}
            <button 
                onClick={() => setShowDetails(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-zinc-100 dark:bg-black/50 hover:bg-zinc-200 dark:hover:bg-black/80 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border border-zinc-200 dark:border-white/10"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
                
                {/* LEFT SIDE: Future Projection */}
                <div className="p-8 relative overflow-hidden flex flex-col justify-between min-h-[350px] bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-black/50">
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 6px)' }}></div>

                    <div className="relative z-10">
                        <div className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-2">Future Projection</div>
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">The 1-Year Accumulation</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">If current daily average ({Math.round(projection.dailyAvg)}g) continues...</p>

                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter mb-3 drop-shadow-lg">
                                {projection.yearProjectionKg.toFixed(1)} <span className="text-2xl text-zinc-400 dark:text-zinc-500">kg</span>
                            </div>
                            <div className="bg-rose-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide animate-pulse">
                                Equivalent To
                            </div>
                            <div className="mt-4 text-xl font-bold text-zinc-800 dark:text-zinc-300 text-center">
                                {projection.comparison}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
                        <div className="text-[10px] text-zinc-500 uppercase font-mono">
                            System Recommendation: Reduce Daily Avg by {Math.round(projection.dailyAvg * 0.2)}g.
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: Psych-Ops Profile */}
                <div className="p-8 relative flex flex-col min-h-[350px] bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="absolute top-0 right-0 p-4 opacity-5 text-zinc-900 dark:text-white pointer-events-none">
                        <svg className="w-32 h-32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">Psych-Ops Profile</div>
                            
                            {/* Tab Switcher */}
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                                <button 
                                    onClick={() => setProfileMode('weakness')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${profileMode === 'weakness' ? 'bg-teal-500 text-white dark:text-black shadow-lg' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
                                >
                                    Weakness
                                </button>
                                <button 
                                    onClick={() => setProfileMode('taste')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${profileMode === 'taste' ? 'bg-rose-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
                                >
                                    Taste
                                </button>
                            </div>
                        </div>

                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                            {profileMode === 'weakness' ? (
                                <>Primary Weakness: <span className="text-teal-600 dark:text-teal-500">{triggerStats.maxTrigger}</span></>
                            ) : (
                                <>Dominant Craving: <span className="text-rose-600 dark:text-rose-500">Sweet</span></>
                            )}
                        </h3>
                        
                        <div className="flex-1 flex items-center justify-center">
                            {renderRadar()}
                        </div>

                        <div className="mt-4 bg-zinc-100/50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 italic text-center">
                            {profileMode === 'weakness' 
                                ? `"${triggerStats.maxTrigger === 'Hunger' ? "Good news: You eat for fuel." : `Alert: You use sugar as a drug for ${triggerStats.maxTrigger}.`}"`
                                : `"Analysis indicates a high affinity for ${tasteStats.Sweet > 50 ? 'Sweet' : 'Savory'} profiles."`
                            }
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default PsychoProfile;