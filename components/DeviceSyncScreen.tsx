
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HistoryItem, LedgerState, DietPlan, OperationPlan } from '../types';

interface DeviceSyncScreenProps {
    history?: HistoryItem[];
    ledger?: LedgerState;
    dietPlan?: DietPlan | null;
    trainingPlan?: OperationPlan | null;
    onToggleFullScreen?: (full: boolean) => void;
    onBackToHome?: () => void;
}

// --- SHARED UTILS ---
const DateSelector: React.FC<{ selectedDate: Date, onChange: (d: Date) => void }> = ({ selectedDate, onChange }) => {
    const dates = [];
    for (let i = -2; i <= 2; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        dates.push(d);
    }

    return (
        <div className="flex items-center justify-between bg-black/40 backdrop-blur-md p-1 rounded-2xl mb-4 border border-zinc-800">
            {dates.map((date, i) => {
                const isSelected = date.toDateString() === selectedDate.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                    <button 
                        key={i}
                        onClick={() => onChange(date)}
                        className={`flex flex-col items-center justify-center w-12 h-14 md:w-16 md:h-16 rounded-xl transition-all duration-300 relative overflow-hidden ${
                            isSelected 
                            ? 'bg-zinc-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-zinc-600' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                        }`}
                    >
                        <span className="text-[9px] font-bold uppercase tracking-wider">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className={`text-sm font-black ${isToday ? 'text-teal-500' : ''}`}>{date.getDate()}</span>
                        {isToday && <div className="w-1 h-1 bg-teal-500 rounded-full mt-1"></div>}
                        {isSelected && <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>}
                    </button>
                );
            })}
        </div>
    );
};

// --- HELPER: NAV TAB COMPONENT ---
const NavTab: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color?: string }> = ({ active, onClick, icon, label, color = "bg-white text-black" }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 active:scale-95 group ${
            active 
            ? `${color} shadow-lg scale-105` 
            : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
        }`}
    >
        <div className={`mb-1 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </div>
        <span className="text-[9px] font-black uppercase tracking-wide leading-none">{label}</span>
    </button>
);

// --- BRACELET COMPONENTS (Whoop/Oura Style) ---

const RecoveryRing: React.FC<{ score: number, label: string }> = ({ score, label }) => {
    const radius = 55;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    let color = 'stroke-emerald-500';
    let glow = 'drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    if (score < 40) { color = 'stroke-rose-600'; glow = 'drop-shadow-[0_0_10px_rgba(225,29,72,0.5)]'; }
    else if (score < 70) { color = 'stroke-amber-500'; glow = 'drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]'; }

    return (
        <div className="relative flex items-center justify-center w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r={radius} className="stroke-zinc-800 fill-none" strokeWidth="6" />
                <circle 
                    cx="50%" cy="50%" r={radius} 
                    className={`fill-none transition-all duration-1000 ease-out ${color} ${glow}`} 
                    strokeWidth="6" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={offset} 
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-black text-white tracking-tighter`}>{score}</span>
                <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest mt-1">{label}</span>
            </div>
        </div>
    );
};

const BodyBatteryLiquid: React.FC<{ level: number }> = ({ level }) => (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between relative overflow-hidden h-40 group">
        <div className="relative z-10 flex justify-between items-start">
            <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Body Battery</div>
            <div className="text-xl font-black text-white">{level}<span className="text-xs text-zinc-500">%</span></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 top-0 overflow-hidden rounded-3xl">
            <div 
                className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out opacity-20 ${level > 50 ? 'bg-teal-500' : 'bg-rose-500'}`} 
                style={{ height: `${level}%` }}
            >
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-white/20 to-transparent"></div>
            </div>
        </div>
        <div className="relative z-10 mt-auto">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[9px] text-zinc-400 font-mono">DRAIN: -24%</span>
                <span className="text-[9px] text-zinc-400 font-mono">CHARGE: +5%</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full ${level > 50 ? 'bg-teal-500' : 'bg-rose-500'} shadow-[0_0_10px_currentColor]`} style={{ width: `${level}%` }}></div>
            </div>
        </div>
    </div>
);

const TrendSparkline: React.FC<{ data: number[], color: string, label: string, value: string }> = ({ data, color, label, value }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 100}`).join(' ');

    return (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">{label}</div>
                    <div className="text-xl font-black text-white mt-1">{value}</div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-50">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <path d={`M0,100 L0,${100 - ((data[0] - min)/range)*100} ${points} L100,100 Z`} fill={color} fillOpacity="0.1" />
                    <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
        </div>
    );
};

const StressGraph: React.FC = () => {
    const data = Array.from({length: 24}, () => Math.floor(Math.random() * 60) + 10);
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden mt-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Stress Monitor</h3>
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Avg: Moderate</span>
            </div>
            <div className="flex items-end gap-1 h-20">
                {data.map((val, i) => {
                    const color = val > 75 ? 'bg-rose-500' : val > 40 ? 'bg-amber-500' : 'bg-blue-500';
                    return (
                        <div key={i} className="flex-1 bg-zinc-800 rounded-sm overflow-hidden flex flex-col justify-end h-full">
                            <div className={`w-full ${color} opacity-80`} style={{ height: `${val}%` }}></div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-[8px] text-zinc-600 mt-2 font-mono uppercase">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:59</span>
            </div>
        </div>
    );
};

const VitalStat: React.FC<{ label: string, value: string, unit: string, color: string }> = ({ label, value, unit, color }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center relative">
        <div className="text-[9px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">{label}</div>
        <div className={`text-2xl font-black ${color}`}>{value}</div>
        <div className="text-[9px] text-zinc-600 font-medium">{unit}</div>
        <div className={`absolute bottom-0 left-4 right-4 h-0.5 ${color} opacity-20 rounded-full`}></div>
    </div>
);

// --- NEW BRACELET FEATURES ---
const SleepSpO2Chart: React.FC = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-3">
        <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nocturnal SpO2</h4>
            <span className="text-teal-500 font-mono text-xs font-bold">Avg 96%</span>
        </div>
        <div className="h-16 flex items-end gap-0.5 opacity-80">
            {Array.from({length: 40}).map((_, i) => {
                const val = 90 + Math.random() * 9; // 90-99
                const color = val < 92 ? 'bg-rose-500' : 'bg-teal-500';
                return (
                    <div key={i} className={`flex-1 rounded-sm ${color}`} style={{ height: `${(val - 85) * 6}%` }}></div>
                )
            })}
        </div>
        <div className="flex justify-between text-[8px] text-zinc-600 mt-1 font-mono">
            <span>22:00</span>
            <span>02:00</span>
            <span>06:00</span>
        </div>
    </div>
);

const HealthGlance: React.FC = () => (
    <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
            <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Resting HR</div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-rose-400">54</span>
                <span className="text-[9px] text-zinc-600">bpm</span>
            </div>
            <div className="w-full bg-zinc-800 h-0.5 mt-2 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 w-[60%]"></div>
            </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
            <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Skin Temp</div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-orange-400">+0.2</span>
                <span className="text-[9px] text-zinc-600">°C</span>
            </div>
            <div className="w-full bg-zinc-800 h-0.5 mt-2 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 w-[55%]"></div>
            </div>
        </div>
    </div>
);

// --- SMARTWATCH COMPONENTS ---

const RealTacticalMap: React.FC<{ coords: { lat: number, lng: number } | null, runState: 'idle' | 'locating' | 'active' }> = ({ coords, runState }) => {
    const displayCoords = coords || { lat: 40.785091, lng: -73.968285 };
    return (
        <div className="relative w-full h-64 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-inner group">
            <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0, filter: 'grayscale(100%) invert(100%) contrast(1.2) brightness(0.8)' }}
                src={`https://maps.google.com/maps?q=${displayCoords.lat},${displayCoords.lng}&t=m&z=15&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
            ></iframe>
            <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[8px] font-mono text-teal-500 border border-teal-500/20">
                    SAT: {runState === 'active' ? 'LOCKED (4/5)' : 'SEARCHING...'}
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[8px] font-mono text-white border border-white/10">
                    LAT: {displayCoords.lat.toFixed(4)} <br/> LNG: {displayCoords.lng.toFixed(4)}
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
            </div>
            {runState === 'active' && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible" preserveAspectRatio="none">
                    <path id="sim-path" d="M 50 150 C 100 150, 100 50, 200 50 S 300 150, 350 150" fill="none" stroke="rgba(249,115,22,0.4)" strokeWidth="3" strokeDasharray="4 4" pathLength="1" />
                    <circle cx="50" cy="150" r="4" fill="#14b8a6" stroke="white" strokeWidth="2">
                        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <g>
                        <path d="M -7 -7 L 10 0 L -7 7 L -3 0 Z" fill="#f97316" stroke="white" strokeWidth="1.5" />
                        <animateMotion dur="20s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#sim-path" /></animateMotion>
                    </g>
                </svg>
            )}
        </div>
    );
};

const TacticalCompass: React.FC<{ heading: number }> = ({ heading }) => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 relative overflow-hidden flex items-center justify-center">
            <div className="w-full h-12 relative overflow-hidden mask-linear-fade">
                <div className="absolute top-0 bottom-0 flex items-center transition-transform duration-300 ease-out" style={{ transform: `translateX(calc(50% - ${(heading / 360) * 1000}px))`, width: '1000px' }}>
                    {Array.from({ length: 37 }).map((_, i) => {
                        const deg = i * 10;
                        const label = deg === 0 || deg === 360 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : deg.toString();
                        const isCardinal = ['N','E','S','W'].includes(label);
                        return (
                            <div key={i} className="flex flex-col items-center justify-end h-full w-[27px] shrink-0 border-r border-zinc-800/0 relative">
                                <div className={`h-2 w-0.5 ${isCardinal ? 'bg-orange-500 h-3' : 'bg-zinc-600'}`}></div>
                                {i % 3 === 0 && <span className={`text-[9px] font-mono mt-1 ${isCardinal ? 'text-white font-bold' : 'text-zinc-600'}`}>{label}</span>}
                            </div>
                        )
                    })}
                </div>
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-orange-500 z-10 -translate-x-1/2 h-4"></div>
            </div>
            <div className="absolute top-1 right-2 text-[9px] font-mono text-orange-500">{heading.toFixed(0)}°</div>
        </div>
    );
};

const ElevationProfile: React.FC = () => {
    const points = "0,80 20,70 40,75 60,50 80,40 100,60 120,30 140,40 160,20 180,35 200,80";
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4 relative overflow-hidden">
            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-2">
                <span>Elevation</span>
                <span className="text-white">Total +420m</span>
            </div>
            <div className="h-16 w-full relative">
                <svg viewBox="0 0 200 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={`M0,80 ${points} L200,80 Z`} fill="url(#elevGrad)" />
                    <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2" />
                </svg>
            </div>
        </div>
    );
};

const PowerCadenceChart: React.FC = () => {
    const points = 30;
    const power = Array.from({length: points}, () => 200 + Math.random() * 50);
    const cadence = Array.from({length: points}, () => 160 + Math.random() * 20);
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
            <div className="flex justify-between mb-4">
                <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Power (W)</div>
                    <div className="text-lg font-black text-purple-400">234</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Cadence (SPM)</div>
                    <div className="text-lg font-black text-blue-400">172</div>
                </div>
            </div>
            <div className="h-24 w-full flex items-end gap-1">
                {power.map((p, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end gap-0.5 h-full group">
                        <div className="w-full bg-purple-500/40 rounded-sm group-hover:bg-purple-400 transition-colors" style={{ height: `${(p/300)*100}%` }}></div>
                        <div className="w-full h-1 bg-blue-500 rounded-full" style={{ marginBottom: `${(cadence[i]/200)*80}%` }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WeatherWidget: React.FC = () => (
    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-4 border border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="text-3xl">⛅</div>
            <div>
                <div className="text-white font-bold text-sm">24°C <span className="text-zinc-500 font-normal">| Cloudy</span></div>
                <div className="text-[10px] text-zinc-400 font-mono">H:88% • UV:2 • AQI:45</div>
            </div>
        </div>
        <div className="text-right">
            <div className="text-[9px] text-zinc-500 uppercase font-bold">Wind</div>
            <div className="text-sm font-bold text-blue-400 flex items-center justify-end gap-1">
                <svg className="w-3 h-3 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                12 km/h
            </div>
        </div>
    </div>
);

const StatBlock: React.FC<{ label: string, value: string, unit: string, color?: string }> = ({ label, value, unit, color = "text-white" }) => (
    <div className="bg-zinc-800/30 border border-zinc-700 p-3 rounded-xl flex flex-col justify-between">
        <div className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">{label}</div>
        <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${color} tracking-tight`}>{value}</span>
            <span className="text-[10px] font-bold text-zinc-400">{unit}</span>
        </div>
    </div>
);

// --- NEW SMARTWATCH FEATURES ---
const LapTable = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-3">
        <div className="bg-zinc-800/50 p-2 flex justify-between text-[9px] font-bold text-zinc-500 uppercase px-4">
            <span>Lap</span>
            <span>Split</span>
            <span>HR</span>
        </div>
        <div className="divide-y divide-zinc-800">
            {[
                { id: 1, time: '5:32', hr: 142 },
                { id: 2, time: '5:28', hr: 148 },
                { id: 3, time: '5:45', hr: 155 },
                { id: 4, time: '5:22', hr: 160 },
            ].map(lap => (
                <div key={lap.id} className="flex justify-between p-3 px-4 text-xs font-mono text-zinc-300">
                    <span className="text-zinc-500">{lap.id}</span>
                    <span>{lap.time} /km</span>
                    <span className="text-rose-400">{lap.hr}</span>
                </div>
            ))}
        </div>
    </div>
);

const ZoneDistribution = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-3">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Zone Distribution</div>
        <div className="space-y-2">
            {[
                { z: 5, label: 'Maximum', color: 'bg-rose-500', pct: 5, time: '2m' },
                { z: 4, label: 'Threshold', color: 'bg-orange-500', pct: 15, time: '8m' },
                { z: 3, label: 'Aerobic', color: 'bg-emerald-500', pct: 45, time: '24m' },
                { z: 2, label: 'Easy', color: 'bg-blue-500', pct: 25, time: '12m' },
                { z: 1, label: 'Warmup', color: 'bg-zinc-500', pct: 10, time: '5m' },
            ].map((zone) => (
                <div key={zone.z} className="flex items-center gap-3 text-[9px] font-mono font-bold text-zinc-400">
                    <div className="w-6">Z{zone.z}</div>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${zone.color}`} style={{ width: `${zone.pct}%` }}></div>
                    </div>
                    <div className="w-8 text-right text-white">{zone.time}</div>
                </div>
            ))}
        </div>
    </div>
);

const RunningDynamics = () => (
    <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
            <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Vert. Osc.</div>
            <div className="text-xl font-black text-white">8.2<span className="text-xs text-zinc-600 font-normal">cm</span></div>
            <div className="w-full bg-zinc-800 h-1 mt-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[40%]"></div>
            </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
            <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">GCT Bal</div>
            <div className="text-xl font-black text-white">49/51<span className="text-xs text-zinc-600 font-normal">%</span></div>
            <div className="w-full bg-zinc-800 h-1 mt-2 rounded-full overflow-hidden flex">
                <div className="h-full bg-orange-500 w-[49%]"></div>
                <div className="h-full bg-zinc-700 w-[2%]"></div>
                <div className="h-full bg-orange-500 w-[49%]"></div>
            </div>
        </div>
    </div>
);

const SunTracker = () => (
    <div className="bg-gradient-to-b from-sky-900/20 to-zinc-900 border border-zinc-800 rounded-2xl p-4 relative overflow-hidden mt-3">
        <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="text-center">
                <div className="text-[9px] text-zinc-500 uppercase font-bold">Sunrise</div>
                <div className="text-sm font-bold text-amber-400">06:12</div>
            </div>
            <div className="text-center">
                <div className="text-[9px] text-zinc-500 uppercase font-bold">Sunset</div>
                <div className="text-sm font-bold text-indigo-400">18:45</div>
            </div>
        </div>
        
        {/* Arc */}
        <div className="absolute bottom-[-40px] left-4 right-4 h-24 border-t-2 border-dashed border-zinc-600 rounded-full"></div>
        {/* Sun Icon Positioned */}
        <div className="absolute bottom-4 left-1/3 transform -translate-x-1/2 w-6 h-6 bg-amber-400 rounded-full shadow-[0_0_20px_#fbbf24] animate-pulse"></div>
        
        <div className="absolute bottom-2 inset-x-0 text-center text-[9px] text-zinc-500 font-mono">
            14:32 • Daylight Rem: 4h 13m
        </div>
    </div>
);

const BarometerWidget = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-3 flex justify-between items-center">
        <div>
            <div className="text-[9px] text-zinc-500 uppercase font-bold">Barometer</div>
            <div className="text-lg font-black text-white">1012<span className="text-xs text-zinc-600 font-normal">hPa</span></div>
        </div>
        <div className="text-right">
            <div className="text-[9px] text-emerald-500 font-bold uppercase bg-emerald-500/10 px-2 py-1 rounded">Stable</div>
        </div>
    </div>
);

// --- MAIN SCREEN ---

const DeviceSyncScreen: React.FC<DeviceSyncScreenProps> = ({ history = [], ledger, dietPlan, trainingPlan, onToggleFullScreen, onBackToHome }) => {
  const [step, setStep] = useState<'select_type' | 'select_method' | 'enter_id' | 'pairing' | 'dashboard'>('select_type');
  const [deviceType, setDeviceType] = useState<'smartwatch' | 'bracelet' | null>(null);
  const [method, setMethod] = useState<'bluetooth' | 'id' | null>(null);
  
  // Dashboard Tabs State
  const [activeTab, setActiveTab] = useState<string>('main'); // 'main' is default for both

  // Manual ID State
  const [manualId, setManualId] = useState('');
  const [isVerifyingId, setIsVerifyingId] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);

  // Pairing State
  const [pairingLog, setPairingLog] = useState<string[]>([]);

  const [viewDate, setViewDate] = useState<Date>(new Date());
  
  // Run State (Smartwatch Mode)
  const [runState, setRunState] = useState<'idle' | 'locating' | 'active'>('idle');
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Realtime Simulation State
  const [hr, setHr] = useState(65);
  const [hrv, setHrv] = useState(45);
  const [steps, setSteps] = useState(4520);
  const [distance, setDistance] = useState(3.2); // km
  const [pace, setPace] = useState("5:30");
  const [heading, setHeading] = useState(315);
  
  // --- SYNC DATA CALCULATION ---
  const stats = useMemo(() => {
      const dateStr = viewDate.toDateString();
      const isToday = dateStr === new Date().toDateString();
      const dayLogs = history.filter(h => new Date(h.timestamp).toDateString() === dateStr);
      const consumedSugar = dayLogs.filter(h => h.action === 'consumed').reduce((a, b) => a + b.sugarg, 0);
      
      // Recovery Logic
      let recovery = 92;
      let stress = 15; // 0-100
      let strain = 4.5; // 0-21 (Whoop scale)
      let bodyBattery = 85;

      if (isToday && ledger) {
          recovery -= Math.min(60, ledger.sugarDebt * 1.5);
          bodyBattery -= Math.min(50, ledger.sugarDebt);
          
          if (consumedSugar > 25) { recovery -= 10; bodyBattery -= 10; }
          if (consumedSugar > 50) {
              recovery -= 25;
              stress += 40; 
              bodyBattery -= 20;
          }
          
          strain += (ledger.consumed / 100); 
      }

      return { consumedSugar, recovery, stress, strain, bodyBattery: Math.max(5, bodyBattery) };
  }, [viewDate, history, ledger]);

  // Immersive Mode Trigger
  useEffect(() => {
      if (step === 'dashboard') {
          onToggleFullScreen?.(true);
      } else {
          onToggleFullScreen?.(false);
      }
  }, [step, onToggleFullScreen]);

  // Cleanup on unmount
  useEffect(() => {
      return () => onToggleFullScreen?.(false);
  }, []);

  // PAIRING ANIMATION SEQUENCE
  useEffect(() => {
    if (step === 'pairing') {
        const logs = [
            "Initializing Bluetooth Radio...",
            "Scanning 2.4GHz Spectrum...",
            "Device Found: SIGNAL_STRONG",
            "Handshaking with Device...",
            "Verifying Encryption Keys...",
            "Syncing Biometric Profile...",
            "Connected Securely."
        ];
        let i = 0;
        setPairingLog([]);
        
        const interval = setInterval(() => {
            if (i < logs.length) {
                setPairingLog(prev => [...prev, logs[i]]);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => {
                    setStep('dashboard');
                    if (deviceType === 'bracelet') setActiveTab('status');
                    if (deviceType === 'smartwatch') setActiveTab('ops');
                }, 1000);
            }
        }, 600); 

        return () => clearInterval(interval);
    }
  }, [step, deviceType]);

  // Live Update Loop
  useEffect(() => {
      if (step !== 'dashboard') return;

      const interval = setInterval(() => {
          setHr(prev => {
              const base = stats.consumedSugar > 30 ? 85 : 60;
              const noise = Math.floor(Math.random() * 6) - 3;
              return base + noise;
          });

          setHrv(prev => {
              const base = stats.consumedSugar > 30 ? 35 : 65; 
              return Math.max(10, Math.min(120, base + (Math.random() * 10 - 5)));
          });

          setHeading(prev => (prev + (Math.random() * 4 - 2) + 360) % 360);

          if (deviceType === 'smartwatch' && runState === 'active') {
              setSteps(p => p + Math.floor(Math.random() * 5));
              setDistance(p => parseFloat((p + 0.001).toFixed(2)));
              
              if (runStartTime) {
                  setElapsedTime(Math.floor((Date.now() - runStartTime) / 1000));
              }
          }

      }, 1000);
      return () => clearInterval(interval);
  }, [step, stats.consumedSugar, deviceType, runState, runStartTime]);

  const handleVerifyId = () => {
      if (manualId.length < 5) {
          setIdError("Invalid ID Format. Min 5 chars.");
          return;
      }
      setIsVerifyingId(true);
      setIdError(null);

      setTimeout(() => {
          setIsVerifyingId(false);
          if (manualId.toLowerCase().includes('error')) {
              setIdError("Device Handshake Failed.");
          } else {
              setStep('pairing');
          }
      }, 1500);
  };

  const formatDuration = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

  const initiateRun = () => {
      setRunState('locating');
      setTimeout(() => {
          if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                  (pos) => {
                      setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setRunState('active');
                      setRunStartTime(Date.now());
                      setDistance(0);
                      setSteps(0);
                  },
                  (err) => {
                      alert("Location Access Denied. Engaging Tactical Simulation Mode.");
                      setCurrentCoords(null);
                      setRunState('active');
                      setRunStartTime(Date.now());
                  },
                  { enableHighAccuracy: true, timeout: 5000 }
              );
          } else {
              alert("Geolocation Offline. Starting Simulation.");
              setCurrentCoords(null);
              setRunState('active');
              setRunStartTime(Date.now());
          }
      }, 2000);
  };

  const stopRun = () => {
      setRunState('idle');
      setRunStartTime(null);
  };

  // --- RENDER 1: DEVICE TYPE SELECTION ---
  if (step === 'select_type') {
      return (
          <div className="min-h-screen pb-24 px-4 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-10">
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">Sync Protocol</h2>
                  <p className="text-zinc-400 text-sm mt-2">Initialize wearable integration.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                  <button 
                    onClick={() => { setDeviceType('smartwatch'); setStep('select_method'); }}
                    className="group bg-zinc-900 border border-zinc-800 hover:border-orange-500 p-6 rounded-[2rem] text-left transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden"
                  >
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10 flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-800 text-orange-500 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-lg">
                              ⌚
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-white uppercase mb-1">Tactical Watch</h3>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Garmin • Suunto • Apple</div>
                          </div>
                      </div>
                  </button>

                  <button 
                    onClick={() => { setDeviceType('bracelet'); setStep('select_method'); }}
                    className="group bg-zinc-900 border border-zinc-800 hover:border-emerald-500 p-6 rounded-[2rem] text-left transition-all hover:scale-[1.02] shadow-xl relative overflow-hidden"
                  >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10 flex items-center gap-4">
                          <div className="w-16 h-16 bg-zinc-800 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-lg">
                              🔮
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-white uppercase mb-1">Smart Bracelet</h3>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Whoop • Oura • Fitbit</div>
                          </div>
                      </div>
                  </button>
              </div>
          </div>
      );
  }

  // --- RENDER 2: METHOD SELECTION (UPDATED UI) ---
  if (step === 'select_method') {
      return (
          <div className="min-h-screen pb-24 px-4 pt-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <button onClick={() => setStep('select_type')} className="text-zinc-500 hover:text-white mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  ← Back
              </button>
              
              <div className="text-center mb-10">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Establish Link</h2>
                  <p className="text-zinc-500 text-xs mt-2">Select Connection Interface</p>
              </div>

              <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                  {/* Bluetooth Card */}
                  <button 
                    onClick={() => { setMethod('bluetooth'); setStep('pairing'); }} 
                    className="group relative bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 p-6 rounded-3xl text-left transition-all hover:scale-[1.02] overflow-hidden shadow-xl"
                  >
                      {/* Grid Background */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                      
                      <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              </div>
                              <div>
                                  <div className="font-black text-white text-lg uppercase tracking-wide">Bluetooth Scan</div>
                                  <div className="text-[10px] text-zinc-500 font-mono">Protocol: BLE_V5.0_SECURE</div>
                              </div>
                          </div>
                          <div className="text-zinc-600 group-hover:text-blue-500 transform transition-transform group-hover:translate-x-1">→</div>
                      </div>
                  </button>

                  {/* Manual ID Card */}
                  <button 
                    onClick={() => { setMethod('id'); setStep('enter_id'); }} 
                    className="group relative bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 p-6 rounded-3xl text-left transition-all hover:scale-[1.02] overflow-hidden shadow-xl"
                  >
                      {/* Grid Background */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                      <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)] group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                              </div>
                              <div>
                                  <div className="font-black text-white text-lg uppercase tracking-wide">Manual Override</div>
                                  <div className="text-[10px] text-zinc-500 font-mono">Protocol: SERIAL_INPUT_SHA256</div>
                              </div>
                          </div>
                          <div className="text-zinc-600 group-hover:text-purple-500 transform transition-transform group-hover:translate-x-1">→</div>
                      </div>
                  </button>
              </div>
          </div>
      );
  }

  // --- RENDER 3: ENTER ID (UPDATED UI) ---
  if (step === 'enter_id') {
      return (
          <div className="min-h-screen pb-24 px-4 pt-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <button onClick={() => setStep('select_method')} className="text-zinc-500 hover:text-white mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                  ← Back
              </button>
              
              <div className="text-center mb-8">
                  <div className="text-4xl mb-4">⌨️</div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">Manual Input</h2>
                  <p className="text-zinc-400 text-sm mt-2">Locate the Serial ID on the back of your {deviceType}.</p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                  <div className={`bg-zinc-900/50 p-6 rounded-3xl border backdrop-blur-md transition-colors shadow-2xl relative overflow-hidden ${idError ? 'border-rose-500/50 bg-rose-900/10' : 'border-zinc-700'}`}>
                      {/* Scan line effect for input */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-teal-500 to-transparent animate-[scan_2s_linear_infinite] opacity-30"></div>

                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Device Serial ID</label>
                      <div className="relative">
                          <input 
                              type="text" 
                              value={manualId}
                              onChange={(e) => { setManualId(e.target.value.toUpperCase()); setIdError(null); }}
                              placeholder="e.g. SN-492-XKA"
                              disabled={isVerifyingId}
                              className="w-full bg-black/60 border border-zinc-700 rounded-xl p-4 text-xl font-mono text-white placeholder-zinc-700 focus:border-teal-500 outline-none transition-colors uppercase disabled:opacity-50 text-center tracking-widest"
                          />
                          {isVerifyingId && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                          )}
                      </div>
                      
                      {idError && (
                          <div className="text-rose-500 text-xs mt-3 font-bold flex items-center justify-center gap-1 animate-in slide-in-from-top-1">
                              <span>⚠️</span> {idError}
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={handleVerifyId}
                      disabled={manualId.length < 3 || isVerifyingId}
                      className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.2)] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                      {isVerifyingId ? "Verifying..." : "Initiate Handshake"}
                  </button>
              </div>
          </div>
      );
  }

  // --- RENDER 4: PAIRING ANIMATION (UPDATED UI) ---
  if (step === 'pairing') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
              {/* Radar Background */}
              <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[500px] h-[500px] border border-zinc-800 rounded-full animate-[ping_3s_linear_infinite] opacity-20"></div>
                  <div className="w-[300px] h-[300px] border border-zinc-800 rounded-full animate-[ping_3s_linear_infinite_reverse] opacity-20 absolute"></div>
              </div>

              {/* Central Scanner */}
              <div className="relative w-48 h-48 flex items-center justify-center mb-10">
                  <div className="absolute inset-0 border-2 border-zinc-800 rounded-full"></div>
                  
                  {/* Rotating Scan Line */}
                  <div className="absolute inset-0 rounded-full border-t-4 border-teal-500 animate-spin shadow-[0_0_20px_#14b8a6]"></div>
                  
                  <div className="absolute inset-4 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-700 shadow-inner">
                      <div className="text-5xl animate-pulse">
                          {deviceType === 'smartwatch' ? '⌚' : '🔮'}
                      </div>
                  </div>
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-tight animate-pulse mb-4">
                  Establishing Link...
              </h3>
              
              {/* Console Logs */}
              <div className="w-64 h-32 overflow-hidden bg-black/50 border-t border-b border-zinc-800 font-mono text-[10px] text-teal-500 p-2 flex flex-col justify-end">
                  {pairingLog.map((log, i) => (
                      <div key={i} className="animate-in fade-in slide-in-from-bottom-2">
                          <span className="opacity-50 mr-2">{`>`}</span>
                          {log}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // --- RENDER 5: DASHBOARDS (IMMERSIVE & TABBED) ---
  
  // Custom Bottom Navigation
  const renderBottomNav = () => (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-center z-[90] animate-in slide-in-from-bottom-4 duration-500 pointer-events-none">
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-2 flex items-center gap-1 shadow-2xl pointer-events-auto">
              
              {/* Home / Exit Button */}
              <button 
                  onClick={() => {
                      onBackToHome?.();
                      setStep('select_type'); // Reset for next time
                  }}
                  className="flex flex-col items-center justify-center w-14 h-12 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white transition-all active:scale-95 group"
              >
                  <svg className="w-5 h-5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <span className="text-[8px] font-bold uppercase">Exit</span>
              </button>

              <div className="w-px h-8 bg-zinc-800 mx-1"></div>

              {deviceType === 'bracelet' && (
                  <>
                      <NavTab 
                          active={activeTab === 'status'} 
                          onClick={() => setActiveTab('status')} 
                          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                          label="Status"
                      />
                      <NavTab 
                          active={activeTab === 'sleep'} 
                          onClick={() => setActiveTab('sleep')} 
                          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                          label="Sleep"
                      />
                      <NavTab 
                          active={activeTab === 'trends'} 
                          onClick={() => setActiveTab('trends')} 
                          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
                          label="Trends"
                      />
                  </>
              )}

              {deviceType === 'smartwatch' && (
                  <>
                      <NavTab 
                          active={activeTab === 'ops'} 
                          onClick={() => setActiveTab('ops')} 
                          color="bg-orange-500 text-white"
                          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
                          label="Ops"
                      />
                      <NavTab 
                          active={activeTab === 'metrics'} 
                          onClick={() => setActiveTab('metrics')} 
                          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                          label="Metrics"
                      />
                      <NavTab 
                          active={activeTab === 'enviro'} 
                          onClick={() => setActiveTab('enviro')} 
                          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>}
                          label="Enviro"
                      />
                  </>
              )}
          </div>
      </div>
  );

  // A. BRACELET DASHBOARD
  if (step === 'dashboard' && deviceType === 'bracelet') {
      return (
          <div className="min-h-screen bg-zinc-950 animate-in fade-in duration-700 pb-32">
              <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                      <span className="text-xs font-black text-white uppercase tracking-widest">BIO-LINK ACTIVE</span>
                  </div>
              </div>

              <div className="p-4 space-y-6">
                  {/* TAB: STATUS (Default) */}
                  {activeTab === 'status' && (
                      <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                          <DateSelector selectedDate={viewDate} onChange={setViewDate} />
                          
                          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl backdrop-blur-md">
                              <div className="absolute top-0 right-0 p-5">
                                  <div className="flex flex-col items-end"><span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">HRV</span><span className="text-xl font-mono font-bold text-white">{Math.round(hrv)}<span className="text-[10px] text-zinc-600 ml-1">ms</span></span></div>
                              </div>
                              <div className="absolute top-0 left-0 p-5">
                                  <div className="flex flex-col items-start"><span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">RHR</span><span className="text-xl font-mono font-bold text-white">{hr}<span className="text-[10px] text-zinc-600 ml-1">bpm</span></span></div>
                              </div>
                              <RecoveryRing score={stats.recovery} label="Recovery" />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <BodyBatteryLiquid level={stats.bodyBattery} />
                              <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between h-40">
                                  <div className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Day Strain</div>
                                  <div className="text-4xl font-black text-white">{stats.strain.toFixed(1)}</div>
                                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500" style={{ width: `${(stats.strain / 21) * 100}%` }}></div>
                                  </div>
                              </div>
                          </div>
                          
                          <HealthGlance />
                      </div>
                  )}

                  {/* TAB: SLEEP */}
                  {activeTab === 'sleep' && (
                      <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-5">
                              <div className="flex items-center gap-2 mb-4">
                                  <span className="text-lg">💤</span>
                                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Sleep Architecture</h3>
                              </div>
                              
                              <div className="h-40 w-full flex items-end gap-0.5 relative mb-4">
                                  <div className="flex-1 flex h-full items-end opacity-80">
                                      {[{ type: 'awake', w: 5, color: 'bg-rose-500' }, { type: 'light', w: 20, color: 'bg-zinc-600' }, { type: 'deep', w: 15, color: 'bg-indigo-500' }, { type: 'light', w: 10, color: 'bg-zinc-600' }, { type: 'rem', w: 20, color: 'bg-teal-500' }, { type: 'light', w: 15, color: 'bg-zinc-600' }, { type: 'deep', w: 10, color: 'bg-indigo-500' }, { type: 'awake', w: 5, color: 'bg-rose-500' }].map((s, i) => {
                                          const h = s.type === 'awake' ? '100%' : s.type === 'rem' ? '75%' : s.type === 'light' ? '50%' : '25%';
                                          return (<div key={i} className="h-full flex flex-col justify-end" style={{ width: `${s.w}%` }}><div className={`w-full rounded-t-sm ${s.color}`} style={{ height: h }}></div></div>);
                                      })}
                                  </div>
                              </div>
                              <div className="flex justify-between text-[9px] text-zinc-500 uppercase font-mono px-2 bg-black/20 py-2 rounded-xl">
                                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Awake</div>
                                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> REM</div>
                                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div> Light</div>
                                  <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Deep</div>
                              </div>
                          </div>
                          
                          <SleepSpO2Chart />
                      </div>
                  )}

                  {/* TAB: TRENDS */}
                  {activeTab === 'trends' && (
                      <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
                          <TrendSparkline data={[45, 42, 48, 52, 49, 45, Math.round(hrv)]} color="#14b8a6" label="7-Day HRV Trend" value={`${Math.round(hrv)} ms`} />
                          <div className="grid grid-cols-3 gap-3">
                              <VitalStat label="SpO2" value="98" unit="%" color="text-blue-400" />
                              <VitalStat label="Resp" value="14.5" unit="rpm" color="text-teal-400" />
                              <VitalStat label="Temp" value="36.6" unit="°C" color="text-orange-400" />
                          </div>
                          <StressGraph />
                      </div>
                  )}
              </div>
              
              {renderBottomNav()}
          </div>
      );
  }

  // B. SMARTWATCH DASHBOARD (Garmin/Strava)
  if (step === 'dashboard' && deviceType === 'smartwatch') {
      return (
          <div className="min-h-screen bg-zinc-950 animate-in fade-in duration-700 pb-32">
              <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-4 py-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_#f97316] ${runState === 'active' ? 'bg-orange-500 animate-pulse' : 'bg-zinc-600'}`}></div>
                      <span className="text-xs font-black text-white uppercase tracking-widest">{runState === 'active' ? 'RECORDING' : 'TACTICAL OPS'}</span>
                  </div>
              </div>

              <div className="p-4 space-y-4">
                  {/* TAB: OPS (Run Controller) */}
                  {activeTab === 'ops' && (
                      <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-4">
                          {runState === 'idle' || runState === 'locating' ? (
                              <div className="relative w-full h-96 bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 flex flex-col items-center justify-center p-6 text-center shadow-2xl">
                                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent animate-pulse"></div>
                                  <div className="relative z-10 mb-6">
                                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Ready to Deploy?</h3>
                                      <p className="text-xs text-zinc-400 max-w-[200px] mx-auto">GPS Satellites Standby. Initiate run tracking.</p>
                                  </div>
                                  <button onClick={initiateRun} disabled={runState === 'locating'} className="group relative w-24 h-24 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all active:scale-95 disabled:opacity-80">
                                      {runState === 'locating' ? (<div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>) : (<span className="text-white font-black text-sm uppercase tracking-widest">Start</span>)}
                                      <div className="absolute inset-0 rounded-full border-2 border-orange-500 opacity-50 animate-ping"></div>
                                  </button>
                                  {runState === 'locating' && <div className="mt-4 text-[10px] font-mono text-orange-400 animate-pulse">REQUESTING SAT-LINK...</div>}
                              </div>
                          ) : (
                              <>
                                  <RealTacticalMap coords={currentCoords} runState={runState} />
                                  <TacticalCompass heading={heading} />
                                  <div className="grid grid-cols-2 gap-3">
                                      <StatBlock label="Duration" value={formatDuration(elapsedTime)} unit="" color="text-white" />
                                      <StatBlock label="Distance" value={distance.toFixed(2)} unit="km" color="text-orange-500" />
                                      <StatBlock label="Pace" value={pace} unit="/km" color="text-blue-400" />
                                      <StatBlock label="Power" value="234" unit="W" color="text-purple-400" />
                                  </div>
                                  <LapTable />
                                  <button onClick={stopRun} className="w-full py-4 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest rounded-xl transition-all">End Operation</button>
                              </>
                          )}
                      </div>
                  )}

                  {/* TAB: METRICS */}
                  {activeTab === 'metrics' && (
                      <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-4">
                          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                              <div><div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1">Training Load</div><div className="text-xl font-black text-emerald-500">PRODUCTIVE</div><div className="text-[9px] text-zinc-400">VO2 Max: +1 • Load: Optimal</div></div>
                              <div className="h-12 w-12 rounded-full border-4 border-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">54</div>
                          </div>
                          <PowerCadenceChart />
                          <ZoneDistribution />
                          <RunningDynamics />
                      </div>
                  )}

                  {/* TAB: ENVIRO */}
                  {activeTab === 'enviro' && (
                      <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-4">
                          <WeatherWidget />
                          <SunTracker />
                          <ElevationProfile />
                          <BarometerWidget />
                          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                              <div className="flex justify-between items-end mb-3">
                                  <div><div className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Heart Rate</div><div className="text-3xl font-black text-rose-500">{hr} <span className="text-sm text-zinc-500 font-bold">bpm</span></div></div>
                                  <div className="text-right"><div className="text-[9px] font-bold text-zinc-400 uppercase">Zone 2 (Aerobic)</div></div>
                              </div>
                              <div className="flex gap-1 h-24 items-end">
                                  {[1, 2, 3, 4, 5].map(zone => {
                                      const height = zone === 2 ? '60%' : zone === 3 ? '30%' : '15%';
                                      const active = zone === 2; const zoneColor = zone === 5 ? 'bg-rose-600' : zone === 4 ? 'bg-orange-500' : zone === 3 ? 'bg-emerald-500' : 'bg-blue-500';
                                      return (<div key={zone} className="flex-1 flex flex-col gap-1 group"><div className={`w-full rounded-t-sm transition-all duration-500 ${active ? zoneColor : 'bg-zinc-800'}`} style={{ height }}></div><div className={`text-[8px] text-center font-bold ${active ? 'text-white' : 'text-zinc-600'}`}>Z{zone}</div></div>)
                                  })}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
              
              {renderBottomNav()}
          </div>
      );
  }

  return null;
};

export default DeviceSyncScreen;
