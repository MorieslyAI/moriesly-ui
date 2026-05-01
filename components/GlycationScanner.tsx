
import React, { useState, useEffect } from 'react';
import { SkinAnalysis, FaceZone } from '../types';

interface GlycationScannerProps {
  data: SkinAnalysis | null;
  onScan: (file: File) => void;
  isLoading: boolean;
  onClose: () => void;
}

const LoadingOverlay: React.FC = () => {
    const [step, setStep] = useState(0);
    const steps = [
        "Initializing Biometric Scan...",
        "Mapping Facial Topography...",
        "Detecting Inflammation Markers...",
        "Analyzing Collagen Density...",
        "Measuring AGEs Accumulation...",
        "Calculating Biological Age..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % steps.length);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            {/* Radar Scan Effect */}
            <div className="relative w-48 h-48 mb-8">
                <div className="absolute inset-0 border-2 border-teal-500/30 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 border border-teal-500/50 rounded-full border-dashed animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-teal-500/20 to-transparent animate-[scan-vertical_1.5s_infinite_linear] rounded-full overflow-hidden"></div>
                
                {/* Face Target Dots */}
                <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-teal-400 rounded-full animate-ping"></div>
                <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-teal-400 rounded-full animate-ping delay-100"></div>
                <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-teal-400 rounded-full animate-ping delay-200"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-16 h-16 text-teal-500 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>

            <div className="space-y-2 text-center w-full max-w-xs">
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 animate-[loading-bar_4.8s_linear_infinite]"></div>
                </div>
                <div className="text-teal-400 font-mono text-xs uppercase tracking-widest animate-pulse">
                    {steps[step]}
                </div>
            </div>
            
            <style>{`
                @keyframes loading-bar {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `}</style>
        </div>
    );
};

const SolutionCard: React.FC<{ title: string, content: string, icon: string, color: string }> = ({ title, content, icon, color }) => (
    <div className={`bg-white/5 border-l-2 ${color} p-4 rounded-r-xl mb-3 shadow-sm animate-in slide-in-from-right-4 duration-500`}>
        <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{icon}</span>
            <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">{title}</h4>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed font-medium">
            {content}
        </p>
    </div>
);

// --- FACE MAP INTERACTIVE COMPONENT ---
interface FaceMapProps {
    zones: FaceZone[];
    onSelectZone: (zone: FaceZone) => void;
    activeZone: FaceZone | null;
}

const FaceMap: React.FC<FaceMapProps> = ({ zones, onSelectZone, activeZone }) => {
    // Fallback coordinates if AI doesn't provide them
    const getFallback = (area: string) => {
        const a = (area || "").toLowerCase();
        if (a.includes('forehead')) return { top: '20%', left: '50%' };
        if (a.includes('eyes') || a.includes('eye')) return { top: '40%', left: a.includes('left') ? '35%' : '65%' };
        if (a.includes('cheeks') || a.includes('cheek')) return { top: '55%', left: a.includes('left') ? '30%' : '70%' };
        if (a.includes('nose')) return { top: '50%', left: '50%' };
        if (a.includes('jawline') || a.includes('chin')) return { top: '75%', left: '50%' };
        if (a.includes('neck')) return { top: '90%', left: '50%' };
        if (a.includes('lip') || a.includes('mouth')) return { top: '65%', left: '50%' };
        return { top: '50%', left: '50%' };
    };

    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* 1. MESH OVERLAY: Create the illusion of "Many Points Detected" */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                {/* Simulated Mesh Dots (Pure Visual) */}
                {Array.from({ length: 40 }).map((_, i) => {
                    const top = 15 + Math.random() * 70;
                    const left = 20 + Math.random() * 60;
                    return (
                        <div 
                            key={`mesh-${i}`} 
                            className="absolute w-[2px] h-[2px] bg-teal-500/50 rounded-full"
                            style={{ top: `${top}%`, left: `${left}%` }}
                        ></div>
                    );
                })}
                {/* Connecting Lines (Simulated SVG) */}
                <svg className="absolute inset-0 w-full h-full stroke-teal-500/10 stroke-[0.5] fill-none">
                    <path d="M50 20 Q 20 40 50 80 Q 80 40 50 20 Z" />
                    <line x1="30" y1="40" x2="70" y2="40" />
                    <line x1="40" y1="55" x2="60" y2="55" />
                    <line x1="50" y1="20" x2="50" y2="80" />
                </svg>
            </div>

            {/* 2. INTERACTIVE ZONES */}
            {zones.map((zone, i) => {
                // Use dynamic coordinates from API if available, else fallback
                let top = zone.coordinates ? `${zone.coordinates.y}%` : getFallback(zone.area).top;
                let left = zone.coordinates ? `${zone.coordinates.x}%` : getFallback(zone.area).left;

                const isActive = activeZone === zone;
                const isHigh = zone.severity === 'High';
                const color = isHigh ? 'bg-rose-500' : zone.severity === 'Medium' ? 'bg-amber-500' : 'bg-teal-500';
                
                return (
                    <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); onSelectZone(zone); }}
                        className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 ${isActive ? 'scale-150 z-30' : 'scale-100 z-20 hover:scale-125'}`}
                        style={{ top, left }}
                    >
                        {/* Pulse Ring for Active Item */}
                        <div className={`absolute inset-0 rounded-full ${color} ${isActive ? 'animate-ping opacity-70' : 'opacity-0'} duration-1000`}></div>
                        
                        {/* Dot */}
                        <div className={`w-3 h-3 rounded-full border border-white/50 shadow-lg ${color} flex items-center justify-center transition-colors`}>
                            {isActive && <div className="w-1 h-1 bg-white rounded-full"></div>}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

// --- NEW DIAGNOSTIC MENU COMPONENT ---
const DiagnosticMenu: React.FC<{ zones: FaceZone[], activeZone: FaceZone | null, onSelect: (zone: FaceZone) => void }> = ({ zones, activeZone, onSelect }) => {
    
    const getIcon = (area: string) => {
        const a = (area || "").toLowerCase();
        if (a.includes('eye')) return '👁️';
        if (a.includes('forehead')) return '🧠';
        if (a.includes('nose')) return '👃';
        if (a.includes('cheek')) return '😊';
        if (a.includes('lip') || a.includes('mouth')) return '👄';
        if (a.includes('jaw') || a.includes('chin')) return '🛡️';
        return '📍';
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-20">
            {zones.map((zone, i) => {
                const isActive = activeZone === zone;
                const isHigh = zone.severity === 'High';
                const borderClass = isActive 
                    ? (isHigh ? 'border-rose-500 bg-rose-900/20' : 'border-teal-500 bg-teal-900/20') 
                    : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800';

                return (
                    <button 
                        key={i}
                        onClick={() => onSelect(zone)}
                        className={`text-left p-3 rounded-xl border transition-all duration-300 flex items-start gap-3 relative overflow-hidden ${borderClass}`}
                    >
                        <div className={`text-xl p-2 rounded-lg bg-black/40 ${isActive ? 'scale-110' : ''} transition-transform flex-shrink-0`}>
                            {getIcon(zone.area)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                                    {zone.area}
                                </span>
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isHigh ? 'bg-rose-500' : zone.severity === 'Medium' ? 'bg-amber-500' : 'bg-teal-500'}`}></span>
                            </div>
                            <div className="text-xs font-bold text-zinc-300 truncate">{zone.condition}</div>
                            
                            {/* Expanded Details when Active */}
                            {isActive && zone.explanation && (
                                <div className="mt-2 text-[10px] text-zinc-400 font-medium leading-relaxed border-t border-white/5 pt-2 animate-in fade-in">
                                    "{zone.explanation}"
                                </div>
                            )}
                            
                            {isActive && (
                                <div className="mt-1 text-[9px] text-teal-400 font-mono animate-in fade-in">
                                    Rx: {zone.treatment}
                                </div>
                            )}
                        </div>
                    </button>
                )
            })}
        </div>
    );
};

const GlycationScanner: React.FC<GlycationScannerProps> = ({ data, onScan, isLoading, onClose }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'protocol'>('scan');
  const [activeZone, setActiveZone] = useState<FaceZone | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
        onScan(file);
        setActiveTab('scan');
        setActiveZone(null);
    }
  };

  const getGlycationColor = (level: string) => {
      if (level === 'Critical') return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      if (level === 'Moderate') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col items-center justify-center p-0 md:p-6 animate-in fade-in duration-300 overflow-hidden">
        
        {/* Background Scan Lines */}
        <div className="fixed inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}></div>

        {/* Header (Absolute Top) */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/90 to-transparent">
            <div>
                {data && (
                    <div className="flex items-start gap-4">
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-black text-white">{data.biologicalAge}</h2>
                                <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Bio-Age</span>
                            </div>
                        </div>
                        
                        <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getGlycationColor(data.glycationLevel)}`}>
                            GLYCATION: {data.glycationLevel}
                        </div>
                    </div>
                )}
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur-md">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="w-full h-full flex flex-col relative">
            
            {/* 1. VISUALIZER SECTION (Split Screen Logic) */}
            <div className={`relative w-full transition-all duration-500 ease-in-out overflow-hidden bg-black ${data ? 'h-[35%] md:h-[40%]' : 'h-full flex items-center justify-center'}`}>
                
                {isLoading && <LoadingOverlay />}

                {preview ? (
                    <div className="relative w-full h-full">
                        <img 
                            src={preview} 
                            className={`w-full h-full ${data ? 'object-contain' : 'object-cover'} opacity-80 transition-all duration-500`} 
                            style={{ 
                                filter: data ? 'contrast(1.1) brightness(0.7) grayscale(0.2)' : 'none',
                                transform: activeZone ? 'scale(1.1)' : 'scale(1)' 
                            }}
                        />
                        {/* Scanned Data Overlay */}
                        {data && data.faceZones && (
                            <FaceMap 
                                zones={data.faceZones} 
                                activeZone={activeZone}
                                onSelectZone={(zone) => { setActiveZone(zone); setActiveTab('scan'); }}
                            />
                        )}
                        
                        {/* Active Zone Label on Image (Minimal) */}
                        {activeZone && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-widest animate-in slide-in-from-bottom-2">
                                {activeZone.area}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center z-10 px-4">
                        <div className="w-24 h-24 border-2 border-dashed border-zinc-700 rounded-full flex items-center justify-center mb-6 mx-auto">
                            <svg className="w-10 h-10 opacity-50 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Facial Impact Scan</h3>
                        <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">Pinpoint specific facial zones affected by sugar & inflammation.</p>
                        <label className="cursor-pointer bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-900/50 transition-transform hover:scale-105 active:scale-95 inline-flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Start Face Scan
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>
                )}
            </div>

            {/* 2. DATA PANEL (Bottom Half) */}
            {data && (
                <div className="flex-1 bg-zinc-950 relative z-20 flex flex-col min-h-0 border-t border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-zinc-800 sticky top-0 bg-zinc-950 z-30">
                        <button 
                            onClick={() => setActiveTab('scan')}
                            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'scan' ? 'text-teal-400 border-b-2 border-teal-400 bg-teal-950/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Diagnostic Menu
                        </button>
                        <button 
                            onClick={() => setActiveTab('protocol')}
                            className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'protocol' ? 'text-teal-400 border-b-2 border-teal-400 bg-teal-950/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Rescue Protocol
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                        
                        {/* TAB: DIAGNOSTIC MENU */}
                        {activeTab === 'scan' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                
                                {/* Markers Cloud */}
                                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl mb-2">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Detected Markers</div>
                                    <div className="flex flex-wrap gap-2">
                                        {data.detectedIssues.map((issue, idx) => (
                                            <span key={idx} className="text-xs font-bold text-zinc-300 bg-black/40 px-2 py-1 rounded border border-zinc-700">
                                                {issue}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-xs font-bold text-zinc-500 mb-2 mt-4">
                                    <span>ZONAL ANALYSIS ({data.faceZones.length})</span>
                                    <span>STATUS</span>
                                </div>

                                <DiagnosticMenu 
                                    zones={data.faceZones} 
                                    activeZone={activeZone} 
                                    onSelect={(zone) => setActiveZone(zone)} 
                                />

                                {/* Projection Footer */}
                                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div className="text-[10px] font-bold text-teal-500 uppercase mb-1 tracking-widest">Future Projection (5 Years)</div>
                                    <p className="text-sm text-zinc-300 italic leading-relaxed relative z-10 font-medium">"{data.projection}"</p>
                                </div>
                            </div>
                        )}

                        {/* TAB: PROTOCOL */}
                        {activeTab === 'protocol' && data.recommendations && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
                                
                                {/* EMERGENCY FIX CARD */}
                                {data.recommendations.emergencyFix && (
                                    <div className="bg-rose-600 p-4 rounded-xl shadow-lg shadow-rose-900/50 mb-4 animate-pulse-slow">
                                        <div className="flex items-center gap-2 mb-1 text-white">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                            <h3 className="font-black uppercase text-xs tracking-widest">Emergency Fix</h3>
                                        </div>
                                        <p className="text-sm font-bold text-white leading-tight">
                                            {data.recommendations.emergencyFix}
                                        </p>
                                    </div>
                                )}

                                <SolutionCard 
                                    title="Active Skincare Regime" 
                                    content={data.recommendations.skincare}
                                    icon="🧪"
                                    color="border-purple-500"
                                />
                                <SolutionCard 
                                    title="Dietary Counter-Measure" 
                                    content={data.recommendations.diet}
                                    icon="🥗"
                                    color="border-emerald-500"
                                />
                                <SolutionCard 
                                    title="Lifestyle Correction" 
                                    content={data.recommendations.habit}
                                    icon="⚡"
                                    color="border-amber-500"
                                />

                                {/* Nutrition Grid */}
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-xl">
                                        <div className="text-[10px] font-black text-emerald-500 uppercase mb-2">Power Foods</div>
                                        <ul className="text-xs text-zinc-400 space-y-1">
                                            {data.recommendations.powerFoods?.map((f, i) => <li key={i}>+ {f}</li>) || <li>berries</li>}
                                        </ul>
                                    </div>
                                    <div className="bg-rose-900/10 border border-rose-500/20 p-3 rounded-xl">
                                        <div className="text-[10px] font-black text-rose-500 uppercase mb-2">Toxic Triggers</div>
                                        <ul className="text-xs text-zinc-400 space-y-1">
                                            {data.recommendations.avoidFoods?.map((f, i) => <li key={i}>- {f}</li>) || <li>sugar</li>}
                                        </ul>
                                    </div>
                                </div>

                                {/* Repair Timeline Visual */}
                                <div className="mt-6 pt-4 border-t border-zinc-800">
                                    <div className="text-[10px] font-bold text-zinc-500 uppercase mb-3 text-center">Repair Timeline</div>
                                    <div className="flex justify-between items-center text-[9px] text-zinc-400">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white border border-zinc-700">24h</div>
                                            <span>Depuff</span>
                                        </div>
                                        <div className="h-0.5 flex-1 bg-zinc-800 mx-2"></div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white border border-zinc-700">7d</div>
                                            <span>Clarity</span>
                                        </div>
                                        <div className="h-0.5 flex-1 bg-zinc-800 mx-2"></div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-8 h-8 rounded-full bg-teal-900/50 flex items-center justify-center font-bold text-teal-400 border border-teal-500/50">30d</div>
                                            <span>Glow</span>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={onClose}
                                    className="w-full bg-white text-black font-black uppercase text-xs py-4 rounded-xl shadow-lg hover:bg-zinc-200 transition-colors mt-6"
                                >
                                    Commit to Protocol
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default GlycationScanner;
