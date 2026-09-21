import React, { useState, useMemo, useEffect } from "react";
import {
  Flame,
  Zap,
  Brain,
  Activity,
  Plus,
  ChevronLeft,
  Award,
  TrendingUp,
  User,
  Settings,
} from "lucide-react";
import {
  UserProfile,
  HistoryItem,
  DietPlan,
  OperationPlan,
  SkinAnalysis,
  ConsultationSession,
  LedgerState,
} from "../types";
import AgentAvatar from "./AgentAvatar";
import OrganMap from "./OrganMap";
import * as api from "../services/api";
import { getLocalDateString } from "../utils";

interface UnifiedProfileDashboardProps {
  userProfile: UserProfile;
  history: HistoryItem[];
  dietPlan: DietPlan | null;
  trainingPlan: OperationPlan | null;
  skinResult: SkinAnalysis | null;
  consultationHistory: ConsultationSession[];
  ledger: LedgerState;
  onBack: () => void;
  onSettings: () => void;
}

const UnifiedProfileDashboard: React.FC<UnifiedProfileDashboardProps> = ({
  userProfile,
  history,
  dietPlan,
  trainingPlan,
  skinResult,
  consultationHistory,
  ledger,
  onBack,
  onSettings,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  // Hasil Bio-Synergy dari server (persisten; server yang menegakkan limit 1x/24 jam).
  const [bio, setBio] = useState<api.BioSynergyStatus | null>(null);
  const [bioLoading, setBioLoading] = useState(true);
  const [bioError, setBioError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<
    "overview" | "body" | "analysis" | "data"
  >("overview");

  // --- STATS CALCULATION ---
  const bmi = useMemo(() => {
    const hM = userProfile.height / 100;
    return (userProfile.weight / (hM * hM)).toFixed(1);
  }, [userProfile]);

  const totalSugar = useMemo(
    () =>
      history.reduce(
        (acc, h) => acc + (h.action === "consumed" ? h.sugarg : 0),
        0,
      ),
    [history],
  );
  const totalScans = history.length;

  // Calculate a simplified "Health Score" based on available data
  const healthScore = useMemo(() => {
    let score = 70; // Base
    if (ledger.consumed > ledger.limit) score -= 10;
    if (dietPlan) score += 5;
    if (trainingPlan) score += 5;
    if (skinResult && skinResult.glycationLevel === "Low") score += 10;
    if (skinResult && skinResult.glycationLevel === "Critical") score -= 10;
    if (userProfile.streak > 5) score += 10;
    return Math.min(100, Math.max(0, score));
  }, [ledger, dietPlan, trainingPlan, skinResult, userProfile]);

  // --- BIO-SYNERGY (server-side, 1x / 24 jam / user) ---
  // Muat hasil terakhir saat halaman dibuka → analisis tidak hilang saat refresh
  // atau pindah halaman selama belum waktunya generate ulang.
  useEffect(() => {
    let cancelled = false;
    api
      .getBioSynergy()
      .then((res) => {
        if (!cancelled) setBio(res);
      })
      .catch((e: Error) => {
        if (!cancelled) setBioError(e.message);
      })
      .finally(() => {
        if (!cancelled) setBioLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tick tiap detik hanya selama masih dalam cooldown (untuk hitung mundur).
  const nextAtMs = bio?.nextAvailableAt
    ? new Date(bio.nextAvailableAt).getTime()
    : null;
  const isLocked = nextAtMs !== null && nextAtMs > nowMs;
  useEffect(() => {
    if (nextAtMs === null) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [nextAtMs]);

  const formatCountdown = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const generateBioSynergyReport = async () => {
    if (isGenerating || isLocked) return;
    setIsGenerating(true);
    setBioError(null);
    try {
      const res = await api.generateBioSynergy(getLocalDateString());
      setBio(res);
      setActiveTab("analysis");
    } catch (e: any) {
      if (e?.code === "BIO_SYNERGY_COOLDOWN" || e?.code === "BIO_SYNERGY_IN_PROGRESS") {
        // Sudah dijalankan (mis. dari perangkat lain / double-tap) → sinkronkan
        // dengan server agar hasil terakhir + hitung mundur tampil.
        try {
          setBio(await api.getBioSynergy());
        } catch {
          /* abaikan; pesan error di bawah cukup */
        }
      }
      setBioError(e?.message || "Synthesis failed. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 animate-in fade-in duration-500 overflow-x-hidden font-sans text-zinc-900 dark:text-zinc-100">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white dark:bg-zinc-900/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 flex justify-between items-center shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 transition-colors group"
        >
          <div className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold tracking-wide">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onSettings}
            className="p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-2 h-2 bg-[#33ADAE] rounded-full animate-pulse shadow-[0_0_8px_#33ADAE]"></div>
          <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
            Profile
          </span>
        </div>
      </div>

      <div className="p-4 md:p-4 lg:p-4 space-y-8 max-w-[2000px] mx-auto">
        {/* 1. IDENTITY CARD - Sleek White Design */}
        <div className="bg-white dark:bg-zinc-900 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-xl shadow-zinc-200/50 dark:shadow-black/30 border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-teal-50 to-transparent rounded-full -mr-20 -mt-20 opacity-60 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
            <div className="relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-br from-[#33ADAE] to-[#1F6E6C] shadow-lg shadow-teal-900/10">
                <div className="w-full h-full rounded-full bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
                  <AgentAvatar volume={15} isActive={true} />
                </div>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md whitespace-nowrap flex items-center gap-1.5">
                <Award className="w-3 h-3 text-[#33ADAE]" />
                {userProfile.rankTitle}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left w-full">
              <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight mb-2">
                {userProfile.name}
              </h1>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-8">
                <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                  LVL {userProfile.level}
                </div>
                <div className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                  EXP {userProfile.currentXp}
                </div>
                {userProfile.medicalConditions?.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full text-xs font-bold border border-rose-100 dark:border-rose-900/30 uppercase"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-8">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    BMI Score
                  </div>
                  <div className="text-xl md:text-2xl font-black text-zinc-800 dark:text-zinc-200">
                    {bmi}
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    Active Streak
                  </div>
                  <div className="text-xl md:text-2xl font-black text-[#33ADAE]">
                    {userProfile.streak}{" "}
                    <span className="text-sm text-zinc-400 font-bold">
                      days
                    </span>
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700 flex sm:flex-col justify-between sm:justify-start items-center sm:items-start">
                  <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    Health Index
                  </div>
                  <div
                    className={`text-xl md:text-2xl font-black ${healthScore > 80 ? "text-emerald-500" : healthScore > 50 ? "text-amber-500" : "text-rose-500"}`}
                  >
                    {healthScore}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABS - Compact Pill Design */}
        <div className="flex justify-center sticky top-[57px] z-40 py-3 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-md">
          <div className="inline-flex w-fit items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            {(["overview", "body", "analysis", "data"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                    px-4 md:px-5
                    py-2
                    rounded-xl
                    text-[10px] md:text-xs
                    font-black
                    uppercase
                    tracking-[0.12em]
                    transition-all
                    whitespace-nowrap
                    ${
                      activeTab === tab
                        ? "bg-zinc-900 text-white shadow-md"
                        : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }
                  `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            {/* Body Status Card (NEW) */}
            <div
              onClick={() => setActiveTab("body")}
              className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group relative overflow-hidden cursor-pointer md:col-span-2"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-900/10 rounded-bl-[5rem] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="flex flex-col md:flex-row gap-6 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-xl">
                      🫀
                    </div>
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                      Biological Integrity
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs text-zinc-400 font-bold uppercase mb-1">
                          Metabolic Load
                        </div>
                        <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                          {ledger.calories || 0}{" "}
                          <span className="text-sm text-zinc-400 font-bold uppercase">
                            kcal
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-zinc-400 font-bold uppercase mb-1">
                          Vulnerability
                        </div>
                        <div
                          className={`text-lg font-black ${healthScore < 60 ? "text-rose-500" : healthScore < 85 ? "text-amber-500" : "text-emerald-500"}`}
                        >
                          {healthScore < 60
                            ? "CRITICAL"
                            : healthScore < 85
                              ? "WARNING"
                              : "STABLE"}
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${healthScore < 60 ? "bg-rose-500" : healthScore < 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${healthScore}%` }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700">
                        <div className="text-[8px] text-zinc-400 uppercase font-bold">
                          Sugar
                        </div>
                        <div
                          className={`text-xs font-black ${ledger.consumed > ledger.limit ? "text-rose-500" : "text-zinc-700"}`}
                        >
                          {ledger.consumed}g
                        </div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700">
                        <div className="text-[8px] text-zinc-400 uppercase font-bold">
                          Fat
                        </div>
                        <div
                          className={`text-xs font-black ${ledger.macros?.fat > 70 ? "text-rose-500" : "text-zinc-700"}`}
                        >
                          {ledger.macros?.fat || 0}g
                        </div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700">
                        <div className="text-[8px] text-zinc-400 uppercase font-bold">
                          Protein
                        </div>
                        <div className="text-xs font-black text-zinc-700">
                          {ledger.macros?.protein || 0}g
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {healthScore < 60
                        ? "CRITICAL: Your system is experiencing high metabolic stress. Multiple organs are operating outside safe parameters."
                        : healthScore < 85
                          ? "WARNING: Elevated nutrient load detected. System is working overtime to maintain homeostasis."
                          : "Metabolic homeostasis maintained. Organs are operating within optimal parameters."}
                    </p>
                  </div>
                </div>
                <div className="w-full md:w-48 h-64 md:h-48 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 flex items-center justify-center overflow-hidden relative">
                  <OrganMap ledger={ledger} type="food" compact={true} />
                  <div className="absolute inset-0 bg-transparent"></div>{" "}
                  {/* Overlay to prevent interaction in preview */}
                </div>
              </div>
            </div>

            {/* Nutrition Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 dark:bg-teal-900/10 rounded-bl-[4rem] -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-xl">
                  🥗
                </div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  Nutrition Protocol
                </h3>
              </div>
              {dietPlan ? (
                <div className="relative z-10">
                  <div className="text-lg font-bold text-teal-600 mb-2">
                    {dietPlan.target}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {dietPlan.summary}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 italic relative z-10">
                  No active diet protocol initialized.
                </div>
              )}
            </div>

            {/* Training Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-900/10 rounded-bl-[4rem] -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-xl">
                  ⚡
                </div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  Training Regimen
                </h3>
              </div>
              {trainingPlan ? (
                <div className="relative z-10">
                  <div className="text-lg font-bold text-orange-500 mb-2">
                    {trainingPlan.codename}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Target Burn:{" "}
                    <span className="font-bold text-zinc-700">
                      ~{trainingPlan.totalCaloriesBurn} kcal
                    </span>
                  </p>
                </div>
              ) : (
                <div className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 italic relative z-10">
                  No active operations.
                </div>
              )}
            </div>

            {/* Biological Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 dark:bg-purple-900/10 rounded-bl-[4rem] -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-xl">
                  🧬
                </div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  Bio-Metrics
                </h3>
              </div>
              {skinResult ? (
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-purple-600">
                      Age {skinResult.biologicalAge}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${skinResult.glycationLevel === "Critical" ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30 text-rose-600" : "bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/30 text-teal-600"}`}
                    >
                      {skinResult.glycationLevel}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {skinResult.detectedIssues.join(", ")}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 italic relative z-10">
                  Bio-scan data unavailable.
                </div>
              )}
            </div>

            {/* Consultation Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-bl-[4rem] -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl">
                  💬
                </div>
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                  Latest Intel
                </h3>
              </div>
              {consultationHistory.length > 0 ? (
                <div className="relative z-10">
                  <div className="text-sm text-zinc-600 dark:text-zinc-300 italic mb-3 line-clamp-2 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700">
                    "{consultationHistory[0].summary}"
                  </div>
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    {new Date(consultationHistory[0].date).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-400 italic relative z-10">
                  No logs found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENT: BODY IMPACT */}
        {activeTab === "body" && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 flex flex-col h-full min-h-[calc(100vh-200px)]">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-4 md:p-10 border border-zinc-100 dark:border-zinc-800 shadow-2xl shadow-zinc-200/50 dark:shadow-black/40 flex flex-col flex-1 overflow-hidden relative">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-teal-50/30 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shrink-0 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                      Metabolic Impact Map
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    Real-time biological response to your current systemic load.
                  </p>
                </div>
                <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3 rounded-3xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Systemic Load
                    </div>

                    <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">
                      {ledger.calories || 0}{" "}
                      <span className="text-xs text-zinc-400">kcal</span>
                    </div>
                  </div>

                  <div className="mx-4 h-10 w-px bg-zinc-200 dark:bg-zinc-700" />

                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Integrity
                    </div>

                    <div
                      className={`text-sm font-black uppercase tracking-wider leading-none ${
                        healthScore < 60
                          ? "text-rose-600"
                          : healthScore < 85
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {healthScore < 60
                        ? "CRITICAL"
                        : healthScore < 85
                          ? "WARNING"
                          : "OPTIMAL"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[600px] relative z-10">
                <OrganMap
                  ledger={ledger}
                  type="food"
                  impactData={
                    history.find(
                      (h) =>
                        h.action === "consumed" && h.metadata?.organ_impact,
                    )?.metadata?.organ_impact
                  }
                />
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0 relative z-10">
                <div
                  className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${ledger.consumed > 40 ? "bg-rose-50 border-rose-100 shadow-rose-100/50 shadow-lg" : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700"}`}
                >
                  <div
                    className={`p-3 rounded-xl ${ledger.consumed > 40 ? "bg-rose-100 text-rose-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}
                  >
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Inflammation
                    </div>
                    <div
                      className={`text-sm font-black ${ledger.consumed > 40 ? "text-rose-600" : "text-zinc-900 dark:text-zinc-100"}`}
                    >
                      {ledger.consumed > 40 ? "HIGH" : "LOW"}
                    </div>
                  </div>
                </div>
                <div
                  className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${ledger.consumed > 25 ? "bg-amber-50 border-amber-100 shadow-amber-100/50 shadow-lg" : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700"}`}
                >
                  <div
                    className={`p-3 rounded-xl ${ledger.consumed > 25 ? "bg-amber-100 text-amber-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}
                  >
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Stability
                    </div>
                    <div
                      className={`text-sm font-black ${ledger.consumed > 25 ? "text-amber-600" : "text-zinc-900 dark:text-zinc-100"}`}
                    >
                      {ledger.consumed > 25 ? "VOLATILE" : "STABLE"}
                    </div>
                  </div>
                </div>
                <div
                  className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${userProfile.streak > 3 ? "bg-emerald-50 border-emerald-100 shadow-emerald-100/50 shadow-lg" : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700"}`}
                >
                  <div
                    className={`p-3 rounded-xl ${userProfile.streak > 3 ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"}`}
                  >
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Recovery
                    </div>
                    <div
                      className={`text-sm font-black ${userProfile.streak > 3 ? "text-emerald-600" : "text-zinc-900 dark:text-zinc-100"}`}
                    >
                      {userProfile.streak > 3 ? "OPTIMAL" : "ADAPTING"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT: ANALYSIS */}
        {activeTab === "analysis" && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
            {bioLoading ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-700 border-dashed shadow-sm">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                  Loading Bio-Report...
                </p>
              </div>
            ) : !bio?.report ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-700 border-dashed shadow-sm">
                <div className="mb-6 inline-flex p-4 rounded-full bg-zinc-50 dark:bg-zinc-800 animate-pulse">
                  <Brain className="w-12 h-12 text-zinc-300" />
                </div>
                <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-lg mb-2">
                  Synthesize Bio-Data?
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                  Moriesly AI will cross-reference your diet, training, and scan
                  history to generate a unified strategy. Available once every
                  24 hours.
                </p>
                <button
                  onClick={generateBioSynergyReport}
                  disabled={isGenerating || isLocked}
                  className="bg-[#33ADAE] text-white px-8 py-4 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#2A9192] transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 active:scale-95"
                >
                  {isGenerating
                    ? "Computing Synergy..."
                    : "Run Bio-Synergy Engine"}
                </button>
                {bioError && (
                  <p className="mt-4 text-xs font-medium text-rose-500">
                    {bioError}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 md:p-8 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-black/30">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                      <Brain className="w-6 h-6 text-[#33ADAE]" />
                    </div>
                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                      Executive Bio-Report
                    </h3>
                  </div>
                  {isLocked ? (
                    <div className="text-right shrink-0">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                        Next run in
                      </div>
                      <div className="text-xs font-mono font-black text-zinc-500 dark:text-zinc-300">
                        {formatCountdown((nextAtMs ?? 0) - nowMs)}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateBioSynergyReport}
                      disabled={isGenerating}
                      className="shrink-0 text-[#33ADAE] text-xs font-bold hover:text-[#2A9192] transition-colors uppercase tracking-wider disabled:opacity-50"
                    >
                      {isGenerating ? "Computing..." : "Re-run"}
                    </button>
                  )}
                </div>
                <div className="prose prose-sm prose-zinc max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {bio.report.text}
                  </div>
                </div>
                {bioError && (
                  <p className="mt-4 text-xs font-medium text-rose-500">
                    {bioError}
                  </p>
                )}
                <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest bg-zinc-50 dark:bg-zinc-800 px-2 py-1 rounded">
                    AI MODEL: {bio.report.model.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {new Date(bio.report.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENT: DATA (Raw Stats) */}
        {activeTab === "data" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 md:p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  Total Sugar
                </span>
                <span className="text-xl md:text-2xl font-black text-rose-500">
                  {totalSugar}g
                </span>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 md:p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  Items Scanned
                </span>
                <span className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {totalScans}
                </span>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 md:p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  Sugar Debt
                </span>
                <span className="text-xl md:text-2xl font-black text-amber-500">
                  {ledger.sugarDebt}g
                </span>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 md:p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
                  Willpower
                </span>
                <span className="text-xl md:text-2xl font-black text-[#33ADAE]">
                  {ledger.willpower}%
                </span>
              </div>
            </div>

            {/* NEW STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calories Card */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-6">
                  <Flame className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                  <span className="text-xs font-bold text-zinc-400 tracking-widest uppercase">
                    CALORIES
                  </span>
                </div>
                <div className="text-sm font-bold text-emerald-600 mb-1">
                  Safe Zone
                </div>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {ledger.calories || 0}
                  </span>
                  <span className="text-sm text-zinc-400 font-medium">
                    / 2,100
                  </span>
                </div>
                <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(((ledger.calories || 0) / 2100) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="text-xs text-zinc-400 text-right font-medium">
                  {Math.round((2100 - (ledger.calories || 0)) * 10) / 10} kcal
                  left
                </div>
              </div>

              {/* Macros Card */}
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-center">
                <span className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-8 w-full text-center">
                  MACROS DISTRIBUTION
                </span>
                <div className="flex items-end justify-center gap-4 h-32 w-full mb-4">
                  {/* Protein */}
                  <div className="flex flex-col items-center gap-3 h-full justify-end w-1/3 group">
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl relative overflow-hidden h-full">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-xl transition-all duration-1000 group-hover:bg-blue-400"
                        style={{
                          height: `${Math.min(((ledger.macros?.protein || 0) / 50) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Protein
                    </span>
                  </div>
                  {/* Carbs */}
                  <div className="flex flex-col items-center gap-3 h-full justify-end w-1/3 group">
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl relative overflow-hidden h-full">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-orange-500 rounded-xl transition-all duration-1000 group-hover:bg-orange-400"
                        style={{
                          height: `${Math.min(((ledger.macros?.carbs || 0) / 300) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Carbs
                    </span>
                  </div>
                  {/* Fat */}
                  <div className="flex flex-col items-center gap-3 h-full justify-end w-1/3 group">
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl relative overflow-hidden h-full">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-rose-500 rounded-xl transition-all duration-1000 group-hover:bg-rose-400"
                        style={{
                          height: `${Math.min(((ledger.macros?.fat || 0) / 70) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Fat
                    </span>
                  </div>
                </div>
                <div className="flex justify-between w-full px-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <span className="text-xs font-black text-blue-500">
                    {ledger.macros?.protein || 0}g
                  </span>
                  <span className="text-xs font-black text-orange-500">
                    {ledger.macros?.carbs || 0}g
                  </span>
                  <span className="text-xs font-black text-rose-500">
                    {ledger.macros?.fat || 0}g
                  </span>
                </div>
              </div>
            </div>

            {/* Vitamins Section */}
            {ledger.vitamins && ledger.vitamins.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 dark:text-zinc-400">
                    Micronutrients
                  </h4>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                    {ledger.vitamins.length} Detected
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {ledger.vitamins.map((v, i) => (
                    <div
                      key={i}
                      className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl flex items-center gap-2 shadow-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                        {v.name}
                      </span>
                      <span className="text-xs font-black text-emerald-500 ml-1">
                        {v.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedProfileDashboard;
