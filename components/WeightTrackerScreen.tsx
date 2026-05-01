import React, { useState, useMemo } from 'react';
import { GoalConfig, WeightEntry, HistoryItem } from '../types';
import { getLocalDateString } from '../utils';

interface WeightTrackerScreenProps {
  weightHistory: WeightEntry[];
  goal: GoalConfig;
  sugarHistory: HistoryItem[];
  onUpdateGoal: (newGoal: GoalConfig) => void;
  onAddWeight: (weight: number) => void;
}

const WeightTrackerScreen: React.FC<WeightTrackerScreenProps> = ({ 
  weightHistory, 
  goal, 
  sugarHistory,
  onUpdateGoal, 
  onAddWeight 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<GoalConfig>(goal);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [sugarFilter, setSugarFilter] = useState<'week' | 'month' | 'year'>('week');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, value: string, label: string } | null>(null);

  // --- Date Helpers ---
  const daysBetween = (d1: string, d2: string) => {
      const oneDay = 24 * 60 * 60 * 1000;
      return Math.round(Math.abs((new Date(d1).getTime() - new Date(d2).getTime()) / oneDay));
  };

  const addDays = (dateStr: string, days: number) => {
      const result = new Date(dateStr);
      result.setDate(result.getDate() + days);
      return getLocalDateString(result);
  };

  // --- Goal Projection Logic (The "Line" with Break) ---
  const projectionData = useMemo(() => {
      const start = new Date(goal.startDate).getTime();
      const end = new Date(goal.targetDate).getTime();
      const totalDuration = end - start;
      
      const points = [];
      const steps = 20; // Resolution of the line
      
      let breakStartTimestamp = goal.breakStartDate ? new Date(goal.breakStartDate).getTime() : 0;
      let breakEndTimestamp = goal.breakStartDate && goal.breakDurationDays 
          ? new Date(goal.breakStartDate).setDate(new Date(goal.breakStartDate).getDate() + goal.breakDurationDays) 
          : 0;

      // Calculate weight loss per ms (excluding break time)
      const breakDurationMs = breakEndTimestamp - breakStartTimestamp;
      const activeDietTime = totalDuration - (breakDurationMs > 0 ? breakDurationMs : 0);
      const totalWeightToLose = goal.startWeight - goal.targetWeight;
      const lossPerMs = totalWeightToLose / activeDietTime;

      for (let i = 0; i <= steps; i++) {
          const currentTimestamp = start + (totalDuration * (i / steps));
          let simulatedWeight = goal.startWeight;

          if (goal.breakStartDate && goal.breakDurationDays) {
              if (currentTimestamp < breakStartTimestamp) {
                  // Before break
                  simulatedWeight = goal.startWeight - ((currentTimestamp - start) * lossPerMs);
              } else if (currentTimestamp >= breakStartTimestamp && currentTimestamp <= breakEndTimestamp) {
                  // During break (Plateau)
                  simulatedWeight = goal.startWeight - ((breakStartTimestamp - start) * lossPerMs);
              } else {
                  // After break
                  const timeAfterBreak = currentTimestamp - breakEndTimestamp;
                  const weightLostBeforeBreak = (breakStartTimestamp - start) * lossPerMs;
                  simulatedWeight = goal.startWeight - weightLostBeforeBreak - (timeAfterBreak * lossPerMs);
              }
          } else {
              // Linear if no break
              simulatedWeight = goal.startWeight - ((currentTimestamp - start) * lossPerMs);
          }

          points.push({
              date: new Date(currentTimestamp).toLocaleDateString(),
              weight: Math.max(goal.targetWeight, simulatedWeight), // Don't go below target
              timestamp: currentTimestamp
          });
      }
      return points;
  }, [goal]);

  // --- Sugar Graph Logic ---
  const sugarData = useMemo(() => {
      const now = new Date();
      let filtered = [];
      let days = 7;

      if (sugarFilter === 'week') {
          const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
          filtered = sugarHistory.filter(h => new Date(h.timestamp) >= weekAgo);
          days = 7;
      } else if (sugarFilter === 'month') {
          const monthAgo = new Date(); monthAgo.setMonth(now.getMonth() - 1);
          filtered = sugarHistory.filter(h => new Date(h.timestamp) >= monthAgo);
          days = 30;
      } else {
          const yearAgo = new Date(); yearAgo.setFullYear(now.getFullYear() - 1);
          filtered = sugarHistory.filter(h => new Date(h.timestamp) >= yearAgo);
          days = 365;
      }

      // Group by date
      const grouped: Record<string, number> = {};
      filtered.forEach(item => {
          if (item.action === 'consumed') {
              const d = getLocalDateString(new Date(item.timestamp));
              grouped[d] = (grouped[d] || 0) + item.sugarg;
          }
      });

      // Fill in blanks for the graph
      const chartData = [];
      let totalSugar = 0;
      for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = getLocalDateString(d);
          const val = grouped[dateStr] || 0;
          totalSugar += val;
          chartData.push({ date: dateStr, sugar: val, label: d.getDate().toString() });
      }

      return { chartData, average: Math.round(totalSugar / days), total: totalSugar };
  }, [sugarHistory, sugarFilter]);


  // --- SVG Chart Components ---
  const renderLineChart = (data: any[], color: string, filled: boolean = false) => {
      if (data.length < 2) return null;
      const width = 300; 
      const height = 100;
      const maxW = Math.max(...data.map(d => d.weight)) + 1;
      const minW = Math.min(...data.map(d => d.weight)) - 1;
      const range = maxW - minW || 1;

      const points = data.map((d, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - ((d.weight - minW) / range) * height;
          return `${x},${y}`;
      }).join(' ');

      return (
          <div className="relative w-full h-24 group">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                  <polyline 
                      points={points} 
                      fill="none" 
                      stroke={color} 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="drop-shadow-md"
                  />
                  {/* Hover Areas */}
                  {data.map((d, i) => {
                      const x = (i / (data.length - 1)) * width;
                      const y = height - ((d.weight - minW) / range) * height;
                      return (
                          <circle 
                              key={i} 
                              cx={x} cy={y} r="4" 
                              className="fill-transparent hover:fill-white stroke-transparent hover:stroke-zinc-500 cursor-pointer transition-all"
                              onMouseEnter={(e) => {
                                  // Simplified hover logic, passing relative coordinates roughly
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredPoint({ 
                                      x: rect.left, 
                                      y: rect.top - 40, 
                                      value: `${d.weight.toFixed(1)}kg`, 
                                      label: d.date 
                                  });
                              }}
                              onMouseLeave={() => setHoveredPoint(null)}
                          />
                      )
                  })}
              </svg>
          </div>
      );
  };

  const daysLeft = daysBetween(new Date().toISOString(), goal.targetDate);

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- GOAL OVERVIEW & EDITOR --- */}
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl mb-6 relative overflow-hidden">
          {isEditing ? (
              <div className="space-y-4 relative z-10 animate-in fade-in">
                  <div className="flex justify-between items-center">
                      <h3 className="text-white font-bold uppercase">Mission Config</h3>
                      <button onClick={() => setIsEditing(false)} className="text-zinc-500 text-xs">Cancel</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Event Name</label>
                          <input type="text" value={editForm.eventName} onChange={e => setEditForm({...editForm, eventName: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm" />
                      </div>
                      <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Target Date</label>
                          <input type="date" value={editForm.targetDate} onChange={e => setEditForm({...editForm, targetDate: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm" />
                      </div>
                      <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Target Weight (kg)</label>
                          <input type="number" value={editForm.targetWeight} onChange={e => setEditForm({...editForm, targetWeight: parseFloat(e.target.value)})} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm" />
                      </div>
                      <div>
                          <label className="text-[10px] text-zinc-500 uppercase">Current (kg)</label>
                          <input type="number" value={editForm.currentWeight} onChange={e => setEditForm({...editForm, currentWeight: parseFloat(e.target.value)})} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-sm" />
                      </div>
                  </div>
                  
                  {/* Break Session Config */}
                  <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700">
                      <div className="text-[10px] font-bold text-amber-500 uppercase mb-2">Break / Maintenance Phase</div>
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-[9px] text-zinc-500 uppercase">Start Date</label>
                              <input type="date" value={editForm.breakStartDate || ''} onChange={e => setEditForm({...editForm, breakStartDate: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs" />
                          </div>
                          <div>
                              <label className="text-[9px] text-zinc-500 uppercase">Duration (Days)</label>
                              <input type="number" value={editForm.breakDurationDays || 0} onChange={e => setEditForm({...editForm, breakDurationDays: parseInt(e.target.value)})} className="w-full bg-black border border-zinc-700 rounded-lg p-2 text-white text-xs" />
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={() => { onUpdateGoal(editForm); setIsEditing(false); }}
                    className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl hover:bg-teal-400"
                  >
                      Save Mission Profile
                  </button>
              </div>
          ) : (
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                              Active Event Protocol
                          </div>
                          <h2 className="text-3xl font-black text-white leading-none">{goal.eventName}</h2>
                          <div className="text-xs text-zinc-400 mt-1">Target: {new Date(goal.targetDate).toLocaleDateString()} ({daysLeft} days left)</div>
                      </div>
                      <button onClick={() => setIsEditing(true)} className="bg-zinc-800 p-2 rounded-lg text-zinc-400 hover:text-white">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                  </div>

                  {/* Goal Trajectory Chart */}
                  <div className="bg-black/30 rounded-xl p-4 border border-zinc-800/50 mb-4">
                      <div className="flex justify-between text-[9px] text-zinc-500 font-mono mb-2 uppercase">
                          <span>Start: {goal.startWeight}kg</span>
                          {goal.breakStartDate && <span className="text-amber-500">Break Session Active</span>}
                          <span>Target: {goal.targetWeight}kg</span>
                      </div>
                      {renderLineChart(projectionData, '#14b8a6')} {/* Teal Line */}
                  </div>

                  <div className="flex justify-between items-end">
                      <div>
                          <div className="text-4xl font-black text-white">{goal.currentWeight}<span className="text-lg text-zinc-500">kg</span></div>
                          <div className="text-[10px] text-zinc-500 uppercase">Current Load</div>
                      </div>
                      <div className="text-right">
                          <div className="text-xl font-bold text-teal-500">{(goal.currentWeight - goal.targetWeight).toFixed(1)}kg</div>
                          <div className="text-[10px] text-zinc-500 uppercase">To Lose</div>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* --- WEIGHT TRACKER HISTORY --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase text-zinc-500">Weight Log</h3>
              <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="kg"
                    value={newWeightInput} 
                    onChange={(e) => setNewWeightInput(e.target.value)} 
                    className="w-16 bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg text-center text-sm font-bold dark:text-white"
                  />
                  <button 
                    onClick={() => {
                        if(newWeightInput) {
                            onAddWeight(parseFloat(newWeightInput));
                            setNewWeightInput('');
                        }
                    }}
                    className="bg-zinc-900 dark:bg-white text-white dark:text-black px-3 py-1 rounded-lg text-xs font-bold"
                  >
                      + Log
                  </button>
              </div>
          </div>
          
          <div className="h-40 w-full bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-4 border border-dashed border-zinc-200 dark:border-zinc-800 relative flex items-end">
              {weightHistory.length > 1 ? (
                  renderLineChart(weightHistory.map(w => ({...w, timestamp: new Date(w.date).getTime()})), '#f59e0b') // Amber Line
              ) : (
                  <div className="w-full text-center text-xs text-zinc-400">Need more data to generate curve.</div>
              )}
          </div>
      </div>

      {/* --- SUGAR CORRELATION GRAPH --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-start mb-6">
              <div>
                  <h3 className="text-sm font-bold uppercase text-zinc-500">Sugar Correlation</h3>
                  <div className="text-[10px] text-zinc-400 mt-1">Impact Analysis</div>
              </div>
              
              <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-1">
                  {(['week', 'month', 'year'] as const).map(t => (
                      <button 
                        key={t}
                        onClick={() => setSugarFilter(t)}
                        className={`px-3 py-1 rounded-md text-[9px] uppercase font-bold transition-all ${sugarFilter === t ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}
                      >
                          {t}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex items-end justify-between gap-1 h-32 w-full mb-4">
              {sugarData.chartData.map((d, i) => {
                  // Normalize height (max 100px)
                  const maxVal = Math.max(50, ...sugarData.chartData.map(x => x.sugar));
                  const h = Math.max(4, (d.sugar / maxVal) * 100);
                  
                  return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                          <div 
                            className={`w-full rounded-t-sm transition-all duration-500 ${d.sugar > 30 ? 'bg-rose-500' : 'bg-teal-500'} opacity-60 group-hover:opacity-100`}
                            style={{ height: `${h}%` }}
                          ></div>
                          <span className="text-[8px] text-zinc-400">{d.label}</span>
                      </div>
                  );
              })}
          </div>

          <div className="flex gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Total Intake</div>
                  <div className="text-xl font-black text-zinc-900 dark:text-white">{sugarData.total}g</div>
              </div>
              <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Daily Avg</div>
                  <div className={`text-xl font-black ${sugarData.average > 30 ? 'text-rose-500' : 'text-teal-500'}`}>
                      {sugarData.average}g
                  </div>
              </div>
          </div>
      </div>

      {/* Floating Tooltip */}
      {hoveredPoint && (
          <div 
            className="fixed bg-zinc-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-50 border border-zinc-700 shadow-lg"
            style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
          >
              <div className="font-bold">{hoveredPoint.value}</div>
              <div className="text-[9px] text-zinc-400">{hoveredPoint.label}</div>
          </div>
      )}

    </div>
  );
};

export default WeightTrackerScreen;