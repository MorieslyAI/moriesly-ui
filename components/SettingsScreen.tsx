import React, { useEffect, useMemo, useState } from 'react';
import { UserProfile, GoalConfig } from '../types';
import {
  User,
  Shield,
  Zap,
  Target,
  Smartphone,
  Moon,
  Sun,
  Mail,
  Activity,
  ChevronRight,
  Save,
  LogOut,
  Loader,
} from 'lucide-react';
import * as api from '../services/api';

interface SettingsScreenProps {
  userProfile: UserProfile;
  goal: GoalConfig;
  currentLimit: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onUpdate: (
    newProfile: UserProfile,
    newLimit: number,
    newGoal: GoalConfig
  ) => void;
  onBack: () => void;
  onLogout: () => void;
}

type ArchetypeId = 'desk' | 'field' | 'heavy' | 'custom';
type GoalMode = 'cut' | 'maintain' | 'bulk' | 'custom';

type SettingsUserProfile = UserProfile & {
  email?: string;
  isWearableConnected?: boolean;
  archetypeId?: ArchetypeId;
  goalMode?: GoalMode;
  customSugarLimit?: number | null;
  isManualSugarOverride?: boolean;
};

const LIFESTYLE_ARCHETYPES: {
  id: ArchetypeId;
  title: string;
  factor: number;
  icon: string;
  desc: string;
}[] = [
  {
    id: 'desk',
    title: 'Office Worker',
    factor: 1.2,
    icon: '💻',
    desc: 'Mostly sitting.',
  },
  {
    id: 'field',
    title: 'Active Job',
    factor: 1.5,
    icon: '🚶',
    desc: 'Standing / walking.',
  },
  {
    id: 'heavy',
    title: 'Athlete / Labor',
    factor: 1.9,
    icon: '🏋️',
    desc: 'Physical exertion.',
  },
];

const GOAL_MODES: {
  id: GoalMode;
  name: string;
  ratio: number;
  icon: string;
  desc: string;
}[] = [
  {
    id: 'cut',
    name: 'Fat Loss',
    ratio: 0.05,
    icon: '🔥',
    desc: 'Deficit',
  },
  {
    id: 'maintain',
    name: 'Maintain',
    ratio: 0.1,
    icon: '⚖️',
    desc: 'Balance',
  },
  {
    id: 'bulk',
    name: 'Build Muscle',
    ratio: 0.15,
    icon: '💪',
    desc: 'Surplus',
  },
];

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userProfile,
  goal,
  currentLimit,
  isDarkMode,
  onToggleDarkMode,
  onUpdate,
  onBack,
  onLogout,
}) => {
  const profile = userProfile as SettingsUserProfile;

  const [activeTab, setActiveTab] = useState<
    'account' | 'identity' | 'engine' | 'mission'
  >('account');

  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // ─── Account ────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState(profile.email || '');
  const [isWearableConnected, setIsWearableConnected] = useState(
    profile.isWearableConnected || false
  );

  // ─── Identity ───────────────────────────────────────────────────────────────
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(String(profile.age || ''));
  const [height, setHeight] = useState(String(profile.height || ''));
  const [weight, setWeight] = useState(String(profile.weight || ''));
  const [gender, setGender] = useState<'male' | 'female'>(
    profile.gender || 'male'
  );

  // ─── Engine ─────────────────────────────────────────────────────────────────
  const [archetypeId, setArchetypeId] = useState<ArchetypeId>(
    profile.archetypeId || 'desk'
  );

  const [goalMode, setGoalMode] = useState<GoalMode>(
    profile.goalMode || 'maintain'
  );

  const [customSugarLimit, setCustomSugarLimit] = useState(
    String(profile.customSugarLimit ?? currentLimit)
  );

  const [isManualLimit, setIsManualLimit] = useState(
    profile.isManualSugarOverride ?? false
  );

  // ─── Mission ────────────────────────────────────────────────────────────────
  const [eventName, setEventName] = useState(goal.eventName || '');
  const [targetWeight, setTargetWeight] = useState(
    String(goal.targetWeight || '')
  );
  const [targetDate, setTargetDate] = useState(goal.targetDate || '');

  // Sync ulang ketika App.tsx sudah hydrate data dari DB.
  useEffect(() => {
    const nextProfile = userProfile as SettingsUserProfile;

    setEmail(nextProfile.email || '');
    setIsWearableConnected(nextProfile.isWearableConnected || false);

    setName(nextProfile.name || '');
    setAge(String(nextProfile.age || ''));
    setHeight(String(nextProfile.height || ''));
    setWeight(String(nextProfile.weight || ''));
    setGender(nextProfile.gender || 'male');

    setArchetypeId(nextProfile.archetypeId || 'desk');
    setGoalMode(nextProfile.goalMode || 'maintain');
    setCustomSugarLimit(String(nextProfile.customSugarLimit ?? currentLimit));
    setIsManualLimit(nextProfile.isManualSugarOverride ?? false);

    setEventName(goal.eventName || '');
    setTargetWeight(String(goal.targetWeight || ''));
    setTargetDate(goal.targetDate || '');
  }, [userProfile, goal, currentLimit]);

  const calculatedLimit = useMemo(() => {
    const manualLimit = parseInt(customSugarLimit, 10);

    if (isManualLimit) {
      return Number.isFinite(manualLimit) && manualLimit > 0
        ? manualLimit
        : currentLimit;
    }

    const parsedAge = parseInt(age, 10) || 30;
    const parsedHeight = parseInt(height, 10) || 170;
    const parsedWeight = parseInt(weight, 10) || 70;

    const genderOffset = gender === 'male' ? 5 : -161;
    const bmr =
      10 * parsedWeight + 6.25 * parsedHeight - 5 * parsedAge + genderOffset;

    const archetype =
      LIFESTYLE_ARCHETYPES.find(item => item.id === archetypeId) ||
      LIFESTYLE_ARCHETYPES[0];

    const goalObj =
      GOAL_MODES.find(item => item.id === goalMode) || GOAL_MODES[1];

    const tdee = bmr * archetype.factor;
    const sugarGrams = Math.round((tdee * goalObj.ratio) / 4);

    return Math.max(5, Math.min(100, sugarGrams));
  }, [
    age,
    height,
    weight,
    gender,
    archetypeId,
    goalMode,
    isManualLimit,
    customSugarLimit,
    currentLimit,
  ]);

  const handleSave = async () => {
    if (saveStatus === 'saving') return;

    setSaveStatus('saving');

    const parsedAge = parseInt(age, 10) || profile.age;
    const parsedHeight = parseInt(height, 10) || profile.height;
    const parsedWeight = parseInt(weight, 10) || profile.weight;
    const parsedTargetWeight = parseFloat(targetWeight) || goal.targetWeight;
    const parsedCustomLimit =
      parseInt(customSugarLimit, 10) || profile.customSugarLimit || currentLimit;

    const newProfile: SettingsUserProfile = {
      ...profile,
      name,
      email,
      isWearableConnected,
      age: parsedAge,
      height: parsedHeight,
      weight: parsedWeight,
      gender,
      archetypeId,
      goalMode,
      customSugarLimit: isManualLimit ? parsedCustomLimit : profile.customSugarLimit,
      isManualSugarOverride: isManualLimit,
    };

    const newGoal: GoalConfig = {
      ...goal,
      eventName,
      targetWeight: parsedTargetWeight,
      targetDate,
      currentWeight: parsedWeight,
    };

    // Local optimistic update. Data tetap baru dianggap permanen setelah request BE berhasil.
    onUpdate(newProfile, calculatedLimit, newGoal);

    try {
      const res = await api.updateUserSettings({
        name,
        gender,
        age: parsedAge,
        height: parsedHeight,
        weight: parsedWeight,

        archetypeId,
        goalMode,
        isManualSugarOverride: isManualLimit,
        customSugarLimit: isManualLimit ? parsedCustomLimit : undefined,

        eventName,
        targetWeight: parsedTargetWeight,
        targetDate,

        isWearableConnected,
      });

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-5 py-6 pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back
        </button>

        <h1 className="text-xl font-black tracking-tight">Settings</h1>

        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-60"
          aria-label="Save settings"
        >
          {saveStatus === 'saving' ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : saveStatus === 'saved' ? (
            <span className="text-sm font-black">✓</span>
          ) : saveStatus === 'error' ? (
            <span className="text-sm font-black">!</span>
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* THEME & QUICK ACTIONS */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={onToggleDarkMode}
          className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {isDarkMode ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-black">Theme</p>
              <p className="text-[10px] font-bold text-zinc-400">
                {isDarkMode ? 'Dark' : 'Light'}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setIsWearableConnected(prev => !prev)}
          className={`flex items-center justify-between p-4 rounded-2xl border active:scale-95 transition-all ${
            isWearableConnected
              ? 'bg-teal-50 border-teal-100 dark:bg-teal-900/20 dark:border-teal-800'
              : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black">Wearable</p>
              <p className="text-[10px] font-bold text-zinc-400">
                {isWearableConnected ? 'On' : 'Off'}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-1.5 rounded-2xl mb-5">
        {(['account', 'identity', 'engine', 'mission'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-black">Security & Auth</h3>
                <p className="text-xs text-zinc-400 font-bold">
                  Account identity from server
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 pl-10 text-zinc-500 dark:text-zinc-400 text-sm cursor-not-allowed"
                />
              </div>
              <p className="mt-2 text-[11px] font-bold text-zinc-400">
                Email diambil dari akun login dan tidak diedit dari halaman ini.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700">
              <div>
                <p className="text-sm font-black">Wearable Integration</p>
                <p className="text-xs text-zinc-400 font-bold">
                  Sync with Apple Health / Garmin
                </p>
              </div>

              <button
                onClick={() => setIsWearableConnected(prev => !prev)}
                className={`w-12 h-6 rounded-full relative transition-colors ${
                  isWearableConnected
                    ? 'bg-teal-500'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
                aria-label="Toggle wearable integration"
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    isWearableConnected ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* IDENTITY TAB */}
        {activeTab === 'identity' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                <User className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <h3 className="font-black">Agent Bio</h3>
                <p className="text-xs text-zinc-400 font-bold">
                  Saved only after pressing Save
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                Agent Codename
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                Gender
              </label>
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                <button
                  onClick={() => setGender('male')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    gender === 'male'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-400'
                  }`}
                >
                  Male
                </button>

                <button
                  onClick={() => setGender('female')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    gender === 'female'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-400'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ENGINE TAB */}
        {activeTab === 'engine' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-black">Metabolic Engine</h3>
                <p className="text-xs text-zinc-400 font-bold">
                  Activity and sugar target logic
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-400 mb-2 block">
                Base Activity Level
              </label>

              <div className="space-y-3">
                {LIFESTYLE_ARCHETYPES.map(arch => (
                  <button
                    key={arch.id}
                    onClick={() => setArchetypeId(arch.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                      archetypeId === arch.id
                        ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800'
                        : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-lg">
                      {arch.icon}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-black">{arch.title}</p>
                      <p className="text-xs font-bold text-zinc-400">
                        {arch.desc}
                      </p>
                    </div>

                    {archetypeId === arch.id && (
                      <div className="w-5 h-5 rounded-full bg-teal-500 text-white text-xs font-black flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-black">Manual Sugar Override</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                    Bypass auto-calculations
                  </p>
                </div>

                <button
                  onClick={() => setIsManualLimit(prev => !prev)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    isManualLimit
                      ? 'bg-rose-500'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                  aria-label="Toggle manual sugar override"
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                      isManualLimit ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {isManualLimit ? (
                <div className="flex flex-col items-center gap-3">
                  <input
                    type="number"
                    value={customSugarLimit}
                    onChange={e => setCustomSugarLimit(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 rounded-xl p-3 text-zinc-900 dark:text-white font-black text-center text-lg shadow-inner outline-none"
                  />
                  <span className="text-xs font-black uppercase text-zinc-400">
                    grams
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-black">{calculatedLimit}g</p>
                    <p className="text-xs font-bold text-zinc-400">
                      Optimized Daily Limit
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-rose-400" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* MISSION TAB */}
        {activeTab === 'mission' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-black">Active Operation</h3>
                <p className="text-xs text-zinc-400 font-bold">
                  Mission can be edited before saving
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-400 mb-2 block">
                Objective Strategy
              </label>

              <div className="grid grid-cols-1 gap-3">
                {GOAL_MODES.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setGoalMode(item.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      goalMode === item.id
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
                        : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-black">{item.name}</p>
                        <p className="text-xs font-bold text-zinc-400">
                          {item.desc}
                        </p>
                      </div>

                      {goalMode === item.id && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-black flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                Mission Codename
              </label>
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  value={targetWeight}
                  onChange={e => setTargetWeight(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-zinc-400 mb-1 block">
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl p-3 text-zinc-800 dark:text-zinc-100 text-sm focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SAVE STATUS */}
        {saveStatus === 'saved' && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-sm font-black">
            ✓ Settings Saved to Server
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-black">
            ⚠ Saved Locally — Sync Failed
          </div>
        )}

        {/* LOGOUT / DANGER ZONE */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 font-black text-sm active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Terminate Session
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;