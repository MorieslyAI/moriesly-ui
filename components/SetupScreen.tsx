
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../types';

export interface SetupCalibrationData {
  archetypeId:       'desk' | 'field' | 'heavy' | 'custom';
  dailySteps?:       number;
  workoutFreq?:      number;
  workoutIntensity?: 'low' | 'mod' | 'high';
  goalMode:          'cut' | 'maintain' | 'bulk' | 'custom';
  customSugarLimit?: number;
}

interface SetupScreenProps {
  initialStats?: UserProfile;
  onComplete: (
    limit: number,
    profileName: string,
    stats: { age: number; height: number; weight: number; gender: 'male' | 'female'; medicalConditions: string[] },
    calibration: SetupCalibrationData
  ) => void;
}

const LIFESTYLE_ARCHETYPES = [
  { id: 'desk', title: 'Office Operator', factor: 1.2, icon: '👨‍💻', desc: 'Sedentary role.' },
  { id: 'field', title: 'Field Agent', factor: 1.5, icon: '🚶', desc: 'Moderate movement.' },
  { id: 'heavy', title: 'Heavy Unit', factor: 1.9, icon: '🏋️', desc: 'High exertion.' },
  { id: 'custom', title: 'Manual Config', factor: 1.0, icon: '⚙️', desc: 'Granular control.' }
];

const GOAL_MODES = [
  { id: 'cut', name: 'Shred', ratio: 0.05, color: 'rose', icon: '🔥', desc: 'Fat Loss' },
  { id: 'maintain', name: 'Sustain', ratio: 0.10, color: 'teal', icon: '⚓', desc: 'Balance' },
  { id: 'bulk', name: 'Mass', ratio: 0.15, color: 'orange', icon: '🦍', desc: 'Growth' },
  { id: 'custom', name: 'Custom', ratio: 0.10, color: 'indigo', icon: '🧠', desc: 'Specific' }
];

const COMMON_CONDITIONS = [
    { id: 'diabetes', label: 'Diabetes (Type 1/2)', icon: '🩸', risk: 'Critical' },
    { id: 'prediabetes', label: 'Pre-Diabetes', icon: '⚠️', risk: 'High' },
    { id: 'hypertension', label: 'Hypertension', icon: '🫀', risk: 'Mod' },
    { id: 'pcos', label: 'PCOS', icon: '🧬', risk: 'High' },
    { id: 'gerd', label: 'GERD / Acid Reflux', icon: '🔥', risk: 'Mod' },
    { id: 'cholesterol', label: 'High Cholesterol', icon: '🍔', risk: 'High' }
];

const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete, initialStats }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4; // Increased to 4

  // --- IDENTITY STATE ---
  const [gender, setGender] = useState<'male' | 'female'>(initialStats?.gender || 'male');
  const [age, setAge] = useState<string>(initialStats?.age?.toString() || '');
  const [height, setHeight] = useState<string>(initialStats?.height?.toString() || '');
  const [weight, setWeight] = useState<string>(initialStats?.weight?.toString() || '');
  const [name, setName] = useState(initialStats?.name || '');
  
  // --- CALIBRATION STATE ---
  const [archetypeId, setArchetypeId] = useState<string>('desk');
  const [dailySteps, setDailySteps] = useState<string>('5000');
  const [workoutFreq, setWorkoutFreq] = useState<string>('3');
  const [workoutIntensity, setWorkoutIntensity] = useState<'low' | 'mod' | 'high'>('mod');
  
  // --- MEDICAL STATE (NEW) ---
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [customDisease, setCustomDisease] = useState('');

  // --- MISSION STATE ---
  const [goalId, setGoalId] = useState<string>('cut');
  const [customSugarLimit, setCustomSugarLimit] = useState('');
  
  const toggleCondition = (condition: string) => {
      setMedicalConditions(prev => 
          prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
      );
  };

  const handleSkipMedical = () => {
      setMedicalConditions([]);
      setCustomDisease('');
      handleNext();
  };

  // --- LOGIC ---
  const canProceed = useMemo(() => {
      if (step === 1) return age && height && weight && name;
      return true;
  }, [step, age, height, weight, name]);

  const getCustomActivityFactor = () => {
      let base = 1.15; 
      const steps = parseInt(dailySteps) || 0;
      base += (steps / 1000) * 0.03;
      const freq = parseInt(workoutFreq) || 0;
      let intensityMult = 0.03; 
      if (workoutIntensity === 'mod') intensityMult = 0.06; 
      if (workoutIntensity === 'high') intensityMult = 0.10; 
      base += (freq * intensityMult); 
      return Math.min(2.4, Math.max(1.1, base)); 
  };

  const calculateLimit = () => {
      // 1. MANUAL OVERRIDE (Priority 1)
      if (goalId === 'custom' && customSugarLimit) {
          const manual = parseInt(customSugarLimit);
          if (!isNaN(manual) && manual > 0) return manual;
      }

      const a = parseInt(age) || 30;
      const h = parseInt(height) || 170;
      const w = parseInt(weight) || 70;
      
      // BMR
      const s = gender === 'male' ? 5 : -161;
      const bmr = (10 * w) + (6.25 * h) - (5 * a) + s;
      
      // Activity
      let activityFactor = 1.2;
      if (archetypeId === 'custom') {
          activityFactor = getCustomActivityFactor();
      } else {
          const archetype = LIFESTYLE_ARCHETYPES.find(a => a.id === archetypeId) || LIFESTYLE_ARCHETYPES[0];
          activityFactor = archetype.factor;
      }
      
      const tdee = bmr * activityFactor;
      
      // Goal
      let sugarRatio = 0.10; // Default WHO recommendation (10% of calories)
      const goal = GOAL_MODES.find(g => g.id === goalId) || GOAL_MODES[0];
      
      if (goalId === 'custom') {
          sugarRatio = 0.09;
      } else {
          sugarRatio = goal.ratio;
      }

      // Medical Penalties (Drastically reduce sugar allowance)
      if (medicalConditions.includes('diabetes') || customDisease.toLowerCase().includes('diabetes')) sugarRatio = 0.03; // Very strict
      else if (medicalConditions.includes('prediabetes')) sugarRatio = 0.04;
      else if (medicalConditions.includes('pcos')) sugarRatio = 0.05;
      else if (medicalConditions.includes('hypertension') || medicalConditions.includes('cholesterol')) sugarRatio = 0.06;
      else if (medicalConditions.length > 0 || customDisease) sugarRatio = Math.max(0.05, sugarRatio - 0.02); // Generic penalty for any other condition

      const calculatedGrams = Math.round((tdee * sugarRatio) / 4);
      return Math.max(5, Math.min(100, calculatedGrams));
  };

  const currentCalculatedLimit = calculateLimit();

  const handleNext = () => {
      if (step < totalSteps) {
          setStep(step + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          // Combine standard conditions with custom input
          const finalConditions = [...medicalConditions];
          if (customDisease) finalConditions.push(customDisease);

          onComplete(
            currentCalculatedLimit,
            name,
            {
              age:               parseInt(age),
              height:            parseInt(height),
              weight:            parseInt(weight),
              gender,
              medicalConditions: finalConditions,
            },
            {
              archetypeId:       archetypeId as 'desk' | 'field' | 'heavy' | 'custom',
              dailySteps:        archetypeId === 'custom' ? parseInt(dailySteps) : undefined,
              workoutFreq:       archetypeId === 'custom' ? parseInt(workoutFreq) : undefined,
              workoutIntensity:  archetypeId === 'custom' ? workoutIntensity : undefined,
              goalMode:          goalId as 'cut' | 'maintain' | 'bulk' | 'custom',
              customSugarLimit:  goalId === 'custom' && customSugarLimit ? parseInt(customSugarLimit) : undefined,
            }
          );
      }
  };

  // --- DYNAMIC RESULT CARD ---
  const ResultCard = () => (
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center relative overflow-hidden mt-6 shadow-xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/30 to-transparent pointer-events-none"></div>
          <div className="relative z-10">
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                  Optimized Protocol
              </div>
              <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-black text-white tracking-tighter transition-all duration-300">
                      {currentCalculatedLimit}
                  </span>
                  <span className="text-xl font-bold text-zinc-500">g</span>
              </div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wide mt-2 font-mono bg-black/40 inline-block px-3 py-1 rounded-full border border-zinc-800">
                  Daily Sugar Allowance
              </div>
              
              {/* Active Factors Display */}
              <div className="flex justify-center gap-2 mt-4 text-[9px] text-zinc-500 font-mono uppercase tracking-tight flex-wrap opacity-70">
                  <span>{gender === 'male' ? 'XY' : 'XX'}</span>
                  <span>•</span>
                  <span>{weight || '--'}KG</span>
                  {(medicalConditions.length > 0 || customDisease) && (
                      <>
                        <span>•</span>
                        <span className="text-rose-500 font-bold">MED-ALERT</span>
                      </>
                  )}
                  <span>•</span>
                  <span className={goalId === 'cut' ? 'text-rose-500' : goalId === 'bulk' ? 'text-orange-500' : 'text-teal-500'}>
                      {goalId === 'custom' ? 'MANUAL' : GOAL_MODES.find(g => g.id === goalId)?.name}
                  </span>
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden flex flex-col relative selection:bg-teal-500/30">
        
        {/* --- DEEP BACKGROUND --- */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-black">
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-zinc-900 to-transparent opacity-50"></div>
            <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-zinc-900 to-transparent opacity-50"></div>
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        {/* --- PROGRESS HEADER --- */}
        <div className="relative z-10 px-6 pt-12 pb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-sm">
                        0{step}
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Initialization</h2>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                            {step === 1 ? 'Agent Identity' : step === 2 ? 'Calibration' : step === 3 ? 'Medical Intel' : 'Mission Profile'}
                        </h1>
                    </div>
                </div>
            </div>
            
            {/* Step Indicators */}
            <div className="flex gap-2 h-1">
                {[1, 2, 3, 4].map(i => (
                    <div 
                        key={i} 
                        className={`flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-teal-500' : 'bg-zinc-800'}`}
                    ></div>
                ))}
            </div>
        </div>

        {/* --- MAIN SCROLL AREA --- */}
        <div className="relative z-10 flex-1 px-6 pb-32 overflow-y-auto w-full max-w-md mx-auto no-scrollbar">
            
            {/* STEP 1: IDENTITY */}
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    
                    {/* Codename */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Codename</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="ENTER NAME"
                            className="w-full bg-transparent text-2xl font-black text-white placeholder-zinc-700 focus:outline-none uppercase tracking-wide border-b border-zinc-800 focus:border-teal-500 transition-colors pb-2"
                        />
                    </div>

                    {/* Gender */}
                    <div className="grid grid-cols-2 gap-3">
                        {(['male', 'female'] as const).map((g) => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                className={`h-20 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                                    gender === g 
                                    ? 'bg-zinc-800 border-teal-500 text-white' 
                                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                                }`}
                            >
                                <span className="text-2xl">{g === 'male' ? '👨‍✈️' : '👩‍✈️'}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">{g}</span>
                            </button>
                        ))}
                    </div>

                    {/* Biometrics */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-px bg-zinc-800 flex-1"></div>
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Biometrics</span>
                            <div className="h-px bg-zinc-800 flex-1"></div>
                        </div>
                        
                        {[
                            { label: 'Age', val: age, set: setAge, unit: 'YRS', ph: '00' },
                            { label: 'Height', val: height, set: setHeight, unit: 'CM', ph: '000' },
                            { label: 'Weight', val: weight, set: setWeight, unit: 'KG', ph: '00' }
                        ].map((field) => (
                            <div key={field.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{field.label}</span>
                                <div className="flex items-baseline gap-1">
                                    <input 
                                        type="number" 
                                        value={field.val} 
                                        onChange={e => field.set(e.target.value)} 
                                        className="w-20 bg-transparent text-right text-xl font-black text-white focus:outline-none placeholder-zinc-800"
                                        placeholder={field.ph}
                                    />
                                    <span className="text-[10px] font-bold text-zinc-600 w-8">{field.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Live Result Preview */}
                    <ResultCard />
                </div>
            )}

            {/* STEP 2: CALIBRATION */}
            {step === 2 && (
                <div className="space-y-3 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    {LIFESTYLE_ARCHETYPES.map((arch) => {
                        const isSelected = archetypeId === arch.id;
                        return (
                            <div key={arch.id} className="relative">
                                <button
                                    onClick={() => setArchetypeId(arch.id)}
                                    className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all duration-300 text-left ${
                                        isSelected 
                                        ? 'bg-zinc-800 border-teal-500 shadow-lg' 
                                        : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900'
                                    }`}
                                >
                                    <div className={`text-2xl ${isSelected ? 'scale-110' : 'opacity-50'} transition-transform`}>
                                        {arch.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-black uppercase tracking-wide ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                            {arch.title}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5">{arch.desc}</div>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-teal-500' : 'border-zinc-700'}`}>
                                        {isSelected && <div className="w-2 h-2 bg-teal-500 rounded-full"></div>}
                                    </div>
                                </button>

                                {/* Inline Custom Drawer */}
                                {arch.id === 'custom' && isSelected && (
                                    <div className="mt-3 bg-zinc-900 border border-zinc-800 p-5 rounded-3xl space-y-5 animate-in slide-in-from-top-2 fade-in">
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Movement</label>
                                                <span className="text-xs font-mono font-bold text-teal-400">{(parseInt(dailySteps)/1000).toFixed(1)}k</span>
                                            </div>
                                            <input 
                                                type="range" min="1000" max="25000" step="500" 
                                                value={dailySteps} onChange={e => setDailySteps(e.target.value)} 
                                                className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-teal-500" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-2 tracking-widest">Freq</label>
                                                <div className="flex bg-black p-1 rounded-xl">
                                                    {[1, 3, 5, 7].map(num => (
                                                        <button key={num} onClick={() => setWorkoutFreq(num.toString())} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold ${workoutFreq === num.toString() ? 'bg-teal-600 text-white' : 'text-zinc-600'}`}>{num}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-2 tracking-widest">Int</label>
                                                <div className="flex bg-black p-1 rounded-xl">
                                                    {(['low', 'mod', 'high'] as const).map(lvl => (
                                                        <button key={lvl} onClick={() => setWorkoutIntensity(lvl)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase ${workoutIntensity === lvl ? 'bg-white text-black' : 'text-zinc-600'}`}>{lvl.substring(0,1)}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Live Result Preview */}
                    <ResultCard />
                </div>
            )}

            {/* STEP 3: MEDICAL INTEL (NEW) */}
            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    
                    <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Biological Audit</h3>
                            <span className="bg-rose-500/10 text-rose-500 text-[9px] font-bold px-2 py-1 rounded border border-rose-500/20">CONFIDENTIAL</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mb-4 leading-relaxed">
                            Do you have any existing metabolic conditions? This will strictly adjust your daily sugar allowance.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            {COMMON_CONDITIONS.map((cond) => {
                                const active = medicalConditions.includes(cond.id);
                                return (
                                    <button
                                        key={cond.id}
                                        onClick={() => toggleCondition(cond.id)}
                                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                                            active 
                                            ? 'bg-rose-900/20 border-rose-500' 
                                            : 'bg-black/30 border-zinc-800 hover:border-zinc-600'
                                        }`}
                                    >
                                        {active && <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-bl-lg shadow-[0_0_10px_#e11d48]"></div>}
                                        <div className="text-xl mb-1 group-hover:scale-110 transition-transform">{cond.icon}</div>
                                        <div className={`text-[10px] font-bold uppercase leading-tight ${active ? 'text-white' : 'text-zinc-400'}`}>
                                            {cond.label}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Manual Input */}
                    <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Specific Diagnosis</label>
                        <input 
                            type="text" 
                            value={customDisease} 
                            onChange={e => setCustomDisease(e.target.value)} 
                            placeholder="Type here (e.g. Insulin Resistance)"
                            className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white text-xs focus:border-rose-500 outline-none"
                        />
                    </div>

                    {/* Skip / Clear */}
                    <button 
                        onClick={handleSkipMedical}
                        className="w-full py-3 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                        No Known Conditions (Skip)
                    </button>

                    <ResultCard />
                </div>
            )}

            {/* STEP 4: MISSION (Formerly Step 3) */}
            {step === 4 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    
                    <div className="grid grid-cols-2 gap-3">
                        {GOAL_MODES.map((goal) => {
                            const isSelected = goalId === goal.id;
                            // Colors
                            let borderClass = 'border-zinc-800';
                            let bgClass = 'bg-zinc-900/30';
                            let textClass = 'text-zinc-400';
                            
                            if (isSelected) {
                                if (goal.color === 'rose') { borderClass = 'border-rose-500'; bgClass = 'bg-rose-900/20'; textClass = 'text-white'; }
                                else if (goal.color === 'teal') { borderClass = 'border-teal-500'; bgClass = 'bg-teal-900/20'; textClass = 'text-white'; }
                                else if (goal.color === 'orange') { borderClass = 'border-orange-500'; bgClass = 'bg-orange-900/20'; textClass = 'text-white'; }
                                else { borderClass = 'border-indigo-500'; bgClass = 'bg-indigo-900/20'; textClass = 'text-white'; }
                            }

                            return (
                                <button
                                    key={goal.id}
                                    onClick={() => setGoalId(goal.id)}
                                    className={`p-4 rounded-3xl border-2 text-left transition-all duration-300 relative overflow-hidden group h-32 flex flex-col justify-between ${borderClass} ${bgClass}`}
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <span className={`text-2xl filter drop-shadow-md ${isSelected ? 'scale-110' : 'grayscale opacity-50'} transition-transform duration-300`}>{goal.icon}</span>
                                        {isSelected && <div className={`w-2 h-2 rounded-full bg-${goal.color}-500 animate-pulse shadow-[0_0_10px_currentColor]`}></div>}
                                    </div>
                                    <div>
                                        <div className={`font-black uppercase text-xs tracking-wide ${textClass}`}>{goal.name}</div>
                                        <div className="text-[9px] text-zinc-500 leading-tight mt-0.5">{goal.desc}</div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* CUSTOM GOAL PANEL - Vertical Expansion - FIXED LAYOUT */}
                    <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${goalId === 'custom' ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="bg-zinc-900 border border-indigo-500/50 p-5 rounded-3xl mt-2 w-full max-w-full box-border">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-indigo-400 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                                    Manual Override
                                </h3>
                            </div>
                            
                            <div className="bg-black rounded-2xl p-2 flex items-center border border-zinc-800 focus-within:border-indigo-500 transition-colors mb-4">
                                <input 
                                    type="number" 
                                    value={customSugarLimit}
                                    onChange={(e) => setCustomSugarLimit(e.target.value)}
                                    placeholder="--"
                                    className="flex-1 w-full bg-transparent text-center text-3xl font-black text-white focus:outline-none placeholder-zinc-800"
                                />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase pr-4 whitespace-nowrap">g / Day</span>
                            </div>
                        </div>
                    </div>

                    {/* Result Card Final */}
                    <ResultCard />
                </div>
            )}

        </div>

        {/* --- BOTTOM ACTION BAR --- */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-6 z-50 bg-gradient-to-t from-black via-black/95 to-transparent">
            <div className="flex gap-3 max-w-md mx-auto w-full">
                {step > 1 && (
                    <button 
                        onClick={() => setStep(step - 1)}
                        className="w-14 h-14 flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors active:scale-95"
                    >
                        ←
                    </button>
                )}
                <button 
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="flex-1 h-14 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                    {step === totalSteps ? 'Confirm Protocol' : 'Next Step'}
                    <div className="w-1 h-1 bg-black rounded-full group-hover:scale-150 transition-transform"></div>
                </button>
            </div>
        </div>

    </div>
  );
};

export default SetupScreen;
