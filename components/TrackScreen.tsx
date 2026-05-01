import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  getTrackData, logWeight as apiLogWeight,
  getTrackNotes, createTrackNote, deleteTrackNote,
  type TrackDataResponse, type TrackFieldNote,
} from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Scale, Activity, Zap, FlaskConical, Plus, Trash2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-lg ${className}`} />
);

// ─── Main Component ───────────────────────────────────────────────────────────

const TrackScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'body' | 'nutrition' | 'notes'>('body');

  // ── Track Data (body + nutrition) ─────────────────────────────────────────
  const [trackData, setTrackData] = useState<TrackDataResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const fetchTrackData = useCallback(async () => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      const data = await getTrackData();
      setTrackData(data);
    } catch (e: any) {
      setDataError(e?.message ?? 'Gagal memuat data tracking.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchTrackData(); }, [fetchTrackData]);

  // ── Weight Input ──────────────────────────────────────────────────────────
  const [newWeight, setNewWeight] = useState('');
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);

  const handleAddWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w || isNaN(w) || isLoggingWeight) return;
    setIsLoggingWeight(true);
    try {
      const res = await apiLogWeight(w);
      if (res.success && res.entry) {
        setNewWeight('');
        // Update local state optimistically
        setTrackData(prev => {
          if (!prev) return prev;
          const updated = [...prev.weightHistory];
          const idx = updated.findIndex(e => e.date === res.entry.date);
          if (idx >= 0) updated[idx] = res.entry;
          else updated.push(res.entry);
          return {
            ...prev,
            weightHistory: updated,
            goal: { ...prev.goal, currentWeight: res.entry.weight },
          };
        });
      }
    } catch (e: any) {
      alert(e?.message ?? 'Gagal menyimpan berat badan.');
    } finally {
      setIsLoggingWeight(false);
    }
  };

  // ── Notes ─────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<TrackFieldNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const fetchNotes = useCallback(async () => {
    setIsLoadingNotes(true);
    setNotesError(null);
    try {
      const res = await getTrackNotes();
      setNotes(res.notes);
    } catch (e: any) {
      setNotesError(e?.message ?? 'Gagal memuat catatan.');
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  // Fetch notes hanya saat tab notes dibuka
  useEffect(() => {
    if (activeTab === 'notes') fetchNotes();
  }, [activeTab, fetchNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim() || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const res = await createTrackNote(newNote.trim());
      if (res.success) {
        setNotes(prev => [res.note, ...prev]);
        setNewNote('');
      }
    } catch (e: any) {
      alert(e?.message ?? 'Gagal menyimpan catatan.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteTrackNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'Gagal menghapus catatan.');
    }
  };

  // ── Weight chart data ─────────────────────────────────────────────────────
  const weightChartData = useMemo(() => {
    if (!trackData) return [];
    return trackData.weightHistory.map(entry => ({
      date: new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: entry.weight,
    }));
  }, [trackData]);

  // ── Loading / Error state (body + nutrition) ──────────────────────────────
  const renderBodySkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
    </div>
  );

  const renderNutritionSkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
      <Skeleton className="h-36 w-full rounded-3xl" />
    </div>
  );

  const renderError = (msg: string, onRetry: () => void) => (
    <div className="flex flex-col items-center gap-4 py-16">
      <AlertTriangle className="w-10 h-10 text-rose-400" />
      <p className="text-zinc-500 text-sm text-center max-w-xs">{msg}</p>
      <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-full text-sm font-bold">
        <RefreshCw className="w-4 h-4" /> Coba Lagi
      </button>
    </div>
  );

  // ── Macros display ─────────────────────────────────────────────────────────
  const macroData = trackData ? [
    { name: 'Protein', value: trackData.todayMacros.protein, color: '#3b82f6' },
    { name: 'Carbs',   value: trackData.todayMacros.carbs,   color: '#f59e0b' },
    { name: 'Fat',     value: trackData.todayMacros.fat,     color: '#ef4444' },
  ] : [];

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      {/* --- HEADER TABS --- */}
      <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {(['body', 'nutrition', 'notes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-zinc-800 text-brand-600 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* --- BODY TAB --- */}
      {activeTab === 'body' && (
        isLoadingData ? renderBodySkeleton() :
        dataError ? renderError(dataError, fetchTrackData) :
        trackData ? (
          <div className="space-y-6">
            {/* Mission Card */}
            <div className="bg-brand-500 dark:bg-zinc-900 text-white rounded-3xl p-6 border border-brand-400 dark:border-zinc-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Scale className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="text-white/80 dark:text-brand-500 font-bold text-xs uppercase tracking-widest mb-1">Active Mission</div>
                <h2 className="text-2xl font-black uppercase mb-4">{trackData.goal.eventName}</h2>

                <div className="flex justify-between items-end mb-6">
                  <div>
                    <div className="text-4xl font-black">{trackData.goal.currentWeight}<span className="text-lg text-white/50 dark:text-zinc-500">kg</span></div>
                    <div className="text-[10px] text-white/50 dark:text-zinc-500 uppercase">Current Weight</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white dark:text-brand-500">
                      {Math.abs(trackData.goal.currentWeight - trackData.goal.targetWeight).toFixed(1)}kg
                    </div>
                    <div className="text-[10px] text-white/50 dark:text-zinc-500 uppercase">To Target</div>
                  </div>
                </div>

                {/* Quick Log Input */}
                <div className="flex gap-2 bg-white/10 dark:bg-black/30 p-2 rounded-xl border border-white/20 dark:border-zinc-800">
                  <input
                    type="number"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="Update Weight (kg)..."
                    className="flex-1 bg-transparent border-none text-white text-sm placeholder-white/40 dark:placeholder-zinc-600 focus:ring-0"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWeight()}
                  />
                  <button
                    onClick={handleAddWeight}
                    disabled={isLoggingWeight}
                    className="bg-white dark:bg-brand-600 text-brand-600 dark:text-white hover:bg-zinc-100 dark:hover:bg-brand-500 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    {isLoggingWeight ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log'}
                  </button>
                </div>
              </div>
            </div>

            {/* Weight Chart */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm h-64">
              <h3 className="text-sm font-bold uppercase text-zinc-500 mb-4">Weight Trajectory</h3>
              {weightChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightChartData}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#33ADAE" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#33ADAE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Area type="monotone" dataKey="weight" stroke="#33ADAE" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                  Log lebih banyak berat badan untuk melihat tren.
                </div>
              )}
            </div>
          </div>
        ) : null
      )}

      {/* --- NUTRITION TAB --- */}
      {activeTab === 'nutrition' && (
        isLoadingData ? renderNutritionSkeleton() :
        dataError ? renderError(dataError, fetchTrackData) :
        trackData ? (
          <div className="space-y-6">
            {/* Sugar Timeline */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm h-64">
              <h3 className="text-sm font-bold uppercase text-zinc-500 mb-4">Sugar Consumption (7 Days)</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trackData.sugarLast7Days}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="sugar" radius={[4, 4, 0, 0]}>
                    {trackData.sugarLast7Days.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.sugar > trackData.sugarLimit ? '#ef4444' : '#33ADAE'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Macros & Calories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calories */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase text-zinc-500">Calories</h3>
                  <Zap className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-zinc-900 dark:text-white">{trackData.todayMacros.calories}</span>
                  <span className="text-xs text-zinc-400 mb-1">/ {trackData.calorieTarget} kcal</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${Math.min((trackData.todayMacros.calories / trackData.calorieTarget) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Macros */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-sm font-bold uppercase text-zinc-500 mb-4">Macros</h3>
                <div className="flex gap-2 h-24 items-end">
                  {macroData.map((macro, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-lg relative overflow-hidden" style={{ height: '100%' }}>
                        <div
                          className="absolute bottom-0 w-full transition-all duration-500"
                          style={{ height: `${Math.min((macro.value / 150) * 100, 100)}%`, backgroundColor: macro.color }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500">{macro.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Vitamin Intake */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold uppercase text-zinc-500">Specific Nutrients</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {trackData.todayMacros.vitamins.length > 0 ? (
                  trackData.todayMacros.vitamins.map((vit, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{vit.name}</span>
                      <span className="text-xs font-mono text-brand-600">{vit.amount}</span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-xs text-zinc-400 py-4">No vitamin data recorded today.</div>
                )}
              </div>
            </div>
          </div>
        ) : null
      )}

      {/* --- NOTES TAB --- */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-bold uppercase text-zinc-500 mb-4">Field Notes</h3>

            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a new observation..."
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={isSavingNote}
                className="bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSavingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>

            {isLoadingNotes ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : notesError ? (
              renderError(notesError, fetchNotes)
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-start group">
                    <div>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 mb-1">{note.text}</p>
                      <span className="text-[10px] text-zinc-400 uppercase">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="text-center text-zinc-400 text-sm py-8">No notes recorded.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default TrackScreen;
