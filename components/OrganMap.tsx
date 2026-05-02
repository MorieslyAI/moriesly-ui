
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LedgerState } from '../types';

interface OrganMapProps {
  ledger?: LedgerState;
  sugar?: number;
  calories?: number;
  fat?: number;
  protein?: number;
  fiber?: number;
  type: 'food' | 'drink';
  impactData?: {
    id: string;
    stressLevel: 0 | 1 | 2;
    message: string;
    detail: string;
  }[];
  compact?: boolean;
}

interface OrganStatus {
  id: string;
  name: string;
  stressLevel: 0 | 1 | 2; // 0=Safe, 1=Warning, 2=Critical
  message: string;
  detail: string; // Detailed medical explanation
  icon: string;
  primaryStressor?: string;
}

const OrganMap: React.FC<OrganMapProps> = ({ ledger, sugar: propSugar, calories: propCalories, fat: propFat, protein: propProtein, fiber: propFiber, type, impactData, compact = false }) => {
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sugar = ledger ? ledger.consumed : (propSugar || 0);
  const calories = ledger ? (ledger.calories || 0) : (propCalories || 0);
  const fat = ledger ? (ledger.macros?.fat || 0) : (propFat || 0);
  const protein = ledger ? (ledger.macros?.protein || 0) : (propProtein || 0);
  const fiber = ledger ? (ledger.macros?.fiber || 0) : (propFiber || 0);

  // --- 1. MEDICAL LOGIC ENGINE ---
  const organData = useMemo<OrganStatus[]>(() => {
    if (impactData && impactData.length > 0) {
       return impactData.map(item => ({
          id: item.id,
          name: item.id === 'brain' ? 'Neural Cortex' 
              : item.id === 'skin' ? 'Dermis (Collagen)'
              : item.id === 'heart' ? 'Cardiovascular'
              : item.id === 'liver' ? 'Hepatic System'
              : item.id === 'pancreas' ? 'Pancreas'
              : item.id === 'kidneys' ? 'Renal System'
              : item.id === 'lungs' ? 'Respiratory'
              : item.id === 'muscles' ? 'Musculoskeletal'
              : 'Microbiome',
          stressLevel: item.stressLevel,
          message: item.message,
          detail: item.detail,
          icon: item.id === 'brain' ? '🧠' 
              : item.id === 'skin' ? '✨'
              : item.id === 'heart' ? '❤️'
              : item.id === 'liver' ? '☣️'
              : item.id === 'pancreas' ? '⚡'
              : item.id === 'kidneys' ? '💧'
              : item.id === 'lungs' ? '🫁'
              : item.id === 'muscles' ? '💪'
              : '🦠',
          primaryStressor: item.stressLevel > 0 ? 'Multiple Factors' : undefined
       })).sort((a, b) => b.stressLevel - a.stressLevel);
    }

    const statuses: OrganStatus[] = [];

    // BRAIN
    const brainStress = sugar > 30 || calories > 2500 ? 2 : sugar > 12 || calories > 1500 ? 1 : 0;
    statuses.push({
        id: 'brain',
        name: 'Neural Cortex',
        stressLevel: brainStress as any,
        message: brainStress === 2 ? 'NEURO-METABOLIC OVERLOAD' : 'Cognitive Load Active',
        detail: brainStress === 2 
            ? 'CRITICAL: High glucose and caloric density detected. Expect severe "brain fog", irritability, and cognitive decline.' 
            : 'Moderate metabolic activity detected. Dopamine pathways engaged.',
        icon: '🧠',
        primaryStressor: sugar > 30 ? 'High Sugar' : calories > 2500 ? 'High Calories' : undefined
    });

    // SKIN
    const skinStress = sugar > 25 || fat > 60 ? 2 : sugar > 15 || fat > 40 ? 1 : 0;
    statuses.push({
        id: 'skin',
        name: 'Dermis (Collagen)',
        stressLevel: skinStress as any,
        message: skinStress === 2 ? 'GLYCATION & LIPID STRESS' : 'Elasticity Risk',
        detail: skinStress === 2 
            ? 'WARNING: Combined sugar and saturated fat load is accelerating Advanced Glycation End-products (AGEs), damaging collagen.' 
            : 'Elevated blood glucose and lipids are reducing skin hydration.',
        icon: '✨',
        primaryStressor: sugar > 25 ? 'Sugar Glycation' : fat > 60 ? 'Lipid Stress' : undefined
    });

    // HEART
    const heartStress = sugar > 40 || fat > 70 ? 2 : sugar > 20 || fat > 50 ? 1 : 0;
    statuses.push({
        id: 'heart',
        name: 'Cardiovascular',
        stressLevel: heartStress as any,
        message: heartStress === 2 ? 'VASCULAR INFLAMMATION' : 'Hemodynamic Load',
        detail: heartStress === 2 
            ? 'CRITICAL: High lipid and glucose levels are increasing blood viscosity and arterial wall stress.' 
            : 'Heart rate and vascular pressure increasing to manage nutrient transport.',
        icon: '❤️',
        primaryStressor: fat > 70 ? 'High Fat' : sugar > 40 ? 'High Sugar' : undefined
    });

    // LIVER
    let liverStress = 0;
    if ((type === 'drink' && sugar > 20) || fat > 80 || calories > 2500) liverStress = 2; 
    else if (sugar > 35 || fat > 60 || calories > 1800) liverStress = 1;
    statuses.push({
        id: 'liver',
        name: 'Hepatic System',
        stressLevel: liverStress as any,
        message: liverStress === 2 ? 'METABOLIC TOXICITY' : 'Filtration Load',
        detail: liverStress === 2 
            ? 'TOXICITY ALERT: Liver is overwhelmed by fructose and lipid influx. Forced De Novo Lipogenesis detected.' 
            : 'Glycogen buffers are full. Liver is working overtime to filter excess nutrients.',
        icon: '☣️',
        primaryStressor: fat > 80 ? 'Lipid Influx' : sugar > 35 ? 'Fructose Load' : undefined
    });

    // LUNGS
    const lungStress = sugar > 45 || fat > 85 ? 1 : 0;
    statuses.push({
        id: 'lungs',
        name: 'Respiratory',
        stressLevel: lungStress as any,
        message: lungStress === 1 ? 'OXIDATIVE STRESS' : 'Optimal Oxygenation',
        detail: lungStress === 1 
            ? 'Systemic inflammation is increasing oxidative stress in lung tissue.' 
            : 'Lungs are operating at peak efficiency.',
        icon: '🫁',
        primaryStressor: sugar > 45 ? 'Sugar Oxidation' : undefined
    });

    // PANCREAS
    const pancStress = sugar > 15 || calories > 2200 ? 2 : 1; 
    statuses.push({
        id: 'pancreas',
        name: 'Pancreas',
        stressLevel: pancStress as any,
        message: pancStress === 2 ? 'HYPER-INSULINEMIA' : 'Insulin Secretion',
        detail: pancStress === 2 
            ? 'Emergency Protocol: Beta-cells are dumping maximum insulin to manage glucose load.' 
            : 'Insulin secretion active to maintain blood sugar balance.',
        icon: '⚡',
        primaryStressor: sugar > 15 ? 'Insulin Demand' : undefined
    });

    // KIDNEYS
    const kidneyStress = sugar > 50 || protein > 100 ? 2 : sugar > 30 || protein > 70 ? 1 : 0;
    statuses.push({
        id: 'kidneys',
        name: 'Renal System',
        stressLevel: kidneyStress as any,
        message: kidneyStress === 2 ? 'RENAL OVERLOAD' : 'Hyperfiltration',
        detail: kidneyStress === 2 
            ? 'CRITICAL: High protein and glucose load is forcing kidneys into extreme hyperfiltration.' 
            : 'Kidneys operating at increased filtration rate.',
        icon: '💧',
        primaryStressor: protein > 100 ? 'Protein Load' : sugar > 50 ? 'Glucose Load' : undefined
    });

    // GUT
    const gutStress = fiber < 5 || sugar > 30 || fat > 60 ? 2 : fiber < 10 || sugar > 15 ? 1 : 0;
    statuses.push({
        id: 'gut',
        name: 'Microbiome',
        stressLevel: gutStress as any,
        message: gutStress === 2 ? 'DYSBIOSIS DETECTED' : 'Digestive Load',
        detail: gutStress === 2 
            ? 'CRITICAL: Low fiber and high sugar are decimating beneficial gut flora.' 
            : 'Microbiome is under stress. Increase fiber intake.',
        icon: '🦠',
        primaryStressor: fiber < 5 ? 'Low Fiber' : sugar > 30 ? 'High Sugar' : undefined
    });

    // MUSCLES
    const muscleStress = protein < 30 && calories > 2000 ? 1 : 0;
    statuses.push({
        id: 'muscles',
        name: 'Musculoskeletal',
        stressLevel: muscleStress as any,
        message: muscleStress === 1 ? 'RECOVERY DEFICIT' : 'Anabolic State',
        detail: muscleStress === 1 
            ? 'Insufficient protein relative to caloric intake. Muscle tissue may be catabolized.' 
            : 'Optimal nutrient partitioning for repair and growth.',
        icon: '💪',
        primaryStressor: protein < 30 ? 'Low Protein' : undefined
    });

    return statuses.sort((a, b) => b.stressLevel - a.stressLevel);
  }, [sugar, calories, fat, protein, fiber, type, impactData]);

  const healthScore = useMemo(() => {
      const totalStress = organData.reduce((acc, o) => acc + o.stressLevel, 0);
      const maxPossibleStress = organData.length * 2;
      return Math.round(100 - (totalStress / maxPossibleStress) * 100);
  }, [organData]);

  useEffect(() => {
      if (selectedOrgan && listRef.current) {
          const el = document.getElementById(`list-item-${selectedOrgan}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
      }
  }, [selectedOrgan]);

  const getStatusColor = (level: number) => {
      if (level === 2) return 'text-rose-500 fill-rose-500 stroke-rose-500';
      if (level === 1) return 'text-amber-500 fill-amber-500 stroke-amber-500';
      return 'text-emerald-500 fill-emerald-500 stroke-emerald-500';
  };

  const getOrganStyle = (id: string) => {
      const organ = organData.find(o => o.id === id);
      const level = organ?.stressLevel || 0;
      const isSelected = selectedOrgan === id;
      
      let baseClass = "transition-all duration-500 cursor-pointer hover:opacity-100 ";
      
      if (isSelected) {
          baseClass += "filter drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] stroke-white stroke-2 opacity-100 ";
      } else {
          baseClass += "stroke-none opacity-80 ";
      }
      
      if (level === 2) return baseClass + "fill-rose-500 animate-pulse";
      if (level === 1) return baseClass + "fill-amber-500";
      return baseClass + "fill-emerald-900/40";
  };

  if (compact) {
      return (
          <div className="relative w-full h-full flex items-center justify-center p-2">
              <svg viewBox="0 0 200 450" className="h-full w-auto drop-shadow-xl overflow-visible">
                  <path 
                      d="M 100 10 C 112 10 118 18 118 30 C 118 42 112 48 108 52 L 108 58 C 120 58 130 60 140 65 C 148 70 152 78 154 88 L 162 130 C 165 145 168 160 165 180 L 160 215 C 158 225 152 225 150 215 L 145 180 L 140 130 C 135 150 132 170 130 190 C 128 210 130 230 132 250 L 135 320 C 138 360 135 400 130 435 C 128 445 118 445 115 435 L 110 380 L 105 320 L 100 280 L 95 320 L 90 380 L 85 435 C 82 445 72 445 70 435 C 65 400 62 360 65 320 L 68 250 C 70 230 72 210 70 190 C 68 170 65 150 60 130 L 55 180 L 50 215 C 48 225 42 225 40 215 L 35 180 C 32 160 35 145 38 130 L 46 88 C 48 78 52 70 60 65 C 70 60 80 58 92 58 L 92 52 C 88 48 82 42 82 30 C 82 18 88 10 100 10 Z" 
                      className="fill-zinc-200 dark:fill-zinc-800 stroke-zinc-300 dark:stroke-zinc-700" 
                      strokeWidth="1"
                  />
                  <path d="M84,25 C84,15 116,15 116,25 C116,38 108,46 100,46 C92,46 84,38 84,25" className={getOrganStyle('brain')} />
                  <path d="M108,95 C118,90 125,100 118,110 L108,120 L100,110 C95,100 100,90 108,95" className={getOrganStyle('heart')} />
                  <path d="M65,130 Q85,120 90,140 Q85,160 65,150 Z" className={getOrganStyle('liver')} />
                  <path d="M90,155 Q110,150 120,160 Q110,165 90,160" className={getOrganStyle('pancreas')} />
                  <path d="M75,170 Q65,180 75,190 Z M125,170 Q135,180 125,190 Z" className={getOrganStyle('kidneys')} />
                  <path d="M85,200 Q100,195 115,200 Q120,220 100,230 Q80,220 85,200" className={getOrganStyle('gut')} />
              </svg>
          </div>
      );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden flex flex-col md:flex-row h-full w-full min-h-[600px] md:min-h-0 shadow-2xl">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

        {/* --- LEFT: X-RAY SCANNER --- */}
        <div className="relative w-full md:w-1/2 h-[450px] md:h-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 p-6 overflow-hidden shrink-0">
            
            {/* Scan Line Animation */}
            <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 z-20 border-b-2 border-teal-500/40 shadow-[0_0_20px_#14b8a6] opacity-40 pointer-events-none"
            />
            
            {/* Metabolic Glow */}
            <div className={`absolute inset-0 opacity-10 blur-[100px] transition-colors duration-1000 ${
                sugar > 40 || calories > 2500 ? 'bg-rose-500' : sugar > 20 || calories > 1800 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}></div>

            <svg viewBox="0 0 200 450" className="h-full w-full max-w-[340px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-10 overflow-visible transition-transform duration-700 hover:scale-[1.02]">
                <defs>
                    <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                </defs>

                {/* 1. ANATOMICAL SILHOUETTE */}
                <path 
                    d="M 100 10 C 112 10 118 18 118 30 C 118 42 112 48 108 52 L 108 58 C 120 58 130 60 140 65 C 148 70 152 78 154 88 L 162 130 C 165 145 168 160 165 180 L 160 215 C 158 225 152 225 150 215 L 145 180 L 140 130 C 135 150 132 170 130 190 C 128 210 130 230 132 250 L 135 320 C 138 360 135 400 130 435 C 128 445 118 445 115 435 L 110 380 L 105 320 L 100 280 L 95 320 L 90 380 L 85 435 C 82 445 72 445 70 435 C 65 400 62 360 65 320 L 68 250 C 70 230 72 210 70 190 C 68 170 65 150 60 130 L 55 180 L 50 215 C 48 225 42 225 40 215 L 35 180 C 32 160 35 145 38 130 L 46 88 C 48 78 52 70 60 65 C 70 60 80 58 92 58 L 92 52 C 88 48 82 42 82 30 C 82 18 88 10 100 10 Z" 
                    className="fill-[url(#bodyGradient)] stroke-zinc-300" 
                    strokeWidth="1.5"
                />
                
                {/* Circulatory System */}
                <g className="stroke-blue-400" strokeWidth="0.8" fill="none" opacity={0.15 + (sugar / 120)}>
                  <path d="M 100 50 L 100 80 L 115 100 L 120 140 L 115 180" />
                  <path d="M 100 80 L 85 100 L 80 140 L 85 180" />
                  <path d="M 115 100 L 145 100 L 155 140 L 150 190" />
                  <path d="M 85 100 L 55 100 L 45 140 L 50 190" />
                </g>
                <g className="stroke-rose-400" strokeWidth="0.8" fill="none" opacity={0.15 + (calories / 6000)}>
                  <path d="M 98 50 L 98 80 L 110 105 L 115 145 L 110 185" />
                  <path d="M 98 80 L 90 105 L 85 145 L 90 185" />
                  <path d="M 110 105 L 140 105 L 150 145 L 145 195" />
                  <path d="M 90 105 L 60 105 L 50 145 L 55 195" />
                </g>
                
                {/* --- ORGANS --- */}
                <path id="brain" d="M84,25 C84,15 116,15 116,25 C116,38 108,46 100,46 C92,46 84,38 84,25" className={getOrganStyle('brain')} onClick={() => setSelectedOrgan('brain')} />
                <path id="lungs" d="M80,75 Q70,70 70,100 Q70,130 90,120 Q95,110 95,90 Z M120,75 Q130,70 130,100 Q130,130 110,120 Q105,110 105,90 Z" className={getOrganStyle('lungs')} onClick={() => setSelectedOrgan('lungs')} />
                <path id="heart" d="M102,95 C112,90 119,100 112,110 L102,120 L94,110 C89,100 94,90 102,95" className={getOrganStyle('heart')} onClick={() => setSelectedOrgan('heart')} />
                <path id="liver" d="M65,130 Q85,120 90,140 Q85,160 65,150 Z" className={getOrganStyle('liver')} onClick={() => setSelectedOrgan('liver')} />
                <path id="pancreas" d="M90,155 Q110,150 120,160 Q110,165 90,160" className={getOrganStyle('pancreas')} onClick={() => setSelectedOrgan('pancreas')} />
                <path id="kidneys" d="M75,170 Q65,180 75,190 Z M125,170 Q135,180 125,190 Z" className={getOrganStyle('kidneys')} onClick={() => setSelectedOrgan('kidneys')} />
                <path id="gut" d="M85,200 Q100,195 115,200 Q120,220 100,230 Q80,220 85,200" className={getOrganStyle('gut')} onClick={() => setSelectedOrgan('gut')} />
                <path id="muscles" d="M145,100 L155,140 M55,100 L45,140 M115,320 L110,380 M85,320 L90,380" className={getOrganStyle('muscles')} strokeLinecap="round" strokeWidth="5" fill="none" onClick={() => setSelectedOrgan('muscles')} />

            </svg>

            {/* UI Overlays */}
            <div className="absolute top-6 left-6 border-t-2 border-l-2 border-teal-500/30 w-8 h-8"></div>
            <div className="absolute top-6 right-6 border-t-2 border-r-2 border-teal-500/30 w-8 h-8"></div>
            <div className="absolute bottom-6 left-6 border-b-2 border-l-2 border-teal-500/30 w-8 h-8"></div>
            <div className="absolute bottom-6 right-6 border-b-2 border-r-2 border-teal-500/30 w-8 h-8"></div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-teal-600/50 tracking-[0.3em] uppercase">Metabolic Scan Active</div>
        </div>

        {/* --- RIGHT: DIAGNOSTIC REPORT --- */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-900 min-h-0">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${healthScore < 70 ? 'bg-rose-500' : 'bg-teal-500'}`}></div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-800 dark:text-zinc-200">Diagnostic Intel</h4>
                    </div>
                    <div className="text-[8px] text-zinc-400 font-mono uppercase font-bold">
                        ID: {new Date().getTime().toString(16).toUpperCase()}
                    </div>
                </div>
              </div>

              <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 <AnimatePresence mode="popLayout">
                 {organData.map((organ) => {
                     const isCritical = organ.stressLevel === 2;
                     const isWarning = organ.stressLevel === 1;
                     const isSelected = selectedOrgan === organ.id;

                     return (
                         <motion.div 
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            id={`list-item-${organ.id}`}
                            key={organ.id} 
                            onClick={() => setSelectedOrgan(organ.id)}
                            className={`relative overflow-hidden rounded-2xl transition-all duration-300 border cursor-pointer group shrink-0
                                ${isSelected 
                                    ? 'bg-zinc-50 dark:bg-zinc-800 border-teal-500/30 shadow-lg ring-1 ring-teal-500/10' 
                                    : 'bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-md'
                                }
                            `}
                         >
                             <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                                 isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                             }`}></div>

                             <div className="p-3.5">
                                 <div className="flex justify-between items-center mb-2">
                                     <div className="flex items-center gap-2">
                                         <span className="text-xl filter grayscale group-hover:grayscale-0 transition-all">{organ.icon}</span>
                                         <span className={`text-[10px] font-black uppercase tracking-widest ${getStatusColor(organ.stressLevel).split(' ')[0]}`}>
                                             {organ.name}
                                         </span>
                                     </div>
                                     {isCritical && (
                                        <motion.span 
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="text-[7px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest"
                                        >
                                            Critical
                                        </motion.span>
                                     )}
                                 </div>
                                 
                                 <div className={`text-[10px] font-bold leading-tight ${isCritical ? 'text-rose-700 dark:text-rose-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                     {organ.message}
                                 </div>

                                 {(isSelected || isCritical) && (
                                     <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="mt-3 text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-3"
                                     >
                                         {organ.detail}
                                         {organ.primaryStressor && (
                                             <div className="mt-1.5 flex items-center gap-1">
                                                 <span className="text-[8px] font-black text-zinc-400 uppercase">Primary Stressor:</span>
                                                 <span className="text-[8px] font-black text-rose-500 uppercase">{organ.primaryStressor}</span>
                                             </div>
                                         )}
                                     </motion.div>
                                 )}
                             </div>
                         </motion.div>
                     );
                 })}
                 </AnimatePresence>
                 <div className="h-6"></div>
             </div>
             
             <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 shrink-0">
                 <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Overall Integrity</div>
                            <div className={`text-xs font-black ${healthScore < 60 ? 'text-rose-600' : healthScore < 85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {healthScore}%
                            </div>
                        </div>
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${healthScore}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={`h-full transition-all duration-1000 ${healthScore < 60 ? 'bg-rose-500' : healthScore < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            ></motion.div>
                        </div>
                    </div>
                 </div>
             </div>
        </div>
    </div>
  );
};

export default OrganMap;
