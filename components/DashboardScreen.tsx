import React from 'react';
import {
  Utensils,
  Zap,
  Brain,
  Activity,
  Share2,
  Check,
  Flame,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  PlusCircle,
  Dna,
  ShieldCheck,
  Globe,
  Star,
  TrendingUp,
  Clock,
  Target,
  RotateCw,
  ChevronUp,
  FlaskConical,
  Info,
  Heart,
  Wind,
  Thermometer,
  TrendingDown,
  Droplet,
  Dumbbell,
  Wheat,
  Leaf,
  X,
  Download,
  MessageCircle,
  Loader2,
  Camera,
  Settings2,
  User,
  Calendar,
  Ruler,
  Scale,
  AlertTriangle
} from 'lucide-react';
import { toPng } from 'html-to-image';
import PsychoProfile from './PsychoProfile';
import OrganMap from './OrganMap';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip, BarChart, Bar } from 'recharts';
import { UserProfile, LedgerState, HistoryItem, OperationPlan, DietPlan } from '../types';
import { getLocalDateString } from '../utils';
import { getDashboardHome, getDashboardHistory, getDashboardRangeMetrics, DashboardHomeResponse, RangeMetricsResponse, type TimeRange } from '../services/api';

interface DashboardScreenProps {
  userStats: UserProfile;
  ledger: LedgerState;
  onCheckIn: () => void | Promise<void>;
  onNavigate: (view: any) => void;
  history: HistoryItem[];
  trainingPlan: OperationPlan | null;
  completedWorkouts: number[];
  dietPlan: DietPlan | null;
  onUpdateUser?: (user: UserProfile) => void;
  /** Increments after each scan item is saved to backend, triggering a data re-fetch. */
  refreshKey?: number;
}

const DEFAULT_AGENT = {
  id: 'default_agent', name: 'System Initializing', role: 'Awaiting User Data', desc: 'No data available. Please log food, complete a workout, or generate a diet plan to activate an agent.', icon: <Activity className="w-4 h-4" />,
  tags: ['AWAITING DATA'], completion: 0, status: 'IDLE', nextAction: 'Log your first meal or workout', successProb: '0%',
  workoutName: 'No Active Workout', bodyHighlight: 'none', dietFocus: 'No Active Diet', targetBmi: 22.0,
  classes: { bg: 'bg-white', border: 'border-zinc-200', text: 'text-zinc-900', roleBg: 'bg-zinc-100', roleText: 'text-zinc-600', descText: 'text-zinc-500', check: 'text-zinc-400', statusBg: 'bg-zinc-100', statusText: 'text-zinc-600', statusDot: 'bg-zinc-400' }
};

const AGENTS = [
  {
    id: 'hypertrophy_bot', name: 'Hypertrophy Bot', role: 'Summer Shred Protocol', desc: 'Aggressive fat loss phase preserving lean muscle mass via metabolic modulation.', icon: <Zap className="w-4 h-4" />,
    tags: ['INSULIN SENSITIVITY', 'VISCERAL FAT'], completion: 65, status: 'ACTIVE', nextAction: 'Increase protein intake by 10g', successProb: '92%',
    workoutName: 'Chest Session', bodyHighlight: 'chest', dietFocus: 'High Protein', targetBmi: 22.5,
    classes: { bg: 'bg-white', border: 'border-zinc-200', text: 'text-zinc-900', roleBg: 'bg-zinc-100', roleText: 'text-zinc-600', descText: 'text-zinc-500', check: 'text-emerald-500', statusBg: 'bg-emerald-50', statusText: 'text-emerald-600', statusDot: 'bg-emerald-500' }
  },
  {
    id: 'bio_chemist_ai', name: 'Bio-Chemist AI', role: 'Gut Microbiome Reset', desc: 'Elimination diet sequence to identify inflammatory triggers and repair gut lining.', icon: <Activity className="w-4 h-4" />,
    tags: ['INFLAMMATION', 'DIGESTION'], completion: 30, status: 'WARNING', nextAction: 'Pending: Stool sample analysis', successProb: '45%',
    workoutName: 'Core & Mobility', bodyHighlight: 'core', dietFocus: 'Elimination Diet', targetBmi: 23.0,
    classes: { bg: 'bg-white', border: 'border-zinc-200', text: 'text-zinc-900', roleBg: 'bg-zinc-100', roleText: 'text-zinc-600', descText: 'text-zinc-500', check: 'text-rose-500', statusBg: 'bg-rose-50', statusText: 'text-rose-600', statusDot: 'bg-rose-500' }
  },
  {
    id: 'endurance_logic', name: 'Endurance Logic', role: 'Marathon Prep (Zone 2)', desc: 'Mitochondrial efficiency training and carbohydrate loading strategy.', icon: <Clock className="w-4 h-4" />,
    tags: ['VO2 MAX', 'RESTING HR'], completion: 100, status: 'COMPLETED', nextAction: 'Protocol complete. Maintenance mode.', successProb: '99%',
    workoutName: 'Long Run (Zone 2)', bodyHighlight: 'legs', dietFocus: 'Carb Loading', targetBmi: 21.0,
    classes: { bg: 'bg-white', border: 'border-zinc-200', text: 'text-zinc-900', roleBg: 'bg-zinc-100', roleText: 'text-zinc-600', descText: 'text-zinc-500', check: 'text-blue-500', statusBg: 'bg-blue-50', statusText: 'text-blue-600', statusDot: 'bg-blue-500' }
  },
  {
    id: 'neural_net', name: 'Neural Net', role: 'Cognitive Focus Stack', desc: 'Nootropic deployment and intermittent fasting schedule for peak clarity.', icon: <Brain className="w-4 h-4" />,
    tags: ['FOCUS', 'DEEP SLEEP'], completion: 12, status: 'ACTIVE', nextAction: 'Adjust caffeine timing window', successProb: '88%',
    workoutName: 'HIIT & Meditation', bodyHighlight: 'head', dietFocus: 'Intermittent Fasting', targetBmi: 24.0,
    classes: { bg: 'bg-white', border: 'border-zinc-200', text: 'text-zinc-900', roleBg: 'bg-zinc-100', roleText: 'text-zinc-600', descText: 'text-zinc-500', check: 'text-emerald-500', statusBg: 'bg-emerald-50', statusText: 'text-emerald-600', statusDot: 'bg-emerald-500' }
  },
];

import Model, { IExerciseData, Muscle } from 'react-body-highlighter';

const AnatomySVG = ({ highlight }: { highlight: string }) => {
  const getMuscles = (part: string): Muscle[] => {
    switch (part) {
      case 'arms': return ['biceps', 'triceps', 'forearm', 'front-deltoids', 'back-deltoids'];
      case 'legs': return ['quadriceps', 'hamstring', 'calves', 'gluteal'];
      case 'core': return ['abs', 'obliques', 'lower-back'];
      case 'back': return ['upper-back', 'trapezius', 'lower-back', 'back-deltoids'];
      case 'chest': return ['chest'];
      case 'head': return ['neck', 'trapezius'];
      case 'full': return [
        'chest', 'biceps', 'triceps', 'forearm', 'front-deltoids', 'back-deltoids',
        'abs', 'obliques', 'quadriceps', 'hamstring', 'calves', 'gluteal',
        'upper-back', 'trapezius', 'lower-back', 'neck'
      ];
      default: return [];
    }
  };

  const data: IExerciseData[] = [
    { name: 'Workout', muscles: getMuscles(highlight) }
  ];

  return (
    <div className="flex flex-row justify-center items-center w-full h-full overflow-hidden gap-2">
      <div className="w-1/2 h-full flex justify-center items-center">
        <Model
          type="anterior"
          data={data}
          style={{ width: '100%', height: '100%', maxHeight: '100%' }}
          highlightedColors={['#2563eb']}
          bodyColor="#e4e4e7"
        />
      </div>
      <div className="w-1/2 h-full flex justify-center items-center">
        <Model
          type="posterior"
          data={data}
          style={{ width: '100%', height: '100%', maxHeight: '100%' }}
          highlightedColors={['#2563eb']}
          bodyColor="#e4e4e7"
        />
      </div>
    </div>
  );
};

const getFoodColor = (name: string) => {
  const n = name.toLowerCase();
  // Cohesive, professional, muted palette
  if (n.includes('apple') || n.includes('strawberry') || n.includes('meat') || n.includes('beef') || n.includes('tomato') || n.includes('berry') || n.includes('cherry') || n.includes('watermelon') || n.includes('pork') || n.includes('steak')) return '#E11D48'; // Muted Rose
  if (n.includes('banana') || n.includes('corn') || n.includes('lemon') || n.includes('egg') || n.includes('cheese') || n.includes('pineapple') || n.includes('honey') || n.includes('butter') || n.includes('pasta')) return '#D97706'; // Muted Amber
  if (n.includes('salad') || n.includes('broccoli') || n.includes('spinach') || n.includes('green') || n.includes('cucumber') || n.includes('veg') || n.includes('avocado') || n.includes('kale') || n.includes('lettuce') || n.includes('cabbage')) return '#059669'; // Muted Emerald
  if (n.includes('blueberry') || n.includes('water') || n.includes('milk') || n.includes('drink') || n.includes('yogurt') || n.includes('sky') || n.includes('soda')) return '#2563EB'; // Muted Blue
  if (n.includes('orange') || n.includes('carrot') || n.includes('salmon') || n.includes('sweet potato') || n.includes('pumpkin') || n.includes('tangerine')) return '#EA580C'; // Muted Orange
  if (n.includes('grape') || n.includes('eggplant') || n.includes('plum') || n.includes('beet') || n.includes('onion')) return '#7C3AED'; // Muted Violet
  if (n.includes('chocolate') || n.includes('coffee') || n.includes('bread') || n.includes('toast') || n.includes('rice') || n.includes('cereal') || n.includes('nut') || n.includes('almond') || n.includes('cookie') || n.includes('cake') || n.includes('donut')) return '#92400E'; // Muted Brown
  if (n.includes('chicken') || n.includes('turkey') || n.includes('fish') || n.includes('tofu') || n.includes('potato') || n.includes('cauliflower')) return '#D6D3D1'; // Muted Stone

  return '#6B7280'; // Muted Gray
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  userStats,
  ledger,
  onCheckIn,
  onNavigate,
  history,
  trainingPlan,
  completedWorkouts,
  dietPlan,
  onUpdateUser,
  refreshKey = 0,
}) => {
  const [dashboardData, setDashboardData] = React.useState<DashboardHomeResponse | null>(null);
  const [historyData, setHistoryData] = React.useState<any[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = React.useState(true);

  React.useEffect(() => {
    async function fetchDashboard() {
      try {
        setIsLoadingDashboard(true);
        const todayStr = getLocalDateString();
        const [homeRes, histRes] = await Promise.all([
          getDashboardHome(todayStr),
          getDashboardHistory(todayStr)
        ]);
        setDashboardData(homeRes);
        setHistoryData(histRes);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoadingDashboard(false);
      }
    }
    fetchDashboard();
  // Re-fetch whenever refreshKey changes (e.g. after a new scan item is saved to backend)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const selectedDate = new Date();
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'food' | 'drink'>('all');
  const [showDietDetails, setShowDietDetails] = React.useState(false);
  const [showAllNutrients, setShowAllNutrients] = React.useState(false);
  const [timeRange, setTimeRange] = React.useState<TimeRange>('24H');
  const [isTimeRangeDropdownOpen, setIsTimeRangeDropdownOpen] = React.useState(false);
  const [rangeMetrics, setRangeMetrics] = React.useState<RangeMetricsResponse | null>(null);
  const [isLoadingRange, setIsLoadingRange] = React.useState(false);
  const [currentAdIndex, setCurrentAdIndex] = React.useState(0);
  const [justCheckedIn, setJustCheckedIn] = React.useState(false);
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [showTrainingModal, setShowTrainingModal] = React.useState(false);

  const [recoveryPercent, setRecoveryPercent] = React.useState(0);
  const [hydrationPercentBar, setHydrationPercentBar] = React.useState(0);
  const [stressPercent, setStressPercent] = React.useState(0);
  const [glucosePercent, setGlucosePercent] = React.useState(0);

  const todayStr = getLocalDateString();
  const hasCheckedInToday = userStats.lastCheckInDate === todayStr;

  const calendarDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getLocalDateString();

    for (let i = -14; i <= 0; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = getLocalDateString(d);

      let isCheckedIn = false;
      if (userStats.lastCheckInDate) {
        const lastCheckIn = new Date(userStats.lastCheckInDate);
        lastCheckIn.setHours(0, 0, 0, 0);

        const diffTime = lastCheckIn.getTime() - d.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays >= 0 && diffDays < userStats.streak) {
          isCheckedIn = true;
        }
      }

      if (justCheckedIn && dateStr === todayStr) {
        isCheckedIn = true;
      }

      days.push({
        date: d,
        dateStr,
        isCheckedIn,
        isToday: i === 0,
        isFuture: i > 0,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate()
      });
    }
    return days;
  }, [userStats.lastCheckInDate, userStats.streak, justCheckedIn]);

  const weeklyScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (weeklyScrollRef.current) {
      weeklyScrollRef.current.scrollLeft = weeklyScrollRef.current.scrollWidth;
    }
  }, [calendarDays]);

  const levelStyles = React.useMemo(() => {
    const level = userStats.level;
    if (level <= 5) {
      return {
        card: "bg-white border-zinc-200",
        iconBg: "bg-zinc-50 border-zinc-100",
        iconColor: "text-zinc-400",
        progressBar: "bg-zinc-900",
        rankText: "text-zinc-900",
        levelText: "text-zinc-400",
        xpText: "text-zinc-500",
        divider: "border-zinc-100",
        pattern: "opacity-[0.03] grayscale"
      };
    } else if (level <= 15) {
      return {
        card: "bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-blue-900/5",
        iconBg: "bg-blue-100/50 border-blue-200",
        iconColor: "text-blue-600",
        progressBar: "bg-blue-600",
        rankText: "text-zinc-900",
        levelText: "text-blue-600",
        xpText: "text-blue-600/70",
        divider: "border-blue-200/50",
        pattern: "opacity-[0.05] sepia-[0.2] hue-rotate-[180deg]"
      };
    } else if (level <= 40) {
      return {
        card: "bg-gradient-to-br from-white to-emerald-50 border-emerald-200 shadow-emerald-900/5",
        iconBg: "bg-emerald-100/50 border-emerald-200",
        iconColor: "text-emerald-600",
        progressBar: "bg-emerald-600",
        rankText: "text-zinc-900",
        levelText: "text-emerald-600",
        xpText: "text-emerald-600/70",
        divider: "border-emerald-200/50",
        pattern: "opacity-[0.05] sepia-[0.2] hue-rotate-[90deg]"
      };
    } else if (level <= 100) {
      return {
        card: "bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-xl",
        iconBg: "bg-zinc-800 border-zinc-700",
        iconColor: "text-zinc-300",
        progressBar: "bg-white",
        rankText: "text-white",
        levelText: "text-zinc-400",
        xpText: "text-zinc-500",
        divider: "border-zinc-800",
        pattern: "opacity-[0.1] invert"
      };
    } else if (level <= 250) {
      return {
        card: "bg-gradient-to-br from-indigo-900 to-zinc-950 border-indigo-500/30 shadow-indigo-500/10",
        iconBg: "bg-indigo-500/20 border-indigo-500/30",
        iconColor: "text-indigo-300",
        progressBar: "bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]",
        rankText: "text-white",
        levelText: "text-indigo-300",
        xpText: "text-indigo-300/50",
        divider: "border-indigo-500/20",
        pattern: "opacity-[0.15] hue-rotate-[240deg]"
      };
    } else if (level <= 500) {
      return {
        card: "bg-gradient-to-br from-amber-900/80 to-zinc-950 border-amber-500/30 shadow-amber-500/10",
        iconBg: "bg-amber-500/20 border-amber-500/30",
        iconColor: "text-amber-400",
        progressBar: "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]",
        rankText: "text-white",
        levelText: "text-amber-400",
        xpText: "text-amber-400/50",
        divider: "border-amber-500/20",
        pattern: "opacity-[0.2] hue-rotate-[40deg]"
      };
    } else {
      return {
        card: "bg-zinc-950 border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)]",
        iconBg: "bg-purple-500/20 border-purple-500/30",
        iconColor: "text-purple-300",
        progressBar: "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]",
        rankText: "text-white",
        levelText: "text-purple-300",
        xpText: "text-purple-300/50",
        divider: "border-purple-500/20",
        pattern: "opacity-[0.25] animate-pulse"
      };
    }
  }, [userStats.level]);

  const handleDailyCheckIn = async () => {
    if (isCheckingIn) return;
    setIsCheckingIn(true);
    try {
      await onCheckIn();
      setJustCheckedIn(true);
      setTimeout(() => setJustCheckedIn(false), 4000);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const dailyHistory = React.useMemo(() => {
    // Use historyData from API instead of global history prop.
    // Assumes historyData has a timestamp field.
    return historyData.filter(item => {
      // API returns today's data, so filter by type only
      if (activeFilter === 'all') return true;
      return (item.type || item.itemType || 'food').toLowerCase() === activeFilter;
    });
  }, [historyData, activeFilter]);

  React.useEffect(() => {
    if (dashboardData) {
      setRecoveryPercent(Math.round(dashboardData.healthMetrics.recovery));
      setHydrationPercentBar(Math.round(dashboardData.healthMetrics.hydration));
      setStressPercent(Math.round(dashboardData.healthMetrics.stress));
      setGlucosePercent(Math.round(dashboardData.healthMetrics.glucose));
      return;
    }

    // Fallback: calculate from local data when backend is unavailable
    const drinksToday = dailyHistory.filter(item => item.action === 'consumed' && item.itemType === 'drink').length;
    const recovery = Math.max(10, Math.min(60, 25 + (drinksToday * 5)));
    const hydration = Math.max(5, Math.min(40, Math.round((drinksToday / 4) * 35 + 5)));
    const stress = dailyHistory.length > 0 ? 10 : 0;
    const glucose = dailyHistory.length > 0 ? Math.max(5, 100 - recovery - hydration - stress) : 0;

    setRecoveryPercent(dailyHistory.length > 0 ? Math.round(recovery) : 0);
    setHydrationPercentBar(dailyHistory.length > 0 ? Math.round(hydration) : 0);
    setStressPercent(Math.round(stress));
    setGlucosePercent(Math.round(glucose));
  }, [dailyHistory, dashboardData]);

  // Fetch backend range metrics whenever the user selects a different time window
  React.useEffect(() => {
    let cancelled = false;
    async function fetchRange() {
      setIsLoadingRange(true);
      try {
        const data = await getDashboardRangeMetrics(timeRange);
        if (!cancelled) setRangeMetrics(data);
      } catch (err) {
        console.error('Failed to fetch range metrics:', err);
        if (!cancelled) setRangeMetrics(null);
      } finally {
        if (!cancelled) setIsLoadingRange(false);
      }
    }
    fetchRange();
    return () => { cancelled = true; };
  }, [timeRange]);

  // Calculate consumed amount based on filtered history - ONLY CONSUMED ITEMS
  const consumedItems = React.useMemo(() => {
    return dailyHistory.filter(item => item.action === 'consumed');
  }, [dailyHistory]);

  const filteredConsumed = React.useMemo(() => {
    return consumedItems.reduce((sum, item) => sum + (item.sugarg || 0), 0);
  }, [consumedItems]);

  // Calculate saved amount based on filtered history - ONLY REJECTED ITEMS
  const filteredSaved = React.useMemo(() => {
    return dailyHistory
      .filter(item => item.action === 'rejected')
      .reduce((sum, item) => sum + (item.sugarg || 0), 0);
  }, [dailyHistory]);

  const avgGI = React.useMemo(() => {
    if (consumedItems.length === 0) return 0;
    const totalGI = consumedItems.reduce((sum, item) => sum + (item.glycemicIndex || 0), 0);
    return Math.round(totalGI / consumedItems.length);
  }, [consumedItems]);

  const insulinLoad = React.useMemo(() => {
    return Math.round((filteredConsumed * avgGI) / 100);
  }, [filteredConsumed, avgGI]);

  const metabolicScore = React.useMemo(() => {
    if (dashboardData) return dashboardData.healthMetrics.metabolicScore;
    const consumedItems = dailyHistory.filter(item => item.action === 'consumed');
    if (consumedItems.length === 0) return 0;
    let score = 0;
    consumedItems.forEach(item => {
      let itemImpact = 50; // Increased base positive impact
      const sugar = item.sugarg || 0;
      const gi = item.glycemicIndex || 0;
      if (sugar > 10) itemImpact -= (sugar - 10) * 0.2; // Reduced penalty
      if (gi > 55) itemImpact -= (gi - 55) * 0.1; // Reduced penalty
      if (item.macros?.protein) itemImpact += item.macros.protein * 0.3; // Bonus for protein
      score += itemImpact;
    });
    return Math.max(0, Math.min(100, score));
  }, [dailyHistory]);

  // When backend range metrics are available use them; fall back to client-side
  // estimation using today-only history (accurate only for the current day).
  const metabolicTrend = React.useMemo(() => {
    if (rangeMetrics) return rangeMetrics.metabolicTrend;

    // Client-side fallback (today's data only – inaccurate for 7D/30D)
    if (dailyHistory.length === 0) return 0;
    const now = new Date(selectedDate);
    const startTime = new Date(now);
    let seconds = 0; let days = 0;
    switch (timeRange) {
      case '30S': seconds = 30; break;
      case '1M':  seconds = 60; break;
      case '15M': seconds = 15 * 60; break;
      case '1H':  seconds = 3600; break;
      case '24H': days = 1; break;
      case '7D':  days = 7; break;
      case '30D': days = 30; break;
    }
    if (seconds > 0) startTime.setSeconds(now.getSeconds() - seconds);
    else startTime.setDate(now.getDate() - days);
    const prevStart = new Date(startTime);
    if (seconds > 0) prevStart.setSeconds(startTime.getSeconds() - seconds);
    else prevStart.setDate(startTime.getDate() - days);

    const calcScore = (hist: HistoryItem[]) => {
      if (hist.length === 0) return 0;
      let score = 0;
      hist.forEach(item => {
        let impact = 20;
        const sugar = item.sugarg || 0;
        const gi    = item.glycemicIndex || 0;
        if (sugar > 10) impact -= (sugar - 10) * 0.5;
        if (gi > 55)    impact -= (gi - 55)    * 0.2;
        if (item.macros?.protein) impact += item.macros.protein * 0.3;
        score += impact;
      });
      return Math.max(0, Math.min(100, score));
    };
    const cur  = calcScore(history.filter(i => { const d = new Date(i.timestamp); return d >= startTime && d <= now; }));
    const prev = calcScore(history.filter(i => { const d = new Date(i.timestamp); return d >= prevStart && d < startTime; }));
    return prev === 0 ? cur : cur - prev;
  }, [rangeMetrics, history, selectedDate, timeRange, dailyHistory, metabolicScore]);

  // Calculate daily macros and calories precisely from dailyHistory
  const dailyCalories = React.useMemo(() => consumedItems.reduce((sum, item) => sum + (item.calories || 0), 0), [consumedItems]);

  // Calculate effective weight based on net energy balance
  const effectiveWeight = React.useMemo(() => {
    const baseWeight = userStats.weight || 72;
    const burnedCalories = trainingPlan
      ? completedWorkouts.reduce((sum, idx) => sum + Math.abs(trainingPlan.schedule[idx].sugarImpact) * 50, 0)
      : 0;
    const netEnergyBalance = dailyCalories - burnedCalories;
    const estimatedWeightChange = netEnergyBalance / 7700;
    return baseWeight + estimatedWeightChange;
  }, [userStats.weight, trainingPlan, completedWorkouts, dailyCalories]);

  const dailyProtein = React.useMemo(() => consumedItems.reduce((sum, item) => sum + (item.macros?.protein || 0), 0), [consumedItems]);
  const dailyCarbs = React.useMemo(() => consumedItems.reduce((sum, item) => sum + (item.macros?.carbs || 0), 0), [consumedItems]);
  const dailyFiber = React.useMemo(() => consumedItems.reduce((sum, item) => sum + (item.macros?.fiber || 0), 0), [consumedItems]);
  const dailyTransFat = React.useMemo(() => consumedItems.reduce((sum, item) => sum + (item.metadata?.transFat || item.metadata?.trans_fat || item.metadata?.transfat || 0), 0), [consumedItems]);

  const dailyDrinksCount = React.useMemo(() => consumedItems.filter(item => item.itemType === 'drink').length, [consumedItems]);
  const hydrationPercent = Math.min(100, dailyDrinksCount * 25); // Assume 4 drinks = 100% hydration for simplicity

  const energyScore = React.useMemo(() => {
    if (consumedItems.length === 0) return 0;
    // Energy is a mix of calories consumed vs target (2100) and hydration
    const calScore = Math.min(100, (dailyCalories / 2100) * 100);
    return Math.round((calScore * 0.7) + (hydrationPercent * 0.3));
  }, [consumedItems, dailyCalories, hydrationPercent]);

  const energyTrend = React.useMemo(() => {
    // Prefer backend data which covers multi-day windows accurately
    if (rangeMetrics) {
      const diff = rangeMetrics.energyTrend;
      return { val: Math.abs(diff).toFixed(1), isPositive: diff >= 0 };
    }

    // Client-side fallback (today's data only)
    if (dailyHistory.length === 0) return { val: 0, isPositive: true };
    const now = new Date(selectedDate);
    const startTime = new Date(now);
    let seconds = 0; let days = 0;
    switch (timeRange) {
      case '30S': seconds = 30; break;
      case '1M':  seconds = 60; break;
      case '15M': seconds = 15 * 60; break;
      case '1H':  seconds = 3600; break;
      case '24H': days = 1; break;
      case '7D':  days = 7; break;
      case '30D': days = 30; break;
    }
    if (seconds > 0) startTime.setSeconds(now.getSeconds() - seconds);
    else startTime.setDate(now.getDate() - days);
    const prevStart = new Date(startTime);
    if (seconds > 0) prevStart.setSeconds(startTime.getSeconds() - seconds);
    else prevStart.setDate(startTime.getDate() - days);

    const calcEnergy = (hist: HistoryItem[]) => {
      if (hist.length === 0) return 0;
      const c = hist.filter(i => i.action === 'consumed');
      const cals = c.reduce((s, i) => s + (i.calories || 0), 0);
      const drinks = c.filter(i => i.itemType === 'drink').length;
      return Math.round((Math.min(100, (cals / 2100) * 100) * 0.7) + (Math.min(100, drinks * 25) * 0.3));
    };
    const curE  = calcEnergy(history.filter(i => { const d = new Date(i.timestamp); return d >= startTime && d <= now; }));
    const prevE = calcEnergy(history.filter(i => { const d = new Date(i.timestamp); return d >= prevStart && d < startTime; }));
    const diff  = prevE === 0 ? curE : curE - prevE;
    return { val: Math.abs(diff).toFixed(1), isPositive: diff >= 0 };
  }, [rangeMetrics, history, selectedDate, timeRange, dailyHistory]);

  const adsData = React.useMemo(() => {
    const isSugarHigh = filteredConsumed > ledger.limit;
    const isHydrationLow = hydrationPercent < 50;
    const isProteinLow = dailyProtein < 50;

    return [
      {
        id: 'sugar-insight',
        title: isSugarHigh ? "Sugar Spike Alert" : "Optimal Glucose",
        text: isSugarHigh
          ? "High blood sugar today. Try 'Green Detox Blend' from Vendor Y to stabilize insulin."
          : "Great! Maintain low blood sugar with our Premium Low-GI Snacks.",
        image: isSugarHigh
          ? "https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=400&h=400&fit=crop"
          : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
        color: isSugarHigh ? "from-rose-500 to-orange-400" : "from-emerald-400 to-teal-500",
        icon: isSugarHigh ? <Activity className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />
      },
      {
        id: 'hydration-insight',
        title: isHydrationLow ? "Hydration Needed" : "Perfectly Hydrated",
        text: isHydrationLow
          ? "Your body needs fluids! Boost hydration with Brand X Electrolytes."
          : "Optimal hydration! Add Brand Y Mineral Drops for better metabolism.",
        image: isHydrationLow
          ? "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop"
          : "https://images.unsplash.com/photo-1559839914-11aae62e1531?w=400&h=400&fit=crop",
        color: "from-blue-400 to-cyan-500",
        icon: <Droplet className="w-4 h-4 text-white" />
      },
      {
        id: 'protein-insight',
        title: isProteinLow ? "Protein Deficit" : "Muscle Recovery",
        text: isProteinLow
          ? "Protein intake is low. Get 20% off Brand Z Whey Isolate."
          : "Protein target reached! Accelerate recovery with our BCAA complex.",
        image: isProteinLow
          ? "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400&h=400&fit=crop"
          : "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop",
        color: "from-fuchsia-500 to-purple-500",
        icon: <Zap className="w-4 h-4 text-white" />
      }
    ];
  }, [filteredConsumed, consumedItems, ledger.limit, hydrationPercent, dailyProtein]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % adsData.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [adsData.length]);

  const lastScanTime = React.useMemo(() => {
    if (history.length === 0) return null;
    const latest = new Date(Math.max(...history.map(h => new Date(h.timestamp).getTime())));
    const diffMs = new Date().getTime() - latest.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 0) return `${diffHrs}h ago`;
    return `${diffMins}m ago`;
  }, [history]);

  const formattedScore = metabolicScore.toFixed(1);
  const [scoreInt, scoreDec] = formattedScore.split('.');
  const isTrendPositive = metabolicTrend >= 0;
  const trendAbs = Math.abs(metabolicTrend).toFixed(1);

  // Map daily history to chart data
  const chartData = React.useMemo(() => {
    return dailyHistory.map(item => ({
      time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      sugar: item.sugar || item.sugarg || 0,
      gi: item.glycemicIndex || 0,
      name: item.name || 'Food'
    }));
  }, [dailyHistory]);

  // Set initial selected item when date changes
  React.useEffect(() => {
    // Auto-selection removed to prevent popup on load
    setSelectedHistoryItem(null);
  }, [dailyHistory]);

  const macroData = [
    { name: 'P', value: dashboardData?.nutrition?.summary?.protein || ledger.macros?.protein || 0, color: '#3b82f6' },
    { name: 'C', value: dashboardData?.nutrition?.summary?.carbs || ledger.macros?.carbs || 0, color: '#f59e0b' },
    { name: 'F', value: dashboardData?.nutrition?.summary?.fat || ledger.macros?.fat || 0, color: '#ef4444' },
  ];

  const targetCals = dashboardData?.nutrition?.summary?.targetCalories || 2100;
  const consumedCals = dashboardData?.nutrition?.summary?.caloriesIn || ledger.calories || 0;
  const remainingCals = Math.round((targetCals - consumedCals) * 10) / 10;
  const progressPercent = Math.min((consumedCals / targetCals) * 100, 100);

  // Complete list of vitamins initialized to 0
  const ALL_VITAMINS = [
    { name: 'Vit A', aliases: ['vitamin a', 'retinol'], amount: '0 IU', percent: 0, color: 'bg-orange-400', icon: '🥕', category: 'Vitamins' },
    { name: 'Vit B1', aliases: ['vitamin b1', 'thiamine'], amount: '0 mg', percent: 0, color: 'bg-yellow-200', icon: '🍞', category: 'Vitamins' },
    { name: 'Vit B2', aliases: ['vitamin b2', 'riboflavin'], amount: '0 mg', percent: 0, color: 'bg-yellow-300', icon: '🥚', category: 'Vitamins' },
    { name: 'Vit B3', aliases: ['vitamin b3', 'niacin'], amount: '0 mg', percent: 0, color: 'bg-yellow-400', icon: '🍗', category: 'Vitamins' },
    { name: 'Vit B5', aliases: ['vitamin b5', 'pantothenic'], amount: '0 mg', percent: 0, color: 'bg-yellow-500', icon: '🍄', category: 'Vitamins' },
    { name: 'Vit B6', aliases: ['vitamin b6', 'pyridoxine'], amount: '0 mg', percent: 0, color: 'bg-yellow-600', icon: '🍌', category: 'Vitamins' },
    { name: 'Vit B7', aliases: ['vitamin b7', 'biotin'], amount: '0 µg', percent: 0, color: 'bg-yellow-700', icon: '🥜', category: 'Vitamins' },
    { name: 'Vit B9', aliases: ['vitamin b9', 'folate', 'folic acid'], amount: '0 µg', percent: 0, color: 'bg-green-200', icon: '🥬', category: 'Vitamins' },
    { name: 'Vit B12', aliases: ['vitamin b12', 'cobalamin'], amount: '0 µg', percent: 0, color: 'bg-red-500', icon: '🥩', category: 'Vitamins' },
    { name: 'Vit C', aliases: ['vitamin c', 'ascorbic'], amount: '0 mg', percent: 0, color: 'bg-orange-500', icon: '🍊', category: 'Vitamins' },
    { name: 'Vit D', aliases: ['vitamin d', 'cholecalciferol'], amount: '0 IU', percent: 0, color: 'bg-yellow-400', icon: '☀️', category: 'Vitamins' },
    { name: 'Vit E', aliases: ['vitamin e', 'tocopherol'], amount: '0 mg', percent: 0, color: 'bg-green-400', icon: '🥑', category: 'Vitamins' },
    { name: 'Vit K', aliases: ['vitamin k', 'phylloquinone'], amount: '0 µg', percent: 0, color: 'bg-green-600', icon: '🥦', category: 'Vitamins' },
    { name: 'Calcium', aliases: ['calcium'], amount: '0 mg', percent: 0, color: 'bg-slate-300', icon: '🥛', category: 'Minerals' },
    { name: 'Iron', aliases: ['iron'], amount: '0 mg', percent: 0, color: 'bg-red-400', icon: '🩸', category: 'Minerals' },
    { name: 'Magnesium', aliases: ['magnesium'], amount: '0 mg', percent: 0, color: 'bg-blue-400', icon: '💧', category: 'Minerals' },
    { name: 'Phosphorus', aliases: ['phosphorus'], amount: '0 mg', percent: 0, color: 'bg-purple-200', icon: '🦴', category: 'Minerals' },
    { name: 'Potassium', aliases: ['potassium'], amount: '0 mg', percent: 0, color: 'bg-purple-400', icon: '🥔', category: 'Minerals' },
    { name: 'Sodium', aliases: ['sodium', 'salt'], amount: '0 mg', percent: 0, color: 'bg-slate-400', icon: '🧂', category: 'Minerals' },
    { name: 'Zinc', aliases: ['zinc'], amount: '0 mg', percent: 0, color: 'bg-zinc-400', icon: '🦪', category: 'Minerals' },
    { name: 'Copper', aliases: ['copper'], amount: '0 mg', percent: 0, color: 'bg-orange-300', icon: '🪙', category: 'Minerals' },
    { name: 'Manganese', aliases: ['manganese'], amount: '0 mg', percent: 0, color: 'bg-pink-300', icon: '🌰', category: 'Minerals' },
    { name: 'Selenium', aliases: ['selenium'], amount: '0 µg', percent: 0, color: 'bg-blue-200', icon: '🥜', category: 'Minerals' },
    { name: 'Iodine', aliases: ['iodine'], amount: '0 µg', percent: 0, color: 'bg-indigo-300', icon: '🌊', category: 'Minerals' },
    { name: 'Choline', aliases: ['choline'], amount: '0 mg', percent: 0, color: 'bg-amber-200', icon: '🥚', category: 'Other' },
    { name: 'Omega-3', aliases: ['omega-3', 'dha', 'epa'], amount: '0 mg', percent: 0, color: 'bg-blue-500', icon: '🐟', category: 'Other' },
    { name: 'Omega-6', aliases: ['omega-6'], amount: '0 mg', percent: 0, color: 'bg-orange-200', icon: '🌻', category: 'Other' },
  ];

  // Merge ledger vitamins with the complete list
  const vitamins = ALL_VITAMINS.map(defaultVit => {
    const tracked = (ledger.vitamins || []).find(v => {
      const vName = v.name.toLowerCase();
      return vName === defaultVit.name.toLowerCase() ||
        defaultVit.aliases.some(alias => vName.includes(alias));
    });

    if (tracked) {
      return { ...defaultVit, percent: tracked.percent, amount: tracked.amount };
    }
    return defaultVit;
  });

  // --- BLINDSPOT INTEL LOGIC ---
  const [isIntelExpanded, setIsIntelExpanded] = React.useState(false);
  const [isInsightsModalOpen, setIsInsightsModalOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [shareImage, setShareImage] = React.useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const healthCardRef = React.useRef<HTMLDivElement>(null);
  const shareCardRef = React.useRef<HTMLDivElement>(null);

  const [currentIntel, setCurrentIntel] = React.useState<{ title: string, desc: string, risk: string, color: string, icon: any } | null>(null);
  const [actionAlert, setActionAlert] = React.useState<{ title: string, desc: string, antidote: string, timer: string, type: string } | null>(null);
  const [dismissedAlertId, setDismissedAlertId] = React.useState<string | null>(() => {
    return localStorage.getItem('dismissedAlertId');
  });

  React.useEffect(() => {
    if (dismissedAlertId) {
      localStorage.setItem('dismissedAlertId', dismissedAlertId);
    } else {
      localStorage.removeItem('dismissedAlertId');
    }
  }, [dismissedAlertId]);
  const [timerDisplay, setTimerDisplay] = React.useState<string>('');
  const [selectedHistoryItem, setSelectedHistoryItem] = React.useState<HistoryItem | null>(null);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [isCalendarExpanded, setIsCalendarExpanded] = React.useState(false);
  const [showAgentModal, setShowAgentModal] = React.useState(false);

  const hasAction = history.length > 0 || completedWorkouts.length > 0 || dietPlan !== null;
  const currentAgent = hasAction ? (AGENTS.find(a => a.id === userStats.agent) || AGENTS[0]) : { ...DEFAULT_AGENT, targetBmi: userStats.bmi || 22.0 };

  React.useEffect(() => {
    const latestItem = history[history.length - 1];

    if (!latestItem) {
      setActionAlert(null);
      return;
    }

    if (latestItem.id === dismissedAlertId) {
      setActionAlert(null);
      return;
    }

    // Determine Critical Action Alert based on Latest Item
    let newAlert = null;
    const sugar = latestItem.sugarg || 0;
    const type = (latestItem.itemType || 'food').toLowerCase();
    const name = latestItem.name.toLowerCase();

    // Helper to get varied antidotes
    const getAntidote = (category: string) => {
      const options: Record<string, string[]> = {
        sugar: ['15 MIN JOG', 'DRINK 500ML WATER', '10 MIN BRISK WALK', 'APPLE CIDER VINEGAR SHOT'],
        caffeine: ['L-THEANINE / BREATHWORK', 'DRINK 500ML WATER', 'MAGNESIUM SUPPLEMENT', '10 MIN MEDITATION'],
        alcohol: ['ELECTROLYTES + B-VITAMINS', 'DRINK 1L WATER', 'CHARCOAL CAPSULE', 'LIGHT STRETCHING'],
        fat: ['HOT LEMON WATER', '15 MIN LIGHT WALK', 'GINGER TEA', 'DIGESTIVE ENZYMES'],
        healthy: ['HEALTHY FATS (OLIVE OIL)', 'VITAMIN C BOOST', 'PROBIOTIC SHOT', 'MINDFUL CHEWING'],
        general: ['LIGHT WALK', 'DRINK 300ML WATER', 'DEEP BREATHING', 'POSTURE CORRECTION']
      };
      const list = options[category] || options.general;
      // Use the item ID to pick a consistent but varied antidote for that specific item
      const index = latestItem.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % list.length;
      return list[index];
    };

    if (sugar > 15) {
      newAlert = {
        title: 'SUGAR CRASH INCOMING',
        desc: `High sugar load from ${latestItem.name}. Insulin spike predicted.`,
        antidote: getAntidote('sugar'),
        timer: '59:52',
        type: 'sugar'
      };
    } else if (type === 'drink' && (name.includes('coffee') || name.includes('espresso') || name.includes('latte') || name.includes('energy drink'))) {
      newAlert = {
        title: 'ADRENAL STRESS',
        desc: 'Caffeine spike detected. Cortisol levels rising.',
        antidote: getAntidote('caffeine'),
        timer: '90:00',
        type: 'warning'
      };
    } else if (type === 'drink' && (name.includes('beer') || name.includes('wine') || name.includes('alcohol') || name.includes('vodka') || name.includes('whiskey'))) {
      newAlert = {
        title: 'LIVER TOXICITY',
        desc: 'Alcohol processing in progress. Hydration critical.',
        antidote: getAntidote('alcohol'),
        timer: '120:00',
        type: 'warning'
      };
    } else if (name.includes('burger') || name.includes('pizza') || name.includes('fries') || name.includes('fried') || name.includes('steak') || name.includes('kebab')) {
      newAlert = {
        title: 'LIPID SPIKE',
        desc: 'Heavy fat load detected. Digestion slowing down.',
        antidote: getAntidote('fat'),
        timer: '45:00',
        type: 'warning'
      };
    } else if (name.includes('salad') || name.includes('vegetable') || name.includes('fruit') || name.includes('smoothie')) {
      newAlert = {
        title: 'NUTRIENT ABSORPTION',
        desc: 'Bio-available nutrients detected. Optimize uptake.',
        antidote: getAntidote('healthy'),
        timer: '30:00',
        type: 'info'
      };
    } else {
      // Default for general consumption if it's somewhat significant
      if (latestItem.calories > 100 || sugar > 5) {
        newAlert = {
          title: 'METABOLIC OPTIMIZATION',
          desc: `Processing ${latestItem.name}. Aid digestion now.`,
          antidote: getAntidote('general'),
          timer: '30:00',
          type: 'info'
        };
      } else {
        newAlert = null;
      }
    }

    setActionAlert(newAlert);
  }, [history, dismissedAlertId]);

  // Timer Countdown Logic
  React.useEffect(() => {
    if (actionAlert?.timer) {
      setTimerDisplay(actionAlert.timer);
    }
  }, [actionAlert]);

  React.useEffect(() => {
    if (!actionAlert) return;

    const interval = setInterval(() => {
      setTimerDisplay(prev => {
        if (!prev) return "00:00";
        const parts = prev.split(':');
        if (parts.length !== 2) return prev;

        const mins = parseInt(parts[0]);
        const secs = parseInt(parts[1]);
        let totalSecs = mins * 60 + secs;

        if (totalSecs <= 0) return "00:00";
        totalSecs--;

        const newMins = Math.floor(totalSecs / 60);
        const newSecs = totalSecs % 60;
        return `${newMins.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')}`;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [actionAlert]);

  const generateIntel = React.useCallback(() => {
    const intelDatabase = [
      {
        trigger: 'sugar_high',
        condition: (ledger.sugarDebt || 0) > 20,
        title: 'Sugar Crash Imminent',
        desc: 'Current sugar load exceeds liver processing capacity. Expect energy dip in 45 mins.',
        risk: 'High',
        color: 'rose',
        icon: Zap
      },
      {
        trigger: 'protein_low',
        condition: (ledger.macros?.protein || 0) < 30,
        title: 'Muscle Catabolism',
        desc: 'Protein intake insufficient for recovery. Body may begin breaking down muscle tissue.',
        risk: 'Moderate',
        color: 'orange',
        icon: Activity
      },
      {
        trigger: 'late_night',
        condition: new Date().getHours() > 21,
        title: 'Melatonin Disruption',
        desc: 'Blue light and caloric intake at this hour will reduce REM sleep quality by ~30%.',
        risk: 'Moderate',
        color: 'indigo',
        icon: Clock
      },
      {
        trigger: 'hydration',
        condition: true, // Fallback
        title: 'Cognitive Dehydration',
        desc: 'Even 2% dehydration reduces focus. Drink 500ml water immediately to restore acuity.',
        risk: 'Low',
        color: 'blue',
        icon: Brain
      },
      {
        trigger: 'general',
        condition: true,
        title: 'Yogurt Deception',
        desc: "Low-fat yogurt replaces fat with sugar for taste. 'Fruit on the bottom' is essentially jam.",
        risk: 'Moderate',
        color: 'amber',
        icon: Utensils
      }
    ];

    // Find matching conditions
    const relevantIntel = intelDatabase.filter(i => i.condition);

    // Select random item, trying to avoid the current one if possible
    let selected = relevantIntel[Math.floor(Math.random() * relevantIntel.length)];
    if (currentIntel && relevantIntel.length > 1) {
      const others = relevantIntel.filter(i => i.title !== currentIntel.title);
      if (others.length > 0) {
        selected = others[Math.floor(Math.random() * others.length)];
      }
    }

    setCurrentIntel(selected);
  }, [ledger, history, currentIntel]);

  // Initial load
  React.useEffect(() => {
    if (!currentIntel) {
      generateIntel();
    }
  }, [generateIntel, currentIntel]);

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    try {
      setIsGeneratingImage(true);
      // Add a small delay to ensure any animations are complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const isDark = document.documentElement.classList.contains('dark');
      const dataUrl = await toPng(shareCardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: isDark ? '#18181b' : '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });

      setShareImage(dataUrl);
      setIsShareModalOpen(true);
    } catch (err) {
      console.error('Failed to generate image', err);
      alert('Failed to generate share image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownload = () => {
    if (!shareImage) return;
    const link = document.createElement('a');
    link.download = `moriesly-health-score-${getLocalDateString()}.png`;
    link.href = shareImage;
    link.click();
  };

  const handleWhatsAppShare = () => {
    if (!shareImage) return;
    const text = `Check out my Metabolic Health Score on Moriesly! I scored ${scoreInt}.${scoreDec}%.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Blindspot: backend data is the primary source, currentIntel is the fallback
  const BLINDSPOT_STYLE: Record<string, { color: string; icon: any }> = {
    sugar:     { color: 'rose',    icon: Zap },
    protein:   { color: 'orange',  icon: Activity },
    hydration: { color: 'blue',    icon: Droplet },
    calories:  { color: 'amber',   icon: Flame },
    positive:  { color: 'emerald', icon: TrendingUp },
    none:      { color: 'zinc',    icon: Brain },
  };

  const backendBlindspot = dashboardData?.insights?.blindspot;
  const intelDisplay = backendBlindspot
    ? {
        title: backendBlindspot.title,
        desc: backendBlindspot.text,
        color: BLINDSPOT_STYLE[backendBlindspot.type]?.color ?? 'zinc',
        icon: BLINDSPOT_STYLE[backendBlindspot.type]?.icon ?? Brain,
      }
    : currentIntel;

  if (!intelDisplay) return null;

  const Icon = intelDisplay.icon;

  return (
    <div className="min-h-screen bg-white dark:bg-[#fafafa] text-zinc-900 pb-32 pt-8 md:pt-12 font-sans px-4">

      {/* --- HIGHLIGHT SLIDER (Restored & Optimized) --- */}
      <div className="flex gap-4 overflow-x-auto snap-x scrollbar-hide mb-8 -mx-4 px-4 pb-4">
        {/* Card 1: Daily Directive (Actionable Recommendations) */}
        {dashboardData?.insights?.highlights?.find(h => h.id === 'daily_directive') ? (
          (() => {
            const directive = dashboardData.insights.highlights.find(h => h.id === 'daily_directive')?.data;
            return (
              <div className="min-w-[85vw] md:min-w-[320px] h-40 rounded-3xl relative overflow-hidden snap-center shadow-xl group">
                <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop" alt="Focus" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-900 via-emerald-900/40 to-transparent opacity-90"></div>

                <div className="absolute top-4 left-4">
                  <div className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-lg tracking-wider">
                    Daily Directive
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-bold text-lg mb-2 leading-tight">{directive?.title || 'Optimize Performance'}</h3>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                      <Activity className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
                      <span className="text-[9px] text-zinc-300 uppercase">{directive?.actions?.[0]?.label || 'Hydrate'}</span>
                      <span className="text-[10px] font-black text-white">{directive?.actions?.[0]?.value || '+500ml'}</span>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                      <Brain className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
                      <span className="text-[9px] text-zinc-300 uppercase">{directive?.actions?.[1]?.label || 'Focus'}</span>
                      <span className="text-[10px] font-black text-white">{directive?.actions?.[1]?.value || 'Deep Work'}</span>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                      <Clock className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
                      <span className="text-[9px] text-zinc-300 uppercase">{directive?.actions?.[2]?.label || 'Sleep'}</span>
                      <span className="text-[10px] font-black text-white">{directive?.actions?.[2]?.value || 'By 23:00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="min-w-[85vw] md:min-w-[320px] h-40 rounded-3xl relative overflow-hidden snap-center shadow-xl group bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
        )}

        {/* Card 2: Intel Brief */}
        <div className="min-w-[85vw] md:min-w-[320px] h-40 rounded-3xl relative overflow-hidden snap-center shadow-xl group cursor-pointer" onClick={() => onNavigate('blog')}>
          <img src="https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=1000&auto=format&fit=crop" alt="Intel" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-blue-900/40 to-transparent opacity-90"></div>

          <div className="absolute top-4 left-4">
            <div className="bg-blue-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-lg tracking-wider">
              Bio-Intel
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white font-bold text-lg mb-2 leading-tight">Microplastics in Water</h3>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mb-0.5" />
                <span className="text-[9px] text-blue-200 uppercase">Risk</span>
                <span className="text-[10px] font-bold text-white">High</span>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                <FlaskConical className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
                <span className="text-[9px] text-blue-200 uppercase">Focus</span>
                <span className="text-[10px] font-bold text-white">Toxins</span>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                <Clock className="w-3.5 h-3.5 text-zinc-300 mb-0.5" />
                <span className="text-[9px] text-blue-200 uppercase">Time</span>
                <span className="text-[10px] font-bold text-white">2h ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Pro Access */}
        <div className="min-w-[85vw] md:min-w-[320px] h-40 rounded-3xl relative overflow-hidden snap-center shadow-xl group cursor-pointer" onClick={() => onNavigate('training')}>
          <img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop" alt="Promo" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900 via-purple-900/40 to-transparent opacity-90"></div>

          <div className="absolute top-4 left-4">
            <div className="bg-purple-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-lg tracking-wider">
              New Protocol
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white font-bold text-lg mb-2 leading-tight">Metabolic Sync Training</h3>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                <Dumbbell className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
                <span className="text-[9px] text-purple-200 uppercase">Type</span>
                <span className="text-[10px] font-bold text-white">HIIT</span>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                <Flame className="w-3.5 h-3.5 text-orange-400 mb-0.5" />
                <span className="text-[9px] text-purple-200 uppercase">Burn</span>
                <span className="text-[10px] font-bold text-white">Max</span>
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex flex-col items-center justify-center text-center">
                <Zap className="w-3.5 h-3.5 text-yellow-400 mb-0.5" />
                <span className="text-[9px] text-purple-200 uppercase">Energy</span>
                <span className="text-[10px] font-bold text-white">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- PSYCH-OPS PROTOCOL (Profile & Projection) --- */}
      <div className="mb-8">
        <PsychoProfile history={history} limit={ledger.limit} />
      </div>

      {/* --- CRITICAL ACTION ALERTS (Slider) --- */}
      {actionAlert && (
        <div className="w-full mb-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-2">
            {[actionAlert].map((alert, index) => (
              <div key={index} className="w-[85vw] shrink-0 bg-zinc-900 dark:bg-[#121212] rounded-3xl p-6 border border-zinc-800 dark:border-white/5 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 duration-700">
                {/* Red Progress Bar Bottom */}
                <div className={`absolute bottom-0 left-0 h-1 w-[70%] z-20 ${alert.type === 'sugar' ? 'bg-rose-600' : 'bg-orange-500'}`}></div>
                <div className="absolute bottom-0 left-0 h-1 bg-zinc-800 w-full z-10"></div>

                <div className="flex gap-5 items-start relative z-30">
                  {/* Timer Box */}
                  <div className={`border rounded-2xl p-3 flex flex-col items-center justify-center w-20 shrink-0 backdrop-blur-sm ${alert.type === 'sugar' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${alert.type === 'sugar' ? 'text-rose-500' : 'text-orange-500'}`}>T-Minus</span>
                    <span className="text-xl font-mono font-black text-zinc-900 dark:text-white tracking-tighter">{timerDisplay}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${alert.type === 'sugar' ? 'bg-rose-500' : 'bg-orange-500'}`}></div>
                      <h2 className="text-lg font-black text-white dark:text-white uppercase tracking-tight">{alert.title}</h2>
                    </div>
                    <p className="text-zinc-400 dark:text-zinc-400 text-xs leading-relaxed font-medium mb-4">
                      {alert.desc}
                    </p>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-teal-400 dark:text-teal-400 uppercase tracking-widest">Recommended Antidote:</span>
                      <button
                        onClick={() => setDismissedAlertId(history[history.length - 1]?.id)}
                        className="w-full bg-teal-500 hover:bg-teal-400 text-white dark:text-teal-950 rounded-xl py-3 font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                      >
                        <FlaskConical className="w-4 h-4" strokeWidth={2.5} />
                        {alert.antidote}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Background Glow */}
                <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none ${alert.type === 'sugar' ? 'bg-rose-600/10' : 'bg-orange-600/10'}`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- COMPACT BLINDSPOT INTEL CARD (SLEEK REDESIGN) --- */}
      <div
        onClick={() => setIsIntelExpanded(!isIntelExpanded)}
        className="w-full bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-zinc-100 relative overflow-hidden mb-8 transition-all duration-300 cursor-pointer hover:shadow-md active:scale-[0.99]"
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Icon Box */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-${intelDisplay.color}-50 text-${intelDisplay.color}-600`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 text-${intelDisplay.color}-600`}>
                    {intelDisplay.color === 'emerald' ? 'Metabolik Optimal' : 'Blindspot Detected'}
                  </div>
                  <h3 className="text-zinc-900 text-base font-bold leading-tight">{intelDisplay.title}</h3>
                  {/* Deskripsi selalu tampil (tidak perlu expand) jika dari backend */}
                  {backendBlindspot && (
                    <p className="text-zinc-500 text-sm leading-relaxed mt-2">
                      {intelDisplay.desc}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Refresh Button — hanya tampil saat pakai data lokal */}
                  {!backendBlindspot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateIntel();
                      }}
                      className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}

                  {!backendBlindspot && (
                    isIntelExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </div>

              {/* Expand fallback — hanya saat pakai data lokal */}
              {!backendBlindspot && isIntelExpanded && (
                <div className="mt-3 pt-3 border-t border-zinc-50 animate-in slide-in-from-top-1">
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {intelDisplay.desc}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase mb-0.5">
            {selectedDate.toDateString() === new Date().toDateString() ? 'Today, ' : ''}{selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </h2>
          <h1 className="text-xl md:text-3xl font-black tracking-tight text-zinc-900">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h1>
        </div>
        <div className="relative">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userStats.name}`} alt="Avatar" className="w-full h-full" />
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-white"></div>
        </div>
      </div>

      {/* Gamification & Daily Check-in Card (Sleek & Compact) */}
      <div className={`${levelStyles.card} rounded-[2rem] p-3 mb-4 shadow-sm border transition-all duration-500 relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className={`absolute inset-0 pointer-events-none ${levelStyles.pattern}`}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-3 items-center justify-between">

          {/* Left: User Level & XP */}
          <div className="flex-1 w-full flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full ${levelStyles.iconBg} flex items-center justify-center border transition-colors duration-500`}>
              <ShieldCheck className={`w-4.5 h-4.5 ${levelStyles.iconColor} transition-colors duration-500`} />
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <h3 className={`font-semibold text-xs ${levelStyles.rankText} transition-colors duration-500`}>
                    {userStats.rankTitle} <span className={`${levelStyles.levelText} font-normal text-[10px] ml-1 transition-colors duration-500`}>Lvl {userStats.level}</span>
                  </h3>
                  <span className={`text-[9px] font-medium ${levelStyles.xpText} transition-colors duration-500`}>{userStats.currentXp} / {userStats.nextLevelXp} XP</span>
                </div>
                <div className="h-1 bg-zinc-100/10 bg-opacity-10 dark:bg-zinc-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${levelStyles.progressBar} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(100, (userStats.currentXp / userStats.nextLevelXp) * 100)}%` }}
                  />
                </div>
              </div>
              {filteredSaved > 0 && (
                <div className="shrink-0 flex flex-col items-end bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter">Sugar Saved</span>
                  <span className="text-xs font-black text-emerald-600">-{filteredSaved}g</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Action */}
          <div className="shrink-0 w-full md:w-auto flex items-center justify-end gap-2">
            <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-900/30">
              <Flame className="w-3 h-3 text-orange-600 fill-orange-600" />
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black text-orange-700 dark:text-orange-400">{userStats.streak}</span>
                <span className="text-[6px] font-black text-orange-600/70 uppercase tracking-tighter">Streak</span>
              </div>
            </div>
            {(!hasCheckedInToday && !justCheckedIn) ? (
              <button
                onClick={handleDailyCheckIn}
                disabled={isCheckingIn}
                className={`w-full md:w-auto bg-zinc-900 dark:bg-zinc-800 text-white text-[10px] font-medium px-4 py-2 rounded-full transition-all flex items-center justify-center gap-2 ${isCheckingIn ? 'opacity-80 cursor-not-allowed' : 'hover:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-95'}`}
              >
                {isCheckingIn ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Checking In...
                  </>
                ) : (
                  <>
                    Check In <span className="text-zinc-400 text-[9px] border-l border-zinc-700 dark:border-zinc-600 pl-2">+50 XP</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full md:w-auto bg-emerald-50 text-emerald-600 text-[10px] font-medium px-4 py-2 rounded-full flex items-center justify-center gap-2 border border-emerald-100 animate-in fade-in zoom-in duration-300">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Checked In
              </div>
            )}
          </div>
        </div>

        {/* Weekly Streak View (Replaces Calendar Slider) */}
        <div className={`mt-4 pt-4 border-t ${levelStyles.divider} transition-colors duration-500`}>
          <div className="flex justify-between items-center mb-2">
            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Weekly Consistency</div>
          </div>
          <div ref={weeklyScrollRef} className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-hide -mx-2 px-2">
            {calendarDays.filter(d => !d.isFuture).map((day) => {
              const isToday = day.isToday;

              return (
                <div
                  key={day.dateStr}
                  className={`min-w-[38px] flex flex-col items-center justify-center py-1.5 rounded-lg border transition-all ${isToday
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-md scale-105 z-10'
                    : day.isCheckedIn
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                    }`}
                >
                  <span className={`text-[6px] font-black uppercase mb-0.5 ${isToday ? 'text-zinc-400' : day.isCheckedIn ? 'text-emerald-500/70' : 'text-zinc-300'}`}>
                    {day.dayName}
                  </span>
                  <span className="text-[10px] font-black">{day.dayNum}</span>
                  {day.isCheckedIn && !isToday && (
                    <div className="mt-0.5 w-0.5 h-0.5 bg-emerald-500 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent Selection Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white/95 backdrop-blur-md p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-[2000px] mx-auto w-full px-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-zinc-900">Initialize Protocol</h3>
                <p className="text-sm font-medium text-zinc-500 mt-1">Launch a new targeted health intervention managed by Moriesly AI.</p>
              </div>
              <button onClick={() => setShowAgentModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors border border-zinc-200">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AGENTS.map((agent) => {
                const isSelected = userStats.agent === agent.id || (!userStats.agent && agent.id === AGENTS[0].id);
                const hasActivity = history.length > 0 || completedWorkouts.length > 0 || !!dietPlan;

                const displayCompletion = hasActivity ? agent.completion : 0;
                const displayStatus = hasActivity ? agent.status : 'PENDING';
                const displayNextAction = hasActivity ? agent.nextAction : 'Awaiting initial data input';
                const displaySuccessProb = hasActivity ? agent.successProb : '--';
                const statusBgClass = hasActivity ? agent.classes.statusBg : 'bg-zinc-100';
                const statusTextClass = hasActivity ? agent.classes.statusText : 'text-zinc-500';
                const statusDotClass = hasActivity ? agent.classes.statusDot : 'bg-zinc-400';

                return (
                  <button
                    key={agent.id}
                    onClick={() => {
                      if (onUpdateUser) {
                        onUpdateUser({ ...userStats, agent: agent.id });
                      }
                      setShowAgentModal(false);
                    }}
                    className={`w-full text-left rounded-3xl border transition-all flex flex-col overflow-hidden relative group ${isSelected
                      ? `border-brand-500 bg-white shadow-[0_0_30px_rgba(51,173,174,0.15)]`
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none"></div>
                    )}

                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${isSelected ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-zinc-50 border-zinc-200 text-zinc-400'}`}>
                            {agent.icon}
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Assigned Agent</p>
                            <p className="text-sm font-bold text-zinc-900">{agent.name}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 border border-zinc-200/50 ${statusBgClass}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></div>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${statusTextClass}`}>{displayStatus}</span>
                        </div>
                      </div>

                      <h4 className="text-xl font-bold text-zinc-900 mb-3">{agent.role}</h4>
                      <p className="text-sm text-zinc-500 leading-relaxed mb-6">{agent.desc}</p>

                      <div className="flex flex-wrap gap-2 mb-8">
                        {agent.tags.map(tag => (
                          <span key={tag} className="px-2.5 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Completion</span>
                          <span className="text-[10px] font-bold text-zinc-500">{displayCompletion}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full ${isSelected ? 'bg-brand-500' : 'bg-zinc-300'}`} style={{ width: `${displayCompletion}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-50 border-t border-zinc-100">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3 h-3 text-zinc-400" />
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Next AI Action</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-brand-600' : 'text-zinc-500'}`}>{displaySuccessProb}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ChevronRight className={`w-3.5 h-3.5 mt-0.5 ${isSelected ? 'text-brand-500' : 'text-zinc-400'}`} />
                        <p className="text-xs font-medium text-zinc-700">{displayNextAction}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Diet Details Modal */}
      {showDietDetails && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white">
          <div className="flex items-center justify-between p-4 border-b border-zinc-100">
            <h3 className="text-lg font-black text-zinc-900">Sugar & Nutrition Details</h3>
            <button onClick={() => setShowDietDetails(false)} className="text-zinc-400 hover:text-zinc-900 p-2">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
              {/* Sugar Metric */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-rose-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Sugar</span>
                </div>
                <p className={`text-3xl font-black ${filteredConsumed > ledger.limit ? 'text-rose-500' : 'text-zinc-900'}`}>
                  {Math.round(filteredConsumed)}<span className="text-sm text-zinc-500 ml-0.5">g</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-bold">Limit: {ledger.limit}g</p>
              </div>

              {/* Calories Metric */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Calories</span>
                </div>
                <p className="text-3xl font-black text-zinc-900">
                  {Math.round(dailyCalories)}<span className="text-sm text-zinc-500 ml-0.5">kcal</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-bold">Target: 2100</p>
              </div>

              {/* Protein Metric */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Protein</span>
                </div>
                <p className="text-3xl font-black text-zinc-900">
                  {Math.round(dailyProtein)}<span className="text-sm text-zinc-500 ml-0.5">g</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-bold">Muscle Fuel</p>
              </div>

              {/* Hydration Metric */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Droplet className="w-4 h-4 text-cyan-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Hydration</span>
                </div>
                <p className="text-3xl font-black text-zinc-900">
                  {hydrationPercent}<span className="text-sm text-zinc-500 ml-0.5">%</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-bold">{dailyDrinksCount}/4 Drinks</p>
              </div>

              {/* Fiber Metric */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Wheat className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Fiber</span>
                </div>
                <p className="text-3xl font-black text-zinc-900">
                  {Math.round(dailyFiber)}<span className="text-sm text-zinc-500 ml-0.5">g</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-bold">Gut Health</p>
              </div>

              {/* Metabolic Score Metric */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Score</span>
                </div>
                <p className="text-3xl font-black text-zinc-900">
                  {metabolicScore.toFixed(0)}<span className="text-sm text-zinc-500 ml-0.5">/100</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-bold">Health Index</p>
              </div>
            </div>

            {/* Nutrient Breakdown */}
            <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-4 h-4 text-brand-600" />
                <h4 className="text-sm font-black text-zinc-900 uppercase tracking-wider">Specific Nutrient Breakdown</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {vitamins.filter(v => v.percent > 0).length > 0 ? (
                  vitamins.filter(v => v.percent > 0).map((vit, i) => (
                    <div key={i} className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg">{vit.icon}</span>
                        <span className="text-[10px] font-black text-brand-600">{vit.percent}%</span>
                      </div>
                      <div className="text-[11px] font-black text-zinc-900 truncate">{vit.name}</div>
                      <div className="text-[9px] text-zinc-500 font-bold">{vit.amount}</div>
                      <div className="w-full h-1 bg-zinc-100 rounded-full mt-2">
                        <div className={`h-full rounded-full ${vit.color}`} style={{ width: `${Math.min(vit.percent, 100)}%` }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center">
                    <p className="text-xs text-zinc-400 font-bold">No specific micronutrients detected today.</p>
                    <p className="text-[10px] text-zinc-400">Log more diverse foods to see your nutrient profile.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recharts Visualization */}
            <div className="h-64 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(() => {
                      if (consumedItems.length === 0) {
                        return [{ name: 'No Data', value: 1, color: '#E4E4E7' }];
                      }

                      const groups: Record<string, { value: number, color: string }> = {};

                      consumedItems.forEach(item => {
                        const name = item.name;
                        if (!groups[name]) {
                          groups[name] = { value: 0, color: getFoodColor(name) };
                        }
                        groups[name].value += item.calories || (item.sugarg * 4) || 10;
                      });

                      return Object.entries(groups).map(([name, data]) => ({
                        name,
                        value: data.value,
                        color: data.color
                      }));
                    })()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {(() => {
                      const chartData = consumedItems.length === 0
                        ? [{ color: '#E4E4E7' }]
                        : (() => {
                          const groups: Record<string, { value: number, color: string }> = {};

                          consumedItems.forEach(item => {
                            const name = item.name;
                            if (!groups[name]) groups[name] = { value: 0, color: getFoodColor(name) };
                            groups[name].value += item.calories || (item.sugarg * 4) || 10;
                          });
                          return Object.entries(groups).map(([name, data]) => ({ color: data.color }));
                        })();

                      return chartData.map((d: any, i: number) => (
                        <Cell key={i} fill={d.color} />
                      ));
                    })()}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(() => {
                if (consumedItems.length === 0) return null;

                const groups: Record<string, { value: number, color: string }> = {};

                consumedItems.forEach(item => {
                  const name = item.name;
                  if (!groups[name]) {
                    groups[name] = { value: 0, color: getFoodColor(name) };
                  }
                  groups[name].value += item.calories || (item.sugarg * 4) || 10;
                });

                const total = Object.values(groups).reduce((s, d) => s + d.value, 0);

                return Object.entries(groups).map(([name, data], idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                    <span className="text-[11px] font-black text-zinc-900 dark:text-white truncate flex-1">{name}</span>
                    <span className="text-[10px] text-zinc-500 font-bold">{Math.round((data.value / total) * 100)}%</span>
                  </div>
                ));
              })()}
            </div>

            {/* AI Insights Recap */}
            <div className="mt-8 p-5 bg-teal-50 rounded-3xl border border-teal-100">
              <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider mb-2">AI Nutritional Recap</h4>
              <p className="text-sm text-teal-800 leading-relaxed">
                {consumedItems.length === 0
                  ? "No consumption data yet. Log your meals to get AI insights."
                  : `Based on your intake, your ${consumedItems.reduce((s, i) => s + (i.sugarg || 0), 0) > 50 ? 'sugar' : 'protein/fiber'
                  } levels are ${consumedItems.reduce((s, i) => s + (i.sugarg || 0), 0) > 50 ? 'high' : 'well-balanced'
                  }. ${consumedItems.reduce((s, i) => s + (i.macros?.protein || 0), 0) < 30
                    ? "Try adding more protein-rich foods to improve satiety."
                    : "Your protein intake is looking good!"
                  }`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Goals Tracking Card (Super Sleek & Compact) */}
      <div className="bg-white rounded-3xl p-4 mb-8 shadow-sm border border-zinc-100">
        <div className="flex flex-col mb-4 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Goals Tracking</span>
            <button
              onClick={() => setShowAgentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-50 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all border border-zinc-100"
            >
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Change Agent</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-zinc-900 flex items-center gap-1.5">
              <span className="shrink-0">{currentAgent.icon}</span>
              <span className="truncate">{currentAgent.name}</span>
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${currentAgent.classes.roleBg} ${currentAgent.classes.roleText} uppercase tracking-wider whitespace-nowrap`}>
              {currentAgent.role}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Header Row - Compact Horizontal Scroll */}
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-2 px-2 [&::-webkit-scrollbar]:hidden snap-x">
            <div className="flex-shrink-0 flex items-center gap-2.5 p-2 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 snap-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1">Gender</p>
                <p className="text-sm font-black text-zinc-900 capitalize leading-none">{userStats.gender}</p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2.5 p-2 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 snap-start">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1">Bio Age</p>
                <p className="text-sm font-black text-zinc-900 leading-none">{dashboardData?.bioAge ?? userStats.age} <span className="text-[10px] text-zinc-500 font-medium">yrs</span></p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2.5 p-2 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 snap-start">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1">Age</p>
                <p className="text-sm font-black text-zinc-900 leading-none">{userStats.age} <span className="text-[10px] text-zinc-500 font-medium">yrs</span></p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2.5 p-2 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 snap-start">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Ruler className="w-4 h-4" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1">Height</p>
                <p className="text-sm font-black text-zinc-900 leading-none">{userStats.height} <span className="text-[10px] text-zinc-500 font-medium">cm</span></p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2.5 p-2 pr-4 rounded-2xl bg-zinc-50 border border-zinc-100 snap-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Scale className="w-4 h-4" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1">Weight</p>
                <p className="text-sm font-black text-zinc-900 leading-none">{userStats.weight} <span className="text-[10px] text-zinc-500 font-medium">kg</span></p>
              </div>
            </div>
          </div>

          {/* Weight Goal Progress — dari dashboardData.goals */}
          {dashboardData?.goals && (
            <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                  <Target className="w-3 h-3" /> Weight Goal
                </span>
                <span className="text-[9px] font-bold text-zinc-500">
                  Target: {new Date(dashboardData.goals.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">Sekarang</span>
                  <span className="text-base font-black text-zinc-900">{dashboardData.goals.currentWeight} <span className="text-[10px] text-zinc-400 font-medium">kg</span></span>
                </div>
                <div className="flex-1 mx-3">
                  <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                    {(() => {
                      const start = dashboardData.goals.currentWeight;
                      const target = dashboardData.goals.targetWeight;
                      const iscut = target < start;
                      const range = Math.abs(start - target) || 1;
                      const progress = iscut ? 0 : Math.min(100, ((start - target) / range) * 100);
                      return (
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${iscut ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${iscut ? 5 : progress}%` }}
                        />
                      );
                    })()}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">Target</span>
                  <span className={`text-base font-black ${dashboardData.goals.targetWeight < dashboardData.goals.currentWeight ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {dashboardData.goals.targetWeight} <span className="text-[10px] font-medium">kg</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Daily Calories Card */}
            <div
              className="bg-white rounded-2xl p-3 sm:p-4 border border-zinc-100 shadow-sm cursor-pointer hover:border-zinc-200 transition-colors flex flex-col h-full"
              onClick={() => setShowDietDetails(true)}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Daily Calories</p>
                {dailyCalories > 2100 && (
                  <span className="text-[8px] font-bold text-rose-500 uppercase bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-2 h-2" /> <span className="hidden sm:inline">Over Limit</span>
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-1">
                  <p className={`text-2xl sm:text-3xl font-black leading-none ${dailyCalories > 2100 ? 'text-rose-500' : 'text-zinc-900'}`}>
                    {Math.round(dailyCalories)}<span className="text-xs sm:text-lg text-zinc-500 font-bold ml-0.5">kcal</span>
                  </p>
                  <p className="text-[10px] sm:text-xs font-bold text-zinc-400 mt-1 sm:mt-0">/ 2100 kcal</p>
                </div>
                {/* Calories Progress Visualization */}
                <div className="relative w-full h-6 sm:h-8 mt-1">
                  <div className="absolute inset-0 bg-zinc-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all duration-500 ${dailyCalories > 2100 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                      style={{ width: `${Math.min(100, (dailyCalories / 2100) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Intake Nutrition Score & Macros */}
              <div className="mt-3 flex gap-2">
                <div className="w-[35%] flex flex-col justify-center items-center bg-zinc-50 rounded-xl p-2 border border-zinc-100">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-full flex items-center justify-center mb-1 ${energyScore >= 80 ? 'bg-emerald-100 text-emerald-600' : energyScore >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                    <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-bold text-zinc-500 uppercase tracking-wider text-center leading-tight mb-0.5">Intake<br />Score</span>
                  <span className={`text-sm sm:text-lg font-black leading-none ${energyScore >= 80 ? 'text-emerald-600' : energyScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {energyScore}%
                  </span>
                </div>

                <div className="w-[65%] flex flex-col justify-center gap-1.5 bg-zinc-50 rounded-xl p-2 sm:p-2.5 border border-zinc-100">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[7px] sm:text-[8px] font-bold text-zinc-400 uppercase">Trans Fat</span>
                      <span className="text-[8px] sm:text-[9px] font-black text-zinc-700">{dailyTransFat.toFixed(1)}g</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${dailyTransFat > 2 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (dailyTransFat / 2) * 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="mt-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[7px] sm:text-[8px] font-bold text-zinc-400 uppercase">Fiber</span>
                      <span className="text-[8px] sm:text-[9px] font-black text-zinc-700">{Math.round(dailyFiber)}g</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (dailyFiber / 30) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Goals Tracking */}
              <div className="mt-auto pt-3 border-t border-zinc-100 flex flex-col gap-2">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase">
                      <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                      <span className="truncate">{currentAgent.name}</span>
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold ${currentAgent.status === 'ACTIVE' ? 'text-indigo-500' : 'text-zinc-500'}`}>
                      {currentAgent.status === 'ACTIVE' ? 'Active' : currentAgent.status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-medium text-zinc-500">
                      <span className="truncate pr-2">{currentAgent.nextAction}</span>
                      <span className="font-bold text-zinc-700 shrink-0">{currentAgent.completion}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${currentAgent.completion}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Training Card */}
            <div className="bg-white rounded-2xl p-3 border border-zinc-100 flex flex-col gap-2 cursor-pointer hover:shadow-lg transition-shadow h-full" onClick={() => setShowTrainingModal(true)}>
              <div className="flex items-center gap-2.5">
                <Dumbbell className="w-6 h-6 text-indigo-500" />
                <div className="flex flex-col">
                  <h3 className="text-xs font-bold text-zinc-900">{currentAgent.workoutName}</h3>
                  <p className="text-[9px] font-medium text-zinc-500 leading-none">Tap to view details</p>
                </div>
              </div>

              {/* Simplified Body Diagram Placeholder */}
              <div className="w-full flex-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg flex items-center justify-center border border-zinc-100 dark:border-white/5 relative overflow-hidden min-h-[120px]">
                <div className="w-full h-full drop-shadow-sm flex justify-center">
                  <AnatomySVG highlight={currentAgent.bodyHighlight} />
                </div>
              </div>
            </div>

            {/* Training Modal */}
            {showTrainingModal && (
              <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowTrainingModal(false)}>
                <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500 shrink-0"></div>

                  <div className="flex justify-between items-start p-5 sm:p-6 pb-3 shrink-0 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shadow-sm">
                          {currentAgent.icon}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">{currentAgent.workoutName}</h2>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-zinc-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active Protocol Analysis
                      </p>
                    </div>
                    <button onClick={() => setShowTrainingModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col gap-6 p-5 sm:p-6 overflow-y-auto scrollbar-hide bg-zinc-50/30">
                    {/* Human Body SVG & Highlight */}
                    <div className="bg-blue-50/30 rounded-3xl p-6 sm:p-8 border border-zinc-100 shadow-sm flex flex-col relative overflow-hidden min-h-[320px] sm:min-h-[380px] shrink-0">

                      {/* Top Label */}
                      <div className="flex justify-end w-full z-20 mb-2">
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-end">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Target Area</p>
                          <p className="text-sm font-black text-blue-600 capitalize flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" />
                            {currentAgent.bodyHighlight !== 'none' ? currentAgent.bodyHighlight : 'Full Body'}
                          </p>
                        </div>
                      </div>

                      <div className="w-full flex-1 drop-shadow-md relative z-10 flex justify-center min-h-[200px]">
                        <AnatomySVG highlight={currentAgent.bodyHighlight} />
                      </div>

                      {/* Bottom Label */}
                      <div className="flex justify-start w-full z-20 mt-2">
                        <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-200 shadow-sm flex items-center gap-2">
                          <div className="flex gap-0.5">
                            <div className="w-1.5 h-3 bg-blue-600 rounded-full"></div>
                            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                            <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                            <div className="w-1.5 h-3 bg-zinc-200 rounded-full"></div>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-600 uppercase">High Intensity</span>
                        </div>
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="space-y-4 shrink-0 pb-8 sm:pb-4">
                      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100/50 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-3 relative z-10">
                          <Brain className="w-5 h-5 text-blue-600" />
                          <h4 className="font-black text-blue-900 text-base tracking-tight">Protocol Objective: {currentAgent.tags[0]}</h4>
                        </div>
                        <p className="text-sm text-blue-800/80 leading-relaxed relative z-10 font-medium">
                          {currentAgent.desc} This targeted approach specifically stresses the <span className="font-bold text-blue-600 bg-white/50 px-1.5 py-0.5 rounded-md">{currentAgent.bodyHighlight !== 'none' ? currentAgent.bodyHighlight : 'entire body'}</span> region to induce optimal adaptation and align with your broader health protocol.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600">
                              <Activity className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Expected Impact</p>
                          </div>
                          <p className="text-sm font-bold text-zinc-800 leading-snug">Metabolic rate increase & localized tissue adaptation.</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="bg-purple-50 p-1.5 rounded-lg text-purple-600">
                              <RotateCw className="w-4 h-4" />
                            </div>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Recovery Needs</p>
                          </div>
                          <p className="text-sm font-bold text-zinc-800 leading-snug">48-72 hours of targeted rest for the affected muscle groups.</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowTrainingModal(false)}
                        className="w-full mt-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        Acknowledge Protocol
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BMI Chart */}
          <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100/50">
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[8px] font-bold text-zinc-400 uppercase">BMI Status (Target: {currentAgent.targetBmi})</p>
              <span className="text-[10px] font-black text-zinc-900">
                {(effectiveWeight / Math.pow((userStats.height || 180) / 100, 2)).toFixed(1)}
              </span>
            </div>
            <div className="relative h-1 bg-zinc-200 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-emerald-400 to-rose-400 opacity-60"></div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-zinc-900"
                style={{ left: `${Math.min(95, Math.max(5, ((effectiveWeight / Math.pow((userStats.height || 180) / 100, 2)) - 15) / 25 * 100))}%` }}
              ></div>
              {/* Target BMI Indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_2px_rgba(0,0,0,0.5)]"
                style={{ left: `${Math.min(95, Math.max(5, (currentAgent.targetBmi - 15) / 25 * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Card (Ultra Compact Redesign) */}
      <div ref={healthCardRef} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 dark:border-zinc-800 mb-6 relative overflow-hidden group">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-700" />

        {/* Header & Actions */}
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Metabolic Health</h2>
            <div className="h-0.5 w-6 bg-brand-500 mt-1 rounded-full" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {lastScanTime && (
              <p className="text-[9px] font-bold text-zinc-400 italic">~Last scan {lastScanTime}~</p>
            )}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleShare}
                disabled={isGeneratingImage}
                className="flex items-center justify-center gap-1.5 text-[10px] font-black bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all shadow-sm disabled:opacity-50 active:scale-95"
              >
                {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                <span className="hidden md:inline uppercase tracking-wider">Share</span>
              </button>
              <button
                onClick={() => setIsInsightsModalOpen(true)}
                className="text-[10px] font-black bg-zinc-900 dark:bg-brand-600 text-white px-3 py-1.5 rounded-full hover:bg-zinc-800 dark:hover:bg-brand-500 transition-all shadow-md active:scale-95 uppercase tracking-wider"
              >
                AI Insights
              </button>
            </div>
          </div>
        </div>

        {/* Main Content: Score + 4 Stats */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6 relative z-10">
          {/* Left: Big Score & Mobile Summary */}
          <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-start lg:gap-10 gap-6">
            <div className="flex-shrink-0">
              <div className="flex items-end gap-1">
                <span className="text-6xl md:text-7xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{scoreInt}<span className="text-3xl md:text-4xl text-zinc-200 dark:text-zinc-700">.{scoreDec}%</span></span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black ${dailyHistory.length > 0 ? (isTrendPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400') : 'bg-zinc-50 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                  {dailyHistory.length > 0 ? (isTrendPositive ? <TrendingUp className="w-4 h-4" strokeWidth={3} /> : <TrendingDown className="w-4 h-4" strokeWidth={3} />) : null}
                  {dailyHistory.length > 0 ? (isTrendPositive ? '+' : '-') : ''}{dailyHistory.length > 0 ? trendAbs : '0.0'}%
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsTimeRangeDropdownOpen(!isTimeRangeDropdownOpen)}
                    className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all shadow-sm active:scale-95"
                  >
                    <span className="text-[11px] font-black text-zinc-400">/</span>
                    {isLoadingRange
                      ? <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />
                      : <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-300">{timeRange}</span>
                    }
                    <div className="flex flex-col ml-1">
                      <ChevronUp className={`w-2.5 h-2.5 text-zinc-400 transition-transform ${isTimeRangeDropdownOpen ? 'rotate-180' : ''}`} />
                      <ChevronDown className={`w-2.5 h-2.5 text-zinc-400 transition-transform ${isTimeRangeDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isTimeRangeDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsTimeRangeDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-28 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {(['30S', '1M', '15M', '1H', '24H', '7D', '30D'] as const).map((range) => (
                          <button
                            key={range}
                            onClick={() => {
                              setTimeRange(range);
                              setIsTimeRangeDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-[11px] font-black transition-colors
                              ${timeRange === range
                                ? 'bg-zinc-900 text-white dark:bg-brand-600 dark:text-white'
                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'}
                            `}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Metabolic Summary (Mobile Only - now stacks or side-by-side depending on width) */}
            <div className="lg:hidden w-full sm:w-auto flex flex-col items-stretch sm:items-end bg-zinc-50/50 dark:bg-zinc-800/50 backdrop-blur-xl px-4 py-3 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-700 shadow-sm">
              <div className="flex items-center justify-between sm:justify-end gap-4">
                {/* Sugar */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Activity className={`w-2.5 h-2.5 ${filteredConsumed > ledger.limit ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Sugar</span>
                  </div>
                  <div className="flex items-baseline gap-0.5 leading-none">
                    <span className={`text-xl font-black tracking-tighter ${filteredConsumed > ledger.limit ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>{Math.round(filteredConsumed)}</span>
                    <span className="text-[10px] font-bold text-zinc-400">g</span>
                  </div>
                </div>

                {/* Protein */}
                <div className="flex flex-col items-end border-l border-zinc-200 dark:border-zinc-700 pl-4">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Zap className="w-2.5 h-2.5 text-blue-500" />
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Prot</span>
                  </div>
                  <div className="flex items-baseline gap-0.5 leading-none">
                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{Math.round(dailyProtein)}</span>
                    <span className="text-[10px] font-bold text-zinc-400">g</span>
                  </div>
                </div>

                {/* Water */}
                <div className="flex flex-col items-end border-l border-zinc-200 dark:border-zinc-700 pl-4">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Droplet className="w-2.5 h-2.5 text-cyan-500" />
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">H2O</span>
                  </div>
                  <div className="flex items-baseline gap-0.5 leading-none">
                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tighter">{hydrationPercent}</span>
                    <span className="text-[10px] font-bold text-zinc-400">%</span>
                  </div>
                </div>
              </div>

              {/* Agent Goal Tracking */}
              <div className="mt-3 w-full flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-700 text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                <div className="flex items-center gap-1.5">
                  <Target className="w-2.5 h-2.5" />
                  {currentAgent.name}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-1 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${currentAgent.completion}%` }} />
                  </div>
                  <span className="min-w-[20px] text-right">{currentAgent.completion}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: 4 Quick Stats */}
          <div className="flex overflow-x-auto scrollbar-hide sm:grid sm:grid-cols-4 lg:grid-cols-4 gap-3 flex-1 pb-2 sm:pb-0">
            <div className="min-w-[85px] sm:min-w-0 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group/stat">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover/stat:scale-110 transition-transform">
                <Activity className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-base font-black text-zinc-900 dark:text-white leading-none">{avgGI || '-'}</span>
              <span className="text-[9px] font-black text-zinc-400 uppercase text-center leading-tight tracking-[0.1em]">Avg GI</span>
            </div>
            <div className="min-w-[85px] sm:min-w-0 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group/stat">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover/stat:scale-110 transition-transform">
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-base font-black text-zinc-900 dark:text-white leading-none">{insulinLoad}</span>
              <span className="text-[9px] font-black text-zinc-400 uppercase text-center leading-tight tracking-[0.1em]">Insulin</span>
            </div>
            <div className="min-w-[85px] sm:min-w-0 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group/stat">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center group-hover/stat:scale-110 transition-transform">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-base font-black text-zinc-900 dark:text-white leading-none">{dailyHistory.length === 0 ? 'Idle' : (metabolicTrend >= 0 ? 'Active' : 'Slow')}</span>
              <span className="text-[9px] font-black text-zinc-400 uppercase text-center leading-tight tracking-[0.1em]">Metab</span>
            </div>
            <div className="min-w-[85px] sm:min-w-0 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1.5 border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group/stat">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover/stat:scale-110 transition-transform">
                <Droplet className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-base font-black text-zinc-900 dark:text-white leading-none">{hydrationPercent}%</span>
              <span className="text-[9px] font-black text-zinc-400 uppercase text-center leading-tight tracking-[0.1em]">Water</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Macros & Energy (Professional Redesign) */}
        <div className="flex flex-col gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-800 relative z-10">
          {/* Header: Title & Main Score */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest leading-none mb-1">Energy Score</h3>
                <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Vitality & Readiness Index</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-zinc-400 uppercase mb-0.5 tracking-[0.2em]">Current Level</p>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{energyScore}</span>
                <span className="text-sm font-black text-zinc-300 dark:text-zinc-600">%</span>
              </div>
            </div>
          </div>

          {/* Tactical Progress Bar */}
          <div className="relative">
            {/* Segmented Bar */}
            <div className="flex h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
              <div className="bg-[#10B981] transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(16,185,129,0.4)]" style={{ width: `${recoveryPercent}%` }} />
              <div className="bg-[#3B82F6] transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(59,130,246,0.4)]" style={{ width: `${hydrationPercentBar}%` }} />
              <div className="bg-[#EF4444] transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(239,68,68,0.4)]" style={{ width: `${stressPercent}%` }} />
              <div className="bg-[#F59E0B] transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(245,158,11,0.4)]" style={{ width: `${glucosePercent}%` }} />
            </div>

            {/* Labels (Modern Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></div> Recovery
                </div>
                <span className="text-xs font-black text-zinc-900 dark:text-white pl-3">{recoveryPercent}%</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_8px_#3B82F6]"></div> Hydration
                </div>
                <span className="text-xs font-black text-zinc-900 dark:text-white pl-3">{hydrationPercentBar}%</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]"></div> Stress
                </div>
                <span className="text-xs font-black text-zinc-900 dark:text-white pl-3">{stressPercent}%</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]"></div> Glucose
                </div>
                <span className="text-xs font-black text-zinc-900 dark:text-white pl-3">{glucosePercent}%</span>
              </div>
            </div>
          </div>

          {/* Insight & Trend Footer */}
          <div className="grid grid-cols-2 gap-3 bg-zinc-50/50 rounded-2xl p-3 border border-zinc-100">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Performance Trend</span>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${energyTrend.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {energyTrend.isPositive ? '↑' : '↓'} {energyTrend.val}%
                </div>
                <span className="text-[9px] font-bold text-zinc-500">vs last {timeRange}{rangeMetrics ? '' : ' (est.)'}</span>
              </div>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Last Sync Status</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] font-black text-zinc-900">{lastScanTime || 'Ready to scan'}</span>
              </div>
            </div>
          </div>

          {/* Macros (Secondary Metrics) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-2 border border-zinc-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] font-bold text-zinc-400 uppercase">Sugar</span>
                <span className="text-[9px] font-black text-zinc-900">{Math.round(filteredConsumed)}g</span>
              </div>
              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${Math.min((filteredConsumed / ledger.limit) * 100, 100)}%` }}></div></div>
            </div>
            <div className="bg-white rounded-xl p-2 border border-zinc-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] font-bold text-zinc-400 uppercase">Protein</span>
                <span className="text-[9px] font-black text-zinc-900">{Math.round(dailyProtein)}g</span>
              </div>
              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.min((dailyProtein / 150) * 100, 100)}%` }}></div></div>
            </div>
            <div className="bg-white rounded-xl p-2 border border-zinc-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8px] font-bold text-zinc-400 uppercase">Carbs</span>
                <span className="text-[9px] font-black text-zinc-900">{Math.round(dailyCarbs)}g</span>
              </div>
              <div className="h-1 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${Math.min((dailyCarbs / 200) * 100, 100)}%` }}></div></div>
            </div>
          </div>

          {/* Burn Chart & Training Reminders (New Section) */}
          {trainingPlan && (
            <div className="mt-2 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-tight">Burn Progress</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-zinc-900">
                    {completedWorkouts.length} / {trainingPlan.schedule.filter(b => b.sugarImpact < 0).length}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase">Workouts</span>
                </div>
              </div>

              <div className="relative h-12 bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden p-1">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-lg transition-all duration-1000 ease-out relative"
                  style={{ width: `${Math.round((completedWorkouts.length / (trainingPlan.schedule.filter(b => b.sugarImpact < 0).length || 1)) * 100)}%` }}
                >
                  <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,white_2px,white_4px)]"></div>
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-[10px] font-black text-white drop-shadow-sm">
                      {Math.round((completedWorkouts.length / (trainingPlan.schedule.filter(b => b.sugarImpact < 0).length || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Training Reminders */}
              <div className="mt-3 flex flex-col gap-2">
                {trainingPlan.schedule.map((block, idx) => {
                  if (block.sugarImpact < 0 && !completedWorkouts.includes(idx)) {
                    return (
                      <div key={idx} className="flex items-center justify-between bg-zinc-50 rounded-xl p-2 border border-zinc-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          <div>
                            <p className="text-[9px] font-black text-zinc-900 leading-none">{block.activity}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase mt-0.5">Next Workout Reminder</p>
                          </div>
                        </div>
                        <button
                          onClick={() => onNavigate('training')}
                          className="text-[8px] font-black text-orange-600 bg-orange-50 px-2 py-1 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          START
                        </button>
                      </div>
                    );
                  }
                  return null;
                }).filter(Boolean).slice(0, 1)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Metabolic Insight (Replaces Slider) */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 mb-6 relative overflow-hidden">
        {(() => {
          const ad = adsData[0]; // Show the most relevant one (usually the first)
          return (
            <div key={ad.id} className="w-full relative">
              {/* Subtle background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${ad.color} opacity-[0.05]`}></div>

              <div className="flex flex-row items-center p-3 md:p-4 gap-3 relative z-10">
                {/* Image/Illustration */}
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden shadow-sm relative shrink-0 border border-white transition-transform duration-500">
                  <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>

                {/* Text Content */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`inline-flex items-center justify-center p-0.5 rounded bg-gradient-to-br ${ad.color} shadow-sm`}>
                      {React.cloneElement(ad.icon as React.ReactElement, { className: 'w-2.5 h-2.5 text-white' })}
                    </div>
                    <h3 className="text-[11px] font-black text-zinc-900 uppercase tracking-tight">{ad.title}</h3>
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-tight font-medium line-clamp-2">
                    {ad.text}
                  </p>
                  <button className="mt-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-zinc-400 hover:text-zinc-900 transition-colors">
                    View Report →
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 overflow-x-auto mb-6 px-4 md:px-8 -mx-4 md:mx-0 pb-3 snap-x scrollbar-hide">
        {[
          {
            label: 'Diet',
            action: () => onNavigate('diet'),
            gradient: 'from-cyan-400 to-sky-500',
            shadow: 'shadow-cyan-500/25',
            icon: <Utensils className="w-6 h-6 text-white" strokeWidth={2.5} />,
            graphic: (
              <>
                <div className="absolute top-0 right-0 w-7 h-7 bg-white/20 rounded-full -mr-2 -mt-2 blur-sm"></div>
                <div className="absolute bottom-0 left-0 w-5 h-5 bg-black/10 rounded-full -ml-1 -mb-1"></div>
              </>
            )
          },
          {
            label: 'Train',
            action: () => onNavigate('training'),
            gradient: 'from-sky-500 to-blue-600',
            shadow: 'shadow-sky-500/25',
            icon: <Zap className="w-6 h-6 text-white fill-white" strokeWidth={2.5} />,
            graphic: (
              <>
                <div className="absolute inset-0 bg-white/10 rotate-45 transform scale-150 opacity-20"></div>
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-white/30 rounded-full blur-[1px]"></div>
              </>
            )
          },
          {
            label: 'Intel',
            action: () => onNavigate('blog'),
            gradient: 'from-blue-500 to-indigo-600',
            shadow: 'shadow-blue-500/25',
            icon: <Brain className="w-6 h-6 text-white" strokeWidth={2.5} />,
            graphic: (
              <>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 border border-white/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-4 h-4 bg-white/20 rounded-full blur-sm"></div>
              </>
            )
          },
          {
            label: 'Bio',
            action: () => onNavigate('medical'),
            gradient: 'from-teal-400 to-emerald-500',
            shadow: 'shadow-teal-500/25',
            icon: <Dna className="w-6 h-6 text-white" strokeWidth={2.5} />,
            graphic: (
              <>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 border-2 border-white/20 rounded-full skew-x-12"></div>
                <div className="absolute top-2 right-3 w-2 h-2 bg-white/40 rounded-full"></div>
                <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-white/30 rounded-full"></div>
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/20 rotate-45"></div>
              </>
            )
          },
          {
            label: 'Status',
            action: () => onNavigate('status'),
            gradient: 'from-violet-500 to-purple-600',
            shadow: 'shadow-violet-500/25',
            icon: <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.5} />,
            graphic: (
              <>
                <div className="absolute inset-0 border-[2.5px] border-white/10 rounded-2xl scale-75"></div>
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/40 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/40 rounded-bl-lg"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/50 rounded-full shadow-[0_0_7px_rgba(255,255,255,0.8)]"></div>
              </>
            )
          },
          {
            label: 'Track',
            action: () => onNavigate('track'),
            gradient: 'from-rose-500 to-red-600',
            shadow: 'shadow-rose-500/25',
            icon: <PlusCircle className="w-6 h-6 text-white" strokeWidth={2.5} />,
            graphic: (
              <>
                <div className="absolute inset-0 border-2 border-white/10 rounded-2xl scale-75"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-7 bg-white/20"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-1 bg-white/20"></div>
              </>
            )
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="flex flex-col items-center gap-2 group min-w-[68px] snap-center"
          >
            <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg ${item.shadow} transition-all duration-300 group-hover:scale-110 group-active:scale-95 border-[2.5px] border-white overflow-hidden`}>
              {item.graphic}
              <div className="relative z-10 drop-shadow-md">
                {item.icon}
              </div>
            </div>
            <span className="text-xs font-bold text-zinc-600 group-hover:text-zinc-900 transition-colors uppercase tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Row (Compact Bento Grid) */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Calories */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-zinc-100 dark:border-zinc-800 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 p-1.5 opacity-5 group-hover:opacity-10 transition-opacity">
            <Flame className="w-14 h-14 text-brand-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                <Flame className="w-3 h-3 text-brand-600 dark:text-brand-400 fill-brand-600 dark:fill-brand-400" />
              </div>
              <span className="text-[9px] font-black text-zinc-400 tracking-[0.1em] uppercase">CALORIES</span>
            </div>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{(Math.round(consumedCals * 10) / 10).toLocaleString()}</span>
              <span className="text-xs font-black text-zinc-400 leading-none">/ {(targetCals / 1000).toFixed(1)}k</span>
            </div>
          </div>
          <div className="relative z-10">
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="text-[8px] text-zinc-400 text-right font-black uppercase tracking-widest">{remainingCals > 0 ? `${remainingCals} kcal left` : `${Math.abs(remainingCals)} kcal over`}</div>
          </div>
        </div>

        {/* Macros */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-between group">
          <div className="text-[9px] font-black text-zinc-400 tracking-[0.1em] uppercase mb-3 w-full text-center">MACROS</div>
          <div className="flex items-end justify-center gap-2 h-20 sm:h-24 w-full mb-1.5">
            {/* Protein */}
            <div className="flex flex-col items-center gap-2 h-full justify-end w-1/4 group/bar">
              <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl relative overflow-hidden h-full">
                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-xl transition-all duration-700 ease-out" style={{ height: `${Math.min(((dashboardData?.nutrition?.summary?.protein || ledger.macros?.protein || 0) / (dashboardData?.nutrition?.summary?.proteinTarget || 150)) * 100, 100)}%` }}></div>
              </div>
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">PRO</span>
            </div>
            {/* Carbs */}
            <div className="flex flex-col items-center gap-2 h-full justify-end w-1/4 group/bar">
              <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl relative overflow-hidden h-full">
                <div className="absolute bottom-0 left-0 right-0 bg-orange-500 rounded-xl transition-all duration-700 ease-out" style={{ height: `${Math.min(((dashboardData?.nutrition?.summary?.carbs || ledger.macros?.carbs || 0) / (dashboardData?.nutrition?.summary?.carbsTarget || 200)) * 100, 100)}%` }}></div>
              </div>
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">CHO</span>
            </div>
            {/* Fat */}
            <div className="flex flex-col items-center gap-2 h-full justify-end w-1/4 group/bar">
              <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl relative overflow-hidden h-full">
                <div className="absolute bottom-0 left-0 right-0 bg-rose-500 rounded-xl transition-all duration-700 ease-out" style={{ height: `${Math.min(((dashboardData?.nutrition?.summary?.fat || ledger.macros?.fat || 0) / (dashboardData?.nutrition?.summary?.fatTarget || 80)) * 100, 100)}%` }}></div>
              </div>
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">FAT</span>
            </div>
            {/* Fiber */}
            <div className="flex flex-col items-center gap-2 h-full justify-end w-1/4 group/bar">
              <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-xl relative overflow-hidden h-full">
                <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-xl transition-all duration-700 ease-out" style={{ height: `${Math.min(((dashboardData?.nutrition?.specific?.fiber || ledger.macros?.fiber || 0) / (dashboardData?.nutrition?.specific?.fiberTarget || 30)) * 100, 100)}%` }}></div>
              </div>
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider">FIB</span>
            </div>
          </div>
        </div>
      </div>



      {/* Specific Nutrients (Modern Horizontal Scroll) */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Specific Nutrients</h3>
              <p className="text-[9px] font-bold text-zinc-400 uppercase">Micronutrient Intelligence</p>
            </div>
          </div>
          <button
            onClick={() => setShowAllNutrients(true)}
            className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-wider bg-brand-50 dark:bg-brand-500/10 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-all active:scale-95"
          >
            View All
          </button>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-6 px-4 -mx-4 scrollbar-hide">
          {vitamins.map((vit, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-zinc-100 dark:border-zinc-800 min-w-[140px] flex-shrink-0 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-2xl ${vit.color || 'bg-brand-400'} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
                  {vit.icon || '💊'}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-black text-zinc-900 dark:text-white">{vit.percent}%</span>
                  <div className="w-8 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full ${vit.color?.replace('bg-', 'bg-') || 'bg-brand-500'}`}
                      style={{ width: `${Math.min(vit.percent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="font-black text-zinc-900 dark:text-white text-xs mb-1 tracking-tight">{vit.name}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{vit.amount}</div>
            </div>
          ))}
        </div>
      </div>



      {/* All Nutrients Modal (Modern Redesign) */}
      {showAllNutrients && (
        <div className="fixed inset-0 z-[110] flex flex-col bg-white dark:bg-zinc-950 animate-in fade-in slide-in-from-bottom-10 duration-500">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Nutritional Intelligence</h3>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Full Micronutrient Breakdown</p>
              </div>
            </div>
            <button
              onClick={() => setShowAllNutrients(false)}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 dark:bg-zinc-950/50">
            <div className="max-w-[2000px] mx-auto px-4 space-y-10 pb-20">
              {/* Summary Card */}
              <div className="p-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-[2.5rem] shadow-xl shadow-brand-500/20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Info className="w-5 h-5 text-white" />
                    </div>
                    <h5 className="font-black uppercase tracking-[0.2em] text-xs">Analysis Overview</h5>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-90">
                    Your daily micronutrient profile is calculated from your logged meals.
                    Optimal levels of vitamins and minerals are essential for metabolic efficiency,
                    hormonal balance, and sustained cognitive performance.
                  </p>
                </div>
              </div>

              {/* Categories */}
              {['Vitamins', 'Minerals', 'Other'].map(cat => {
                const catVits = vitamins.filter(v => v.category === cat);
                if (catVits.length === 0) return null;

                return (
                  <div key={cat} className="space-y-6">
                    <div className="flex items-center gap-4 px-2">
                      <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em]">{cat}</h4>
                      <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {catVits.map((vit, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-2xl ${vit.color || 'bg-brand-400'} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                              {vit.icon || '💊'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-black text-zinc-900 dark:text-white truncate text-sm">{vit.name}</span>
                                <span className="text-xs font-black text-brand-600 dark:text-brand-400">{vit.percent}%</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{vit.amount}</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${vit.color?.replace('bg-', 'bg-') || 'bg-brand-500'} shadow-[0_0_8px_rgba(0,0,0,0.1)] transition-all duration-1000`}
                              style={{ width: `${Math.min(vit.percent, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- GLYCEMIC TIMELINE & HISTORY LOG (Modern Redesign) --- */}
      <div className="mb-8 relative">
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <h2 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em] mb-0.5">Glycemic Timeline</h2>
            <p className="text-[8px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest">Real-time Glucose Impact</p>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-3 py-1.5 shadow-sm">
            <Calendar className="w-3 h-3 text-zinc-400" />
            <span className="text-[8px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Interactive Timeline Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-2 md:p-3 shadow-[0_2px_10px_rgb(0,0,0,0.03)] dark:shadow-none border border-zinc-100 dark:border-zinc-800 h-40 relative mb-3 overflow-hidden group">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-zinc-500/10 transition-colors duration-700"></div>

          {dailyHistory.length > 0 ? (
            <div className="flex items-end gap-2 h-full overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide relative z-10">
              {dailyHistory.map((item, idx) => {
                const isSelected = selectedHistoryItem?.id === item.id;
                const sugarValue = item.sugar || item.sugarg || 0;
                const heightPercent = Math.min((sugarValue / 50) * 100, 100);

                const foodColor = getFoodColor(item.name || 'Food');

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedHistoryItem(item)}
                    className="group/bar flex flex-col items-center justify-end h-full gap-1 min-w-[40px] relative transition-all duration-500"
                  >
                    {/* Value Label */}
                    <div className={`absolute -top-1 transition-all duration-500 ${isSelected ? 'opacity-100 -translate-y-1' : 'opacity-0 translate-y-1 group-hover/bar:opacity-100 group-hover/bar:-translate-y-1'}`}>
                      <span className="text-zinc-900 dark:text-white font-black text-xs tracking-tighter" style={{ color: isSelected ? foodColor : undefined }}>
                        {Math.round(sugarValue)}<span className="text-[8px] text-zinc-400 ml-0.5">g</span>
                      </span>
                    </div>

                    {/* Bar Container */}
                    <div className="relative w-full flex-1 flex flex-col justify-end">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 relative overflow-hidden flex items-end ${isSelected
                          ? 'shadow-[0_0_10px_rgba(0,0,0,0.1)]'
                          : 'hover:opacity-90'
                          }`}
                        style={{
                          height: `${Math.max(heightPercent, 25)}%`,
                          backgroundColor: foodColor,
                          boxShadow: isSelected ? `0 0 10px ${foodColor}30` : undefined
                        }}
                      >
                        {/* Image Preview */}
                        <div className={`absolute inset-[1px] rounded-md overflow-hidden transition-all duration-500 ${isSelected ? 'opacity-50 scale-105' : 'opacity-30 grayscale group-hover/bar:grayscale-0 group-hover/bar:opacity-70'}`}>
                          <img src={item.imageBase64 ? `data:image/jpeg;base64,${item.imageBase64}` : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"} className="w-full h-full object-cover" />
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                        )}
                      </div>
                    </div>

                    {/* Time Label */}
                    <div className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full transition-all duration-300 ${isSelected ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm' : 'text-zinc-400 group-hover/bar:text-zinc-600 dark:group-hover/bar:text-zinc-300'}`}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 relative z-10">
              <div className="w-16 h-16 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                <Activity className="w-8 h-8 text-zinc-200 dark:text-zinc-700" />
              </div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">No Activity Logged Today</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Item Detail Modal */}



      {/* Selected Item Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedHistoryItem(null)}>
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedHistoryItem(null)}
              className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors z-10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* --- IMAGE EVIDENCE --- */}
            {selectedHistoryItem.imageBase64 && (
              <div className="w-full h-48 rounded-2xl overflow-hidden mb-4 shadow-sm border border-zinc-100 dark:border-zinc-800 relative group">
                <img
                  src={`data:image/jpeg;base64,${selectedHistoryItem.imageBase64}`}
                  alt="Scanned Item"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            )}

            {/* --- HEADER: TIME & TYPE --- */}
            <div className="flex items-center gap-3 mb-1">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                {new Date(selectedHistoryItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${selectedHistoryItem.itemType === 'drink'
                ? 'bg-blue-50 text-blue-600 border-blue-100'
                : 'bg-orange-50 text-orange-600 border-orange-100'
                }`}>
                {selectedHistoryItem.itemType || 'FOOD'}
              </span>
            </div>

            {/* --- TITLE --- */}
            <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-tight mb-2">{selectedHistoryItem.name}</h2>

            {/* --- ACTION BADGE --- */}
            <div className="mb-6">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${selectedHistoryItem.action === 'consumed'
                ? 'bg-rose-100 text-rose-600'
                : selectedHistoryItem.action === 'rejected'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-indigo-100 text-indigo-600'
                }`}>
                {selectedHistoryItem.action}
              </span>
            </div>

            {/* --- TOP STATS CARDS --- */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-8 h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17 19c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1h-4v-4c0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1v11c0 .55.45 1 1 1h11zM5 19V7h6v5h5v6H5z" /></svg>
                </div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  Sugar
                </span>
                <div className="text-xl font-black text-zinc-900 dark:text-white z-10">
                  {selectedHistoryItem.sugarg}<span className="text-xs text-zinc-500 font-medium ml-0.5">g</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-8 h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" /></svg>
                </div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  GI
                </span>
                <div className={`text-xl font-black z-10 ${(selectedHistoryItem.glycemicIndex || 0) > 70 ? 'text-rose-500' : (selectedHistoryItem.glycemicIndex || 0) > 55 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                  {selectedHistoryItem.glycemicIndex || '-'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg className="w-8 h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" /></svg>
                </div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                  Cals
                </span>
                <div className="text-xl font-black text-zinc-900 dark:text-white z-10">
                  {selectedHistoryItem.calories || 0}
                </div>
              </div>
            </div>

            {/* --- MACRO & MICRO NUTRIENTS --- */}
            {(selectedHistoryItem.macros || (selectedHistoryItem.vitamins && selectedHistoryItem.vitamins.length > 0)) && (
              <div className="bg-zinc-50 dark:bg-zinc-950 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 mb-6">

                {/* Macros */}
                {selectedHistoryItem.macros && (
                  <div className="mb-5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Macros
                      </span>
                    </div>
                    <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner mb-4">
                      <div style={{ width: `${(selectedHistoryItem.macros.protein / ((selectedHistoryItem.macros.protein + selectedHistoryItem.macros.carbs + selectedHistoryItem.macros.fat + (selectedHistoryItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-blue-500"></div>
                      <div style={{ width: `${(selectedHistoryItem.macros.carbs / ((selectedHistoryItem.macros.protein + selectedHistoryItem.macros.carbs + selectedHistoryItem.macros.fat + (selectedHistoryItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-orange-500"></div>
                      <div style={{ width: `${(selectedHistoryItem.macros.fat / ((selectedHistoryItem.macros.protein + selectedHistoryItem.macros.carbs + selectedHistoryItem.macros.fat + (selectedHistoryItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-rose-500"></div>
                      {selectedHistoryItem.macros.fiber !== undefined && selectedHistoryItem.macros.fiber > 0 && (
                        <div style={{ width: `${(selectedHistoryItem.macros.fiber / ((selectedHistoryItem.macros.protein + selectedHistoryItem.macros.carbs + selectedHistoryItem.macros.fat + selectedHistoryItem.macros.fiber) || 1)) * 100}%` }} className="h-full bg-emerald-500"></div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-500">
                          <Dumbbell className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Protein</span>
                          <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{selectedHistoryItem.macros.protein}g</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-500/20 text-orange-500">
                          <Wheat className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Carbs</span>
                          <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{selectedHistoryItem.macros.carbs}g</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-500">
                          <Droplet className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Fat</span>
                          <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{selectedHistoryItem.macros.fat}g</span>
                        </div>
                      </div>
                      {selectedHistoryItem.macros.fiber !== undefined && selectedHistoryItem.macros.fiber > 0 && (
                        <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500">
                            <Leaf className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Fiber</span>
                            <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{selectedHistoryItem.macros.fiber.toFixed(1)}g</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {(selectedHistoryItem.macros && selectedHistoryItem.vitamins && selectedHistoryItem.vitamins.length > 0) && (
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full my-4 border-dashed border-t"></div>
                )}

                {/* Micros */}
                {selectedHistoryItem.vitamins && selectedHistoryItem.vitamins.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      Micros
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedHistoryItem.vitamins.map((v, i) => (
                        <div key={i} className="px-2 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">{v.name}</span>
                          <span className="text-[9px] font-black text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 px-1 rounded">{v.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- AI VERDICT --- */}
            <div className="bg-teal-50 dark:bg-teal-900/10 rounded-xl p-4 border-l-2 border-teal-500 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-3 h-3 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-wider">AI Verdict</span>
              </div>
              <p className="text-sm font-medium text-teal-900 dark:text-teal-100 leading-snug">
                "{selectedHistoryItem.aiVerdict}"
              </p>
            </div>

          </div>
        </div>
      )}

      {/* AI Insights Modal */}
      {isInsightsModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsInsightsModalOpen(false)}>
          <div
            className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsInsightsModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 leading-tight">AI Health Insights</h3>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Dr. Moriesly Analysis</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`${dailyHistory.length === 0 ? 'bg-zinc-50 border-zinc-100' : isTrendPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} rounded-2xl p-4 border`}>
                <h4 className={`text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-2 ${dailyHistory.length === 0 ? 'text-zinc-600' : isTrendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {dailyHistory.length === 0 ? <Activity className="w-4 h-4" /> : isTrendPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {dailyHistory.length === 0 ? 'Awaiting Data' : `Health Score ${isTrendPositive ? 'Increase' : 'Drop'} (${isTrendPositive ? '+' : '-'}${trendAbs}%)`}
                </h4>
                <p className={`text-sm font-medium leading-relaxed ${dailyHistory.length === 0 ? 'text-zinc-600' : isTrendPositive ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {dailyHistory.length === 0
                    ? "You haven't consumed anything yet today. Log your first meal or drink to activate your metabolic tracking."
                    : isTrendPositive
                      ? `Your metabolic health improved by ${trendAbs}% recently. Your latest consumption had a positive impact on your metabolism. Keep maintaining a balanced intake!`
                      : `Your metabolic health dropped by ${trendAbs}% recently. Please monitor your sugar intake and maintain your metabolism indicators. Feel free to connect with us via a chat session if you feel unwell.`
                  }
                </p>
              </div>

              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider mb-2">Detailed Feedback</h4>
                <ul className="text-sm font-medium text-zinc-700 space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <span><strong>Hydration Risk:</strong> Drink more water before meals to maintain focus and aid in metabolic processing of sugars.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0"></div>
                    <span><strong>Glycemic Load:</strong> Your average GI is {avgGI || 'optimal'}. Try to balance high GI foods with fiber to prevent insulin spikes.</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setIsInsightsModalOpen(false)}
              className="w-full mt-6 bg-zinc-900 text-white rounded-xl py-3 font-bold text-sm hover:bg-zinc-800 transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && shareImage && (
        <div className="fixed inset-0 z-[200] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsShareModalOpen(false)}>
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-5 md:p-6 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide relative animate-in zoom-in-95 duration-300 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-3 right-3 md:top-4 md:right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-2 md:mb-3 shrink-0 mt-2">
              <Star className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 dark:text-emerald-400 fill-emerald-500 dark:fill-emerald-400" />
            </div>
            <h3 className="text-lg md:text-xl font-black text-zinc-900 dark:text-white leading-tight mb-1">Achievement Ready</h3>
            <p className="text-[10px] md:text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4 md:mb-6 text-center">Share your metabolic progress with the world.</p>

            <div className="w-full rounded-2xl overflow-hidden shadow-sm dark:shadow-[0_0_40px_rgba(16,185,129,0.15)] mb-4 md:mb-6 bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 shrink-0">
              <img src={shareImage} alt="Health Score Preview" className="w-full h-auto object-contain" />
            </div>

            <div className="w-full flex flex-col gap-2.5 md:gap-3 shrink-0">
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-3 md:py-3.5 font-bold text-sm hover:bg-[#20bd5a] transition-colors shadow-lg shadow-[#25D366]/20"
              >
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                Share to WhatsApp
              </button>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl py-3 md:py-3.5 font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5" />
                Download Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Share Card for Image Generation (Premium Redesign) */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div
          ref={shareCardRef}
          className="w-[450px] bg-white dark:bg-zinc-950 rounded-[3rem] p-10 text-zinc-900 dark:text-white relative overflow-hidden"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Background Accents (Premium Glow) */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>

          {/* Header */}
          <div className="flex justify-between items-center mb-12 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white dark:text-zinc-900" />
              </div>
              <div>
                <span className="font-black tracking-[0.2em] uppercase text-xs block">Moriesly</span>
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Metabolic Intelligence</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <span className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">{new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Main Score Display */}
          <div className="mb-12 relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 flex-1"></div>
              <h2 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em]">Daily Performance</h2>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="relative inline-block">
                <span className="text-9xl font-black tracking-tighter leading-none block mb-2">
                  {scoreInt}<span className="text-5xl text-zinc-300 dark:text-zinc-700">.{scoreDec}</span>
                </span>
                <div className={`absolute -right-4 top-4 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg ${isTrendPositive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {isTrendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isTrendPositive ? '+' : '-'}{trendAbs}%
                </div>
              </div>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.4em] mt-2">Metabolic Score</p>
            </div>
          </div>

          {/* Achievement Summary */}
          <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-[2rem] p-6 mb-10 relative z-10 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Achievement Unlocked</span>
            </div>
            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
              "{metabolicScore >= 80 ? "Exceptional metabolic control today! Your energy levels are optimized for peak performance." :
                metabolicScore >= 50 ? "Solid metabolic balance achieved. Consistent monitoring is the key to long-term vitality." :
                  "A day of learning. Focus on hydration and nutrient-dense foods to reset your baseline."}"
            </p>
          </div>

          {/* Grid Stats (Modern Bento) */}
          <div className="grid grid-cols-2 gap-4 mb-12 relative z-10">
            <div className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Energy</span>
              </div>
              <div className="text-2xl font-black">{Math.round(dailyCalories)} <span className="text-xs text-zinc-300">kcal</span></div>
            </div>
            <div className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Protein</span>
              </div>
              <div className="text-2xl font-black">{Math.round(dailyProtein)}<span className="text-xs text-zinc-300">g</span></div>
            </div>
            <div className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Droplet className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Hydration</span>
              </div>
              <div className="text-2xl font-black">{hydrationPercent}<span className="text-xs text-zinc-300">%</span></div>
            </div>
            <div className="bg-white dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-rose-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Sugar</span>
              </div>
              <div className="text-2xl font-black">{Math.round(filteredConsumed)}<span className="text-xs text-zinc-300">g</span></div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-8 border-t border-zinc-100 dark:border-white/10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 shadow-md">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userStats.name}`} alt="Avatar" className="w-full h-full" />
              </div>
              <div>
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">{userStats.name}</span>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Active Member</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em]">moriesly.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
