import React from 'react';
import { UserProfile, LedgerState, HistoryItem } from '../types';
import { Trophy, Flame, Target, Calendar, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

interface StatusScreenProps {
  userStats: UserProfile;
  ledger: LedgerState;
  history: HistoryItem[];
}

const StatusScreen: React.FC<StatusScreenProps> = ({ userStats, ledger, history }) => {
  // Calculate some derived stats
  const sugarTotal = history.reduce((acc, item) => acc + item.sugarg, 0);
  const averageSugar = history.length > 0 ? Math.round(sugarTotal / history.length) : 0;
  const daysActive = userStats.streak || 1;
  
  // Mock data for "Agent Performance"
  const performanceScore = Math.min(100, Math.max(0, 100 - (averageSugar * 2) + (userStats.level * 5)));

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Agent Status</h1>
          <p className="text-zinc-500 text-sm">Operational Overview</p>
        </div>
        <div className="bg-brand-500/10 text-brand-600 px-3 py-1 rounded-full text-xs font-bold border border-brand-500/20">
          Level {userStats.level}
        </div>
      </div>

      {/* --- MAIN ID CARD --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-700 shadow-sm overflow-hidden">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userStats.name}`} alt="Avatar" className="w-full h-full" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{userStats.name}</h2>
            <div className="text-brand-600 font-bold text-xs uppercase tracking-wider mb-2">{userStats.rankTitle}</div>
            
            <div className="flex gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                <span>{userStats.currentXp} / {userStats.nextLevelXp} XP</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>{userStats.streak} Day Streak</span>
              </div>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-[10px] text-zinc-400 uppercase mb-1">
            <span>Progress to Level {userStats.level + 1}</span>
            <span>{Math.round((userStats.currentXp / userStats.nextLevelXp) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-500 rounded-full transition-all duration-1000"
              style={{ width: `${(userStats.currentXp / userStats.nextLevelXp) * 100}%` }}
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
          <div className="text-3xl font-black text-zinc-900 dark:text-white">{performanceScore}</div>
          <div className="text-[10px] text-zinc-400">Operational Score</div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-zinc-500">
            <Target className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Accuracy</span>
          </div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white">94%</div>
          <div className="text-[10px] text-zinc-400">Diet Adherence</div>
        </div>
      </div>

      {/* --- RECENT ALERTS --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <h3 className="text-sm font-bold uppercase text-zinc-500 mb-4">Recent Alerts</h3>
        <div className="space-y-4">
          {ledger.sugarDebt > 0 && (
            <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/20">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <div className="text-sm font-bold text-rose-700 dark:text-rose-400">Sugar Debt Active</div>
                <div className="text-xs text-rose-600/80 dark:text-rose-500/80 mt-1">
                  You have accumulated {Math.round(ledger.sugarDebt * 10) / 10}g of sugar debt. Burn it off to restore full operational status.
                </div>
              </div>
            </div>
          )}
          
          {userStats.medicalConditions && userStats.medicalConditions.length > 0 && (
             <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
              <Activity className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-400">Medical Monitoring</div>
                <div className="text-xs text-blue-600/80 dark:text-blue-500/80 mt-1">
                  Active monitoring for: {userStats.medicalConditions.join(', ')}.
                </div>
              </div>
            </div>
          )}

          {(!ledger.sugarDebt && (!userStats.medicalConditions || userStats.medicalConditions.length === 0)) && (
             <div className="text-center py-4 text-zinc-400 text-sm">
               No active alerts. Systems nominal.
             </div>
          )}
        </div>
      </div>

      {/* --- MISSION SUMMARY --- */}
      <div className="bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand-500" />
          <h3 className="text-sm font-bold uppercase text-zinc-500 dark:text-zinc-400">Mission Trajectory</h3>
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Current Weight</span>
            <span className="font-mono font-bold">{userStats.weight} kg</span>
          </div>
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Daily Calorie Avg</span>
            <span className="font-mono font-bold">~2,100 kcal</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Next Evaluation</span>
            <span className="font-mono font-bold text-brand-500">In 7 Days</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatusScreen;
