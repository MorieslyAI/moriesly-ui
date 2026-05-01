import React, { useState, useEffect, useCallback } from 'react';
import { getUserStatus, type UserStatusResponse, type UserStatusAlert } from '../services/api';
import { Trophy, Flame, Target, Activity, TrendingUp, AlertTriangle, Info, RefreshCw, Loader2 } from 'lucide-react';

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-lg ${className}`} />
);

// ─── Alert Card ───────────────────────────────────────────────────────────────

const AlertCard: React.FC<{ alert: UserStatusAlert }> = ({ alert }) => {
  const styles = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-900/10',
      border: 'border-rose-100 dark:border-rose-900/20',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />,
      titleColor: 'text-rose-700 dark:text-rose-400',
      textColor: 'text-rose-600/80 dark:text-rose-500/80',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/10',
      border: 'border-amber-100 dark:border-amber-900/20',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
      titleColor: 'text-amber-700 dark:text-amber-400',
      textColor: 'text-amber-600/80 dark:text-amber-500/80',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      border: 'border-blue-100 dark:border-blue-900/20',
      icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
      titleColor: 'text-blue-700 dark:text-blue-400',
      textColor: 'text-blue-600/80 dark:text-blue-500/80',
    },
  };
  const s = styles[alert.type] ?? styles.info;

  return (
    <div className={`flex items-start gap-3 p-3 ${s.bg} rounded-xl border ${s.border}`}>
      {s.icon}
      <div>
        <div className={`text-sm font-bold ${s.titleColor}`}>{alert.title}</div>
        <div className={`text-xs mt-1 ${s.textColor}`}>{alert.message}</div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StatusScreen: React.FC = () => {
  const [status, setStatus] = useState<UserStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserStatus();
      setStatus(data);
    } catch (e: any) {
      setError(e?.message ?? 'Gagal memuat data status.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ── Loading State ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="pb-24 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────

  if (error || !status) {
    return (
      <div className="pb-24 flex flex-col items-center justify-center gap-4 py-20 animate-in fade-in duration-300">
        <AlertTriangle className="w-12 h-12 text-rose-400" />
        <p className="text-zinc-500 text-sm text-center max-w-xs">{error ?? 'Data tidak tersedia.'}</p>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-full text-sm font-bold shadow hover:bg-brand-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
      </div>
    );
  }

  const xpPercent = Math.round((status.currentXp / status.nextLevelXp) * 100);

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Agent Status</h1>
          <p className="text-zinc-500 text-sm">Operational Overview</p>
        </div>
        <div className="bg-brand-500/10 text-brand-600 px-3 py-1 rounded-full text-xs font-bold border border-brand-500/20">
          Level {status.level}
        </div>
      </div>

      {/* --- MAIN ID CARD --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>

        <div className="relative z-10 flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow-sm overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${status.name}`} alt="Avatar" className="w-full h-full" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{status.name}</h2>
            <div className="text-brand-600 font-bold text-xs uppercase tracking-wider mb-2">{status.rankTitle}</div>
            <div className="flex gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                <span>{status.currentXp} / {status.nextLevelXp} XP</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>{status.streak} Day Streak</span>
              </div>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
            <span>Progress to Level {status.level + 1}</span>
            <span>{xpPercent}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-1000"
              style={{ width: `${xpPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* --- PERFORMANCE METRICS --- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Performance</span>
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white">{status.performanceScore}</div>
          <div className="text-[10px] text-zinc-400">Operational Score</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Target className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Accuracy</span>
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white">{status.dietAdherence}%</div>
          <div className="text-[10px] text-zinc-400">Diet Adherence</div>
        </div>
      </div>

      {/* --- RECENT ALERTS --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-sm font-bold uppercase text-zinc-500 mb-4">Recent Alerts</h3>
        <div className="space-y-4">
          {status.activeAlerts.length > 0
            ? status.activeAlerts.map((alert, i) => <AlertCard key={i} alert={alert} />)
            : (
              <div className="text-center py-4 text-zinc-400 text-sm">
                No active alerts. Systems nominal.
              </div>
            )
          }
        </div>
      </div>

      {/* --- MISSION SUMMARY --- */}
      <div className="bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-500" />
          <h3 className="text-sm font-bold uppercase text-zinc-500 dark:text-zinc-400">Mission Trajectory</h3>
        </div>
        <div className="space-y-4">
          {status.weight !== null && (
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Current Weight</span>
              <span className="font-mono font-bold">{status.weight} kg</span>
            </div>
          )}
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Calorie Target</span>
            <span className="font-mono font-bold">{status.targetCalories.toLocaleString()} kcal</span>
          </div>
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Consumed Today</span>
            <span className="font-mono font-bold">{status.caloriesConsumedToday.toLocaleString()} kcal</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Next Evaluation</span>
            <span className="font-mono font-bold text-brand-500">{status.nextEvaluation}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatusScreen;


