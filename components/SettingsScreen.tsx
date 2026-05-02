
import React, { useState, useMemo } from 'react';
import { UserProfile, GoalConfig } from '../types';
import { User, Shield, Zap, Target, Smartphone, Moon, Sun, Mail, Lock, Activity, ChevronRight, Save, LogOut, Loader } from 'lucide-react';
import * as api from '../services/api';

interface SettingsScreenProps {
  userProfile: UserProfile;
  goal: GoalConfig;
  currentLimit: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onUpdate: (newProfile: UserProfile, newLimit: number, newGoal: GoalConfig) => void;
  onBack: () => void;
  onLogout: () => void;
}

const LIFESTYLE_ARCHETYPES = [
  { id: 'desk', title: 'Office Worker', factor: 1.2, icon: '💻', desc: 'Mostly sitting.' },
  { id: 'field', title: 'Active Job', factor: 1.5, icon: '👟', desc: 'Standing/Walking.' },
  { id: 'heavy', title: 'Athlete/Labor', factor: 1.9, icon: '🏗️', desc: 'Physical exertion.' },
  { id: 'custom', title: 'Manual Override', factor: 1.0, icon: '⚙️', desc: 'Granular config.' }
];

const GOAL_MODES = [
  { id: 'cut', name: 'Fat Loss', ratio: 0.05, color: 'rose', icon: '🔥', desc: 'Deficit' },
  { id: 'maintain', name: 'Maintain', ratio: 0.10, color: 'teal', icon: '⚖️', desc: 'Balance' },
  { id: 'bulk', name: 'Build Muscle', ratio: 0.15, color: 'orange', icon: '💪', desc: 'Surplus' },
  { id: 'custom', name: 'Custom Op', ratio: 0.10, color: 'indigo', icon: '🕵️', desc: 'Targeted' }
];

const SettingsScreen: React.FC<SettingsScreenProps> = ({ userProfile, goal, currentLimit, isDarkMode, onToggleDarkMode, onUpdate, onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'account' | 'identity' | 'engine' | 'mission'>('account');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // --- STATE: ACCOUNT ---
  const [email, setEmail] = useState(userProfile.email || 'agent@moriesly.ai');
  const [password, setPassword] = useState(userProfile.password || '********');
  const [isWearableConnected, setIsWearableConnected] = useState(userProfile.isWearableConnected || false);

  // --- STATE: IDENTITY ---
  const [name, setName] = useState(userProfile.name);
  const [age, setAge] = useState(userProfile.age.toString());
  const [height, setHeight] = useState(userProfile.height.toString());
  const [weight, setWeight] = useState(userProfile.weight.toString());
  const [gender, setGender] = useState(userProfile.gender);

  // --- STATE: ENGINE ---
  const [archetypeId, setArchetypeId] = useState('desk'); 
  const [customSugarLimit, setCustomSugarLimit] = useState(currentLimit.toString()); 
  const [isManualLimit, setIsManualLimit] = useState(false);

  // --- STATE: MISSION ---
  const [eventName, setEventName] = useState(goal.eventName);
  const [targetWeight, setTargetWeight] = useState(goal.targetWeight.toString());
  const [targetDate, setTargetDate] = useState(goal.targetDate);
  const [goalMode, setGoalMode] = useState('maintain');

  const calculatedLimit = useMemo(() => {
      if (isManualLimit) return parseInt(customSugarLimit) || currentLimit;
      const a = parseInt(age) || 30;
      const h = parseInt(height) || 170;
      const w = parseInt(weight) || 70;
      const s = gender === 'male' ? 5 : -161;
      const bmr = (10 * w) + (6.25 * h) - (5 * a) + s;
      const archetype = LIFESTYLE_ARCHETYPES.find(a => a.id === archetypeId) || LIFESTYLE_ARCHETYPES[0];
      const tdee = bmr * archetype.factor;
      const goalObj = GOAL_MODES.find(g => g.id === goalMode) || GOAL_MODES[1];
      const sugarRatio = goalObj.ratio;
      const calcGrams = Math.round((tdee * sugarRatio) / 4);
      return Math.max(10, Math.min(85, calcGrams));
  }, [age, height, weight, gender, archetypeId, goalMode, isManualLimit, customSugarLimit, currentLimit]);

  const handleSave = async () => {
      if (saveStatus === 'saving') return;
      setSaveStatus('saving');

      const parsedAge    = parseInt(age)    || userProfile.age;
      const parsedHeight = parseInt(height) || userProfile.height;
      const parsedWeight = parseInt(weight) || userProfile.weight;

      const newProfile: UserProfile = {
          ...userProfile,
          name,
          email,
          password,
          isWearableConnected,
          age:    parsedAge,
          height: parsedHeight,
          weight: parsedWeight,
          gender
      };

      const newGoal: GoalConfig = {
          ...goal,
          eventName,
          targetWeight: parseFloat(targetWeight) || goal.targetWeight,
          targetDate,
          currentWeight: parsedWeight
      };

      // Update local state immediately for snappy UX
      onUpdate(newProfile, calculatedLimit, newGoal);

      // Sync to backend
      try {
          const res = await api.updateUserSettings({
              name,
              gender,
              age:    parsedAge,
              height: parsedHeight,
              weight: parsedWeight,
              archetypeId: archetypeId as 'desk' | 'field' | 'heavy' | 'custom',
              goalMode:    goalMode    as 'cut' | 'maintain' | 'bulk' | 'custom',
              customSugarLimit: isManualLimit ? parseInt(customSugarLimit) || undefined : undefined,
              eventName,
              targetWeight: parseFloat(targetWeight) || goal.targetWeight,
              targetDate,
              isWearableConnected,
          });
          // If BE recalculated the sugar limit, apply it
          if (res.sugarLimit !== undefined) {
              onUpdate(newProfile, res.sugarLimit, newGoal);
          }
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
          console.error('[Settings] Failed to sync to backend:', err);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
      }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 animate-in fade-in duration-500">
        {/* HEADER */}
        <div className="sticky top-0 z-50 bg-white dark:bg-zinc-900/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex justify-between items-center shadow-sm">
            <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 transition-colors group">
                <div className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-teal-50 transition-colors">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </div>
                <span className="text-sm font-bold tracking-wide">Back</span>
            </button>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_8px_#14b8a6]"></div>
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Settings</span>
            </div>
            <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={`p-2 rounded-full text-white shadow-lg active:scale-90 transition-all ${
                    saveStatus === 'saved'  ? 'bg-emerald-500 shadow-emerald-500/20' :
                    saveStatus === 'error'  ? 'bg-rose-500 shadow-rose-500/20' :
                    'bg-teal-500 shadow-teal-500/20'
                }`}
            >
                {saveStatus === 'saving'
                    ? <Loader className="w-5 h-5 animate-spin" />
                    : saveStatus === 'saved'
                    ? <span className="text-xs font-black px-1">✓</span>
                    : saveStatus === 'error'
                    ? <span className="text-xs font-black px-1">!</span>
                    : <Save className="w-5 h-5" />}
            </button>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-6">
            {/* THEME & QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={onToggleDarkMode}
                    className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm transition-all active:scale-95"
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-zinc-800 text-yellow-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>
                            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Theme</span>
                    </div>
                    <div className="text-[10px] font-black text-zinc-400 uppercase">{isDarkMode ? 'Dark' : 'Light'}</div>
                </button>

                <button 
                    onClick={() => setIsWearableConnected(!isWearableConnected)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-95 ${
                        isWearableConnected 
                        ? 'bg-teal-50 border-teal-100 dark:bg-teal-900/20 dark:border-teal-800' 
                        : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isWearableConnected ? 'bg-teal-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>
                            <Activity className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Wearable</span>
                    </div>
                    <div className={`text-[10px] font-black uppercase ${isWearableConnected ? 'text-teal-600' : 'text-zinc-400'}`}>
                        {isWearableConnected ? 'On' : 'Off'}
                    </div>
                </button>
            </div>

            {/* TABS */}
            <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-x-auto scrollbar-hide">
                {(['account', 'identity', 'engine', 'mission'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                            activeTab === tab 
                            ? 'bg-zinc-900 dark:bg-zinc-100 dark:bg-zinc-800 text-white dark:text-zinc-900 shadow-lg' 
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none">
                
                {/* --- ACCOUNT TAB --- */}
                {activeTab === 'account' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">Security & Auth</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 pl-10 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 pl-10 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-zinc-400" />
                                    <div>
                                        <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Wearable Integration</div>
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Sync with Apple Health / Garmin</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsWearableConnected(!isWearableConnected)}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${isWearableConnected ? 'bg-teal-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-zinc-900 rounded-full transition-all ${isWearableConnected ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- IDENTITY TAB --- */}
                {activeTab === 'identity' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600">
                                <User className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">Agent Bio</h3>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Agent Codename</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Gender</label>
                                <div className="flex bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 p-1">
                                    <button onClick={() => setGender('male')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gender === 'male' ? 'bg-white dark:bg-zinc-900 dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Male</button>
                                    <button onClick={() => setGender('female')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gender === 'female' ? 'bg-white dark:bg-zinc-900 dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>Female</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Age</label>
                                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Height (cm)</label>
                                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Weight (kg)</label>
                                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none" />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ENGINE TAB --- */}
                {activeTab === 'engine' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">Metabolic Engine</h3>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 mb-3 block px-1">Base Activity Level</label>
                            <div className="grid grid-cols-1 gap-2">
                                {LIFESTYLE_ARCHETYPES.filter(a => a.id !== 'custom').map(arch => (
                                    <button
                                        key={arch.id}
                                        onClick={() => { setArchetypeId(arch.id); setIsManualLimit(false); }}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                                            archetypeId === arch.id 
                                            ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800' 
                                            : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700'
                                        }`}
                                    >
                                        <div className="text-2xl">{arch.icon}</div>
                                        <div className="flex-1">
                                            <div className={`text-xs font-bold ${archetypeId === arch.id ? 'text-teal-700 dark:text-teal-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{arch.title}</div>
                                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{arch.desc}</div>
                                        </div>
                                        {archetypeId === arch.id && <div className="w-2 h-2 bg-teal-500 rounded-full"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-zinc-400 block">Manual Sugar Override</label>
                                    <div className="text-[9px] text-zinc-500 dark:text-zinc-400">Bypass auto-calculations</div>
                                </div>
                                <button 
                                    onClick={() => setIsManualLimit(!isManualLimit)}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${isManualLimit ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white dark:bg-zinc-900 rounded-full transition-all ${isManualLimit ? 'left-6' : 'left-1'}`}></div>
                                </button>
                            </div>
                            {isManualLimit ? (
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number" 
                                        value={customSugarLimit} 
                                        onChange={(e) => setCustomSugarLimit(e.target.value)}
                                        className="flex-1 bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-zinc-900 dark:text-white font-black text-center text-lg shadow-inner" 
                                    />
                                    <span className="text-xs font-black text-zinc-400 uppercase">grams</span>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <div className="text-3xl font-black text-zinc-900 dark:text-white">{calculatedLimit}<span className="text-sm ml-1 text-zinc-400">g</span></div>
                                    <div className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-1">Optimized Daily Limit</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- MISSION TAB --- */}
                {activeTab === 'mission' && (
                    <div className="space-y-5 animate-in slide-in-from-right-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600">
                                <Target className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">Active Operation</h3>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-zinc-400 mb-3 block px-1">Objective Strategy</label>
                            <div className="grid grid-cols-2 gap-3">
                                {GOAL_MODES.filter(g => g.id !== 'custom').map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setGoalMode(g.id)}
                                        className={`p-4 rounded-2xl border text-left transition-all ${
                                            goalMode === g.id
                                            ? `bg-${g.color}-50 border-${g.color}-200 dark:bg-${g.color}-900/20 dark:border-${g.color}-800`
                                            : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700'
                                        }`}
                                    >
                                        <div className="text-2xl mb-2">{g.icon}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-wider ${goalMode === g.id ? `text-${g.color}-600 dark:text-${g.color}-400` : 'text-zinc-500 dark:text-zinc-400'}`}>{g.name}</div>
                                        <div className="text-[9px] text-zinc-400 mt-1">{g.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Mission Codename</label>
                                <input 
                                    type="text" 
                                    value={eventName} 
                                    onChange={(e) => setEventName(e.target.value)} 
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Target Weight (kg)</label>
                                    <input 
                                        type="number" 
                                        value={targetWeight} 
                                        onChange={(e) => setTargetWeight(e.target.value)} 
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-zinc-400 mb-1.5 block px-1">Target Date</label>
                                    <input 
                                        type="date" 
                                        value={targetDate} 
                                        onChange={(e) => setTargetDate(e.target.value)} 
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* LOGOUT / DANGER ZONE */}
            <div className="pt-6 space-y-3">
                {saveStatus === 'saved' && (
                    <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-black uppercase tracking-widest text-center animate-in fade-in">
                        ✓ Settings Saved to Server
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className="w-full p-3 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-xs font-black uppercase tracking-widest text-center animate-in fade-in">
                        ⚠ Saved Locally — Sync Failed
                    </div>
                )}
                <button
                    onClick={onLogout}
                    className="w-full p-4 flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-xs font-black uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors active:scale-95"
                >
                    <LogOut className="w-4 h-4" />
                    Terminate Session
                </button>
            </div>
        </div>
    </div>
  );
};

export default SettingsScreen;
