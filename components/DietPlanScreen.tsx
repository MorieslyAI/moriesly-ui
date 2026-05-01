
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DietPlan, WeeklyPlan, UserProfile, MealItem } from '../types';
import {
  generateDailyDietPlan,
  generateWeeklyDietPlan,
  swapDietMeal,
  getActiveDietPlans,
  markDietMealConsumed,
  type DietPlanResponse,
  type WeeklyPlanResponse,
} from '../services/api';

interface DietPlanScreenProps {
    userProfile: UserProfile;
    onAddXp: (amount: number) => void;
    // New Props for State Hoisting
    dietPlan: DietPlan | null;
    setDietPlan: (plan: DietPlan | null) => void;
}

const DIET_CATEGORIES = [
    {
        id: 'fat_loss',
        title: 'Operation Shred',
        desc: 'Aggressive fat loss via caloric deficit. High protein to spare muscle.',
        icon: '🔥',
        recommendFor: (bmi: number) => bmi > 25
    },
    {
        id: 'muscle',
        title: 'Iron Clad Bulk',
        desc: 'Hypertrophy focus. Caloric surplus with strict macro ratios.',
        icon: '🥩',
        recommendFor: (bmi: number) => bmi < 18.5
    },
    {
        id: 'maintenance',
        title: 'Vitality Ops',
        desc: 'Performance maintenance. Balanced macros for sustained energy.',
        icon: '⚡',
        recommendFor: (bmi: number) => bmi >= 18.5 && bmi <= 25
    },
    {
        id: 'keto',
        title: 'Ketogenic Stealth',
        desc: 'Metabolic shift. High fat, ultra-low carb to eliminate glucose spikes.',
        icon: '🥑',
        recommendFor: () => false 
    }
];

// --- IMPROVED VISUALIZER COMPONENT ---
const MealVisualizer: React.FC<{ name: string, type: string, isCompleted: boolean }> = ({ name, type, isCompleted }) => {
    const getVisuals = () => {
        const n = (name || '').toLowerCase();
        let icon = '🍱'; // Default Bento
        let label = 'RATION';
        let color = 'text-zinc-500';
        let bgGradient = 'from-zinc-800 to-zinc-900';

        // --- PROTEIN HEAVY ---
        if (n.match(/beef|steak|burger|meat|mutton|lamb|ribs/)) {
            icon = '🥩'; label = 'RED MEAT'; color = 'text-rose-500'; bgGradient = 'from-rose-900/40 to-zinc-900';
        } else if (n.match(/chicken|turkey|duck|wings|nugget|breast/)) {
            icon = '🍗'; label = 'POULTRY'; color = 'text-orange-500'; bgGradient = 'from-orange-900/40 to-zinc-900';
        } else if (n.match(/pork|bacon|ham|sausage|hotdog|pepperoni/)) {
            icon = '🥓'; label = 'CURED MEAT'; color = 'text-rose-400'; bgGradient = 'from-rose-900/30 to-zinc-900';
        } else if (n.match(/fish|salmon|tuna|sushi|sashimi|seafood|shrimp|prawn|crab|lobster|calamari/)) {
            icon = '🐟'; label = 'MARINE'; color = 'text-blue-500'; bgGradient = 'from-blue-900/40 to-zinc-900';
        } else if (n.match(/egg|omelet|scramble|frittata|boiled/)) {
            icon = '🍳'; label = 'PROTEIN'; color = 'text-yellow-500'; bgGradient = 'from-yellow-900/40 to-zinc-900';
        } 
        // --- PLANT PROTEIN ---
        else if (n.match(/tofu|tempeh|lentil|bean|chickpea|falafel|hummus/)) {
            icon = '🥙'; label = 'PLANT PROTEIN'; color = 'text-emerald-600'; bgGradient = 'from-emerald-900/30 to-zinc-900';
        }
        // --- CARBS & GRAINS ---
        else if (n.match(/rice|risotto|pilaf|quinoa|bowl|donburi/)) {
            icon = '🍚'; label = 'GRAIN'; color = 'text-zinc-300'; bgGradient = 'from-zinc-700/40 to-zinc-900';
        } else if (n.match(/pasta|spaghetti|fettuccine|penne|macaroni|noodle|ramen|chow mein|lo mein|soba|udon/)) {
            icon = '🍝'; label = 'CARB LOAD'; color = 'text-yellow-600'; bgGradient = 'from-yellow-900/30 to-zinc-900';
        } else if (n.match(/bread|toast|sandwich|bagel|bun|croissant|pastry|roll/)) {
            icon = '🥪'; label = 'WHEAT'; color = 'text-amber-500'; bgGradient = 'from-amber-900/40 to-zinc-900';
        } else if (n.match(/pizza|flatbread/)) {
            icon = '🍕'; label = 'COMPLEX'; color = 'text-orange-600'; bgGradient = 'from-orange-900/40 to-zinc-900';
        } else if (n.match(/wrap|burrito|taco|quesadilla|nacho|fajita/)) {
            icon = '🌮'; label = 'HYBRID'; color = 'text-amber-500'; bgGradient = 'from-amber-900/40 to-zinc-900';
        } else if (n.match(/potato|fries|wedge|hash|mash/)) {
            icon = '🍟'; label = 'STARCH'; color = 'text-yellow-500'; bgGradient = 'from-yellow-900/30 to-zinc-900';
        }
        // --- BREAKFAST ---
        else if (n.match(/oat|porridge|cereal|granola|muesli/)) {
            icon = '🥣'; label = 'FIBER'; color = 'text-amber-300'; bgGradient = 'from-amber-900/30 to-zinc-900';
        } else if (n.match(/pancake|waffle|crepe|french toast/)) {
            icon = '🥞'; label = 'GRIDDLE'; color = 'text-orange-300'; bgGradient = 'from-orange-900/30 to-zinc-900';
        }
        // --- FRESH ---
        else if (n.match(/salad|spinach|kale|lettuce|arugula|greens|veg|broccoli|asparagus/)) {
            icon = '🥗'; label = 'GREENS'; color = 'text-emerald-500'; bgGradient = 'from-emerald-900/40 to-zinc-900';
        } else if (n.match(/fruit|apple|banana|berry|orange|grape|melon|pear/)) {
            icon = '🍎'; label = 'FRUCTOSE'; color = 'text-red-400'; bgGradient = 'from-red-900/30 to-zinc-900';
        } else if (n.match(/avocado|guac/)) {
            icon = '🥑'; label = 'HEALTHY FAT'; color = 'text-emerald-400'; bgGradient = 'from-emerald-900/30 to-zinc-900';
        }
        // --- LIQUIDS ---
        else if (n.match(/smoothie|shake|protein/)) {
            icon = '🥤'; label = 'LIQUID FUEL'; color = 'text-purple-500'; bgGradient = 'from-purple-900/40 to-zinc-900';
        } else if (n.match(/coffee|espresso|latte|cappuccino|macchiato/)) {
            icon = '☕'; label = 'CAFFEINE'; color = 'text-amber-700'; bgGradient = 'from-amber-950/50 to-zinc-900';
        } else if (n.match(/tea|matcha|chai/)) {
            icon = '🍵'; label = 'INFUSION'; color = 'text-emerald-400'; bgGradient = 'from-emerald-900/30 to-zinc-900';
        } else if (n.match(/juice|soda|coke|drink|water|lemonade/)) {
            icon = '🧃'; label = 'HYDRATION'; color = 'text-blue-400'; bgGradient = 'from-blue-900/30 to-zinc-900';
        } else if (n.match(/soup|stew|curry|broth|chili|chowder/)) {
            icon = '🍲'; label = 'HOT POT'; color = 'text-orange-400'; bgGradient = 'from-orange-900/30 to-zinc-900';
        }
        // --- TREATS ---
        else if (n.match(/cake|cookie|donut|brownie|muffin|pie|tart/)) {
            icon = '🧁'; label = 'SUGAR LOAD'; color = 'text-pink-400'; bgGradient = 'from-pink-900/30 to-zinc-900';
        } else if (n.match(/ice cream|gelato|sorbet|yogurt|parfait/)) {
            icon = '🍦'; label = 'COLD SWEET'; color = 'text-pink-300'; bgGradient = 'from-pink-900/20 to-zinc-900';
        } else if (n.match(/chocolate|candy|sweet/)) {
            icon = '🍫'; label = 'DANGER'; color = 'text-amber-800'; bgGradient = 'from-amber-950/40 to-zinc-900';
        }

        return { icon, label, color, bgGradient };
    };

    const { icon, label, color, bgGradient } = getVisuals();

    return (
        <div className={`w-full h-full relative overflow-hidden bg-gradient-to-br ${bgGradient} flex items-center justify-center group`}>
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
            
            {/* Animated Ring */}
            <div className={`absolute w-24 h-24 rounded-full border-2 border-dashed opacity-20 animate-[spin_10s_linear_infinite] ${color.replace('text', 'border')}`}></div>

            {/* The Icon */}
            <div className={`text-6xl filter drop-shadow-2xl transform transition-transform duration-500 group-hover:scale-110 ${isCompleted ? 'grayscale opacity-50' : ''}`}>
                {icon}
            </div>

            {/* Label Badge */}
            <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded backdrop-blur-md border border-white/10 ${
                    type === 'Breakfast' ? 'bg-orange-500/20 text-orange-200' : 
                    type === 'Lunch' ? 'bg-teal-500/20 text-teal-200' : 
                    'bg-purple-500/20 text-purple-200'
                }`}>
                    {type}
                </span>
                <span className="text-[8px] font-mono text-white/50 bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-widest border border-white/5">
                    {label}
                </span>
            </div>

            {isCompleted && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-10">
                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-full font-black uppercase text-xs tracking-widest shadow-lg transform -rotate-12 border-2 border-white">
                        CONSUMED
                    </div>
                </div>
            )}
        </div>
    );
};

const DietPlanScreen: React.FC<DietPlanScreenProps> = ({ userProfile, onAddXp, dietPlan, setDietPlan }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'shop'>('daily');
  const [inputMode, setInputMode] = useState<'auto' | 'manual'>('auto');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [manualGoal, setManualGoal] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [loadingSwap, setLoadingSwap] = useState<number | null>(null);

  // Active plan ID (used to update Firestore on swap)
  const [activeDailyPlanId, setActiveDailyPlanId] = useState<string | null>(null);

  // Flag apakah user masih boleh generate
  const [canGenerateDaily, setCanGenerateDaily] = useState(true);
  const [canGenerateWeekly, setCanGenerateWeekly] = useState(true);
  const [lockedUntilDaily, setLockedUntilDaily] = useState<Date | null>(null);
  const [lockedUntilWeekly, setLockedUntilWeekly] = useState<Date | null>(null);

  // Countdown terpisah
  const [countdownDaily, setCountdownDaily] = useState('');
  const [countdownWeekly, setCountdownWeekly] = useState('');
  
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  
  // Toggle for showing recipe details
  const [showRecipe, setShowRecipe] = useState<number | null>(null);

  // --- VERIFICATION STATE (NEW) ---
  const [completedMealIndices, setCompletedMealIndices] = useState<number[]>([]);
  const [verifyingMeal, setVerifyingMeal] = useState<number | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  
  // --- VERIFICATION STATE (WEEKLY) ---
  const [completedWeeklyIndices, setCompletedWeeklyIndices] = useState<string[]>([]); // Format: "dayIdx-mealIdx"
  const [verifyingWeeklyMeal, setVerifyingWeeklyMeal] = useState<{d: number, m: number} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Load Active Plans from Backend on Mount ---
  useEffect(() => {
    async function loadActivePlans() {
      try {
        setIsLoadingActive(true);
        const res = await getActiveDietPlans();
        if (res.daily) {
          setDietPlan(res.daily as unknown as DietPlan);
          setActiveDailyPlanId(res.daily.id);
          setSelectedCategory(res.daily.category || '');
          // Restore consumed status from Firestore
          setCompletedMealIndices(res.daily.consumedMealIndices ?? []);
        }
        if (res.weekly) {
          setWeeklyPlan({
            id: res.weekly.id,
            weekName: res.weekly.weekName,
            days: res.weekly.days,
          } as WeeklyPlan);
          if (!res.daily) setSelectedCategory(res.weekly.category || '');
          // Restore consumed status from Firestore
          setCompletedWeeklyIndices(res.weekly.consumedMealKeys ?? []);
        }
        setCanGenerateDaily(res.canGenerateDaily);
        setCanGenerateWeekly(res.canGenerateWeekly);
        setLockedUntilDaily(new Date(res.lockedUntilDaily));
        setLockedUntilWeekly(new Date(res.lockedUntilWeekly));
      } catch (err) {
        console.error('Failed to load active diet plans:', err);
      } finally {
        setIsLoadingActive(false);
      }
    }
    loadActivePlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Countdown ticker (satu interval, update keduanya) ---
  useEffect(() => {
    const fmt = (diff: number) => {
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const tick = () => {
      const now = Date.now();

      if (lockedUntilDaily) {
        const diff = lockedUntilDaily.getTime() - now;
        if (diff <= 0) { setCanGenerateDaily(true); setCountdownDaily(''); }
        else setCountdownDaily(fmt(diff));
      }

      if (lockedUntilWeekly) {
        const diff = lockedUntilWeekly.getTime() - now;
        if (diff <= 0) { setCanGenerateWeekly(true); setCountdownWeekly(''); }
        else setCountdownWeekly(fmt(diff));
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntilDaily, lockedUntilWeekly]);

  // --- BMI Calculation for Recommendations ---
  const bmi = useMemo(() => {
      const heightM = userProfile.height / 100;
      return userProfile.weight / (heightM * heightM);
  }, [userProfile]);

  // Set default category on mount based on recommendation
  useMemo(() => {
      if (!selectedCategory) {
          const recommended = DIET_CATEGORIES.find(c => c.recommendFor(bmi));
          if (recommended) setSelectedCategory(recommended.id);
          else setSelectedCategory('maintenance');
      }
  }, [bmi]);

  // --- SHOPPING LIST LOGIC ---
  const shoppingList = useMemo(() => {
      const items: string[] = [];
      
      const addFromMeal = (meal: MealItem) => {
          if (meal.ingredients && Array.isArray(meal.ingredients)) {
              items.push(...meal.ingredients);
          } else if (meal.contents) {
              // Fallback if ingredients array is missing (legacy support)
              items.push(meal.contents);
          }
      };

      if (dietPlan) {
          dietPlan.meals.forEach(addFromMeal);
      } else if (weeklyPlan) {
          weeklyPlan.days.forEach(day => day.meals.forEach(addFromMeal));
      }

      // De-duplicate and sort
      const uniqueItems = Array.from(new Set(items.map(i => i.trim()))).sort();
      return uniqueItems;
  }, [dietPlan, weeklyPlan]);

  // --- HELPER: Verification Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEvidencePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const confirmConsumption = async () => {
      if (verifyingMeal === null || !activeDailyPlanId) return;
      const idx = verifyingMeal;
      // Optimistic update
      setCompletedMealIndices(prev => [...prev, idx]);
      onAddXp(15);
      setVerifyingMeal(null);
      setEvidencePreview(null);
      // Save to Firestore (persistent, survives page refresh)
      markDietMealConsumed(activeDailyPlanId, 'daily', idx).catch(e =>
          console.warn('[DietConsumed] Failed to save to server:', e),
      );
  };

  const confirmWeeklyConsumption = async () => {
      if (!verifyingWeeklyMeal) return;
      const { d, m } = verifyingWeeklyMeal;
      const key = `${d}-${m}`;
      // Get weekly plan id — stored in weeklyPlan.id
      const weeklyId = weeklyPlan?.id;
      // Optimistic update
      setCompletedWeeklyIndices(prev => [...prev, key]);
      onAddXp(15);
      setVerifyingWeeklyMeal(null);
      setEvidencePreview(null);
      // Save to Firestore
      if (weeklyId) {
          markDietMealConsumed(weeklyId, 'weekly', m, d).catch(e =>
              console.warn('[WeeklyConsumed] Failed to save to server:', e),
          );
      }
  };

  // --- TACTICAL MANIFEST PRINTER ---
  const handlePrintManifest = () => {
      if (shoppingList.length === 0) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert("Please allow popups to print the manifest.");
          return;
      }

      const date = new Date().toLocaleDateString();
      const missionName = weeklyPlan?.weekName || dietPlan?.target || "General Supply Run";
      const agentCode = `AGENT-${userProfile.name.substring(0,3).toUpperCase()}-${userProfile.age}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>LOGISTICS MANIFEST // SUGAR SPY</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
                
                body {
                    font-family: 'Courier Prime', 'Courier New', monospace;
                    background-color: #ffffff;
                    color: #000000;
                    padding: 40px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .header {
                    border-bottom: 4px solid #000;
                    padding-bottom: 10px;
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                
                .title {
                    font-size: 24px;
                    font-weight: bold;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }
                
                .meta {
                    font-size: 12px;
                    text-align: right;
                }
                
                .stamp {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    border: 3px solid #d00;
                    color: #d00;
                    font-size: 18px;
                    font-weight: bold;
                    padding: 5px 15px;
                    text-transform: uppercase;
                    transform: rotate(-12deg);
                    opacity: 0.7;
                    mix-blend-mode: multiply;
                }

                .mission-box {
                    background: #f0f0f0;
                    border: 1px solid #000;
                    padding: 15px;
                    margin-bottom: 30px;
                    font-size: 14px;
                }

                .list-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px 40px;
                }

                .checkbox-item {
                    display: flex;
                    align-items: center;
                    border-bottom: 1px dotted #ccc;
                    padding: 8px 0;
                    font-size: 14px;
                }

                .box {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #000;
                    margin-right: 15px;
                    flex-shrink: 0;
                }

                .footer {
                    margin-top: 50px;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                    font-size: 10px;
                    text-align: center;
                    text-transform: uppercase;
                }

                @media print {
                    body { -webkit-print-color-adjust: exact; padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="stamp">Classified</div>
            
            <div class="header">
                <div class="title">Supply Manifest</div>
                <div class="meta">
                    <div>DATE: ${date}</div>
                    <div>REF: ${agentCode}</div>
                </div>
            </div>

            <div class="mission-box">
                <strong>MISSION OBJECTIVE:</strong> ${missionName}<br/>
                <strong>PROTOCOL:</strong> Strict adherence to low-sugar procurement.
            </div>

            <div class="list-container">
                ${shoppingList.map(item => `
                    <div class="checkbox-item">
                        <div class="box"></div>
                        <span>${item}</span>
                    </div>
                `).join('')}
            </div>

            <div class="footer">
                Sugar Spy Bureau // Official Logistics Document // Destroy After Use
            </div>

            <script>
                window.onload = () => { setTimeout(() => window.print(), 500); };
            </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };


  // --- DAILY PLAN GENERATION ---
  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setDietPlan(null);
    setCompletedMealIndices([]);

    try {
        const data: DietPlanResponse = await generateDailyDietPlan({
            category: selectedCategory,
            inputMode,
            manualGoal: inputMode === 'manual' ? manualGoal : undefined,
            userProfile: {
                name: userProfile.name,
                age: userProfile.age,
                weight: userProfile.weight,
                height: userProfile.height,
            },
        });
        setDietPlan(data as unknown as DietPlan);
        setActiveDailyPlanId(data.id);
        setCanGenerateDaily(false);
    } catch (e: any) {
        console.error(e);
        alert(e.message || "Failed to generate plan. Try again.");
    } finally {
        setIsLoading(false);
    }
  };

  // --- SWAP MEAL LOGIC ---
  const handleSwapMeal = async (mealIndex: number, currentMeal: MealItem) => {
      setLoadingSwap(mealIndex);
      try {
          const newMeal = await swapDietMeal(
              activeDailyPlanId ?? '',
              mealIndex,
              currentMeal,
              dietPlan?.target || "Healthy",
          );
          if (dietPlan) {
              const newMeals = [...dietPlan.meals];
              newMeals[mealIndex] = newMeal;
              setDietPlan({ ...dietPlan, meals: newMeals });
          }
      } catch (e: any) {
          console.error(e);
          alert(e.message || "Swap failed.");
      } finally {
          setLoadingSwap(null);
      }
  };

  // --- WEEKLY PREP GENERATION ---
  const handleGenerateWeekly = async () => {
    setIsLoading(true);
    setWeeklyPlan(null);

    try {
        const data: WeeklyPlanResponse = await generateWeeklyDietPlan({
            category: selectedCategory,
            inputMode,
            manualGoal: inputMode === 'manual' ? manualGoal : undefined,
            userProfile: {
                name: userProfile.name,
                age: userProfile.age,
                weight: userProfile.weight,
            },
        });
        setWeeklyPlan(data as unknown as WeeklyPlan);
        setCanGenerateWeekly(false);
    } catch (e: any) {
        console.error(e);
        alert(e.message || "Failed to generate weekly logistics.");
    } finally {
        setIsLoading(false);
    }
  };

  const CircleChart = ({ score }: { score: number }) => {
      const radius = 36;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (score / 100) * circumference;
      
      return (
          <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
                  <circle cx="50%" cy="50%" r={radius} className="fill-none stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="8" strokeLinecap="round" />
                  <circle 
                    cx="50%" cy="50%" r={radius} 
                    className={`fill-none transition-all duration-1000 ease-out ${score > 80 ? 'stroke-brand-500' : score > 50 ? 'stroke-brand-500' : 'stroke-orange-500'}`}
                    strokeWidth="8" 
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                  />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-zinc-900 dark:text-white leading-none">{score}</span>
                  <span className="text-[9px] uppercase text-zinc-500 font-bold mt-1">Score</span>
              </div>
          </div>
      );
  };

  if (isLoadingActive) {
    return (
      <div className="pb-24 flex flex-col gap-4 px-4">
        <div className="h-12 bg-zinc-800 rounded-2xl animate-pulse" />
        <div className="h-48 bg-zinc-900 rounded-3xl border border-zinc-800 animate-pulse" />
        <div className="h-64 bg-zinc-900 rounded-3xl border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- PROTOCOL SWITCHER --- */}
      <div className="flex bg-zinc-900 p-1 rounded-2xl mb-6 mx-4 md:mx-0 border border-zinc-800 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'daily' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
              Mission Protocol
          </button>
          <button 
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'weekly' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
              Weekly Supply
          </button>
          <button 
            onClick={() => setActiveTab('shop')}
            disabled={!dietPlan && !weeklyPlan}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'shop' ? 'bg-brand-900/30 text-brand-400 border border-brand-500/20 shadow-lg' : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'}`}
          >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              Logistics
          </button>
      </div>

      {/* --- INPUT SECTION (Only show for Daily/Weekly) --- */}
      {activeTab !== 'shop' && (
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl mb-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-3 opacity-10">
             <svg className="w-32 h-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
         </div>

         <div className="relative z-10">
             <div className="flex justify-between items-start mb-4">
                 <div>
                     <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">
                         {activeTab === 'daily' ? 'Daily Rationing' : 'Logistics Planning'}
                     </h2>
                     <p className="text-zinc-400 text-sm">
                         {activeTab === 'daily' ? 'Define nutritional parameters for next 24h.' : 'Establish supply chain for next 7 days.'}
                     </p>
                 </div>
                 
                 {/* Mode Toggle */}
                 <div className="flex bg-black/40 p-1 rounded-lg border border-zinc-700/50">
                     <button onClick={() => setInputMode('auto')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${inputMode === 'auto' ? 'bg-brand-500 text-black shadow' : 'text-zinc-500'}`}>Auto-Intel</button>
                     <button onClick={() => setInputMode('manual')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${inputMode === 'manual' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500'}`}>Manual</button>
                 </div>
             </div>
             
             {/* --- AUTO MODE GRID --- */}
             {inputMode === 'auto' && (
                 <div className="grid grid-cols-2 gap-3 mb-6">
                     {DIET_CATEGORIES.map((cat) => {
                         const isRecommended = cat.recommendFor(bmi);
                         return (
                             <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`relative p-4 rounded-2xl border-2 text-left transition-all group overflow-hidden ${
                                    selectedCategory === cat.id 
                                    ? 'border-brand-500 bg-brand-900/20' 
                                    : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-600'
                                }`}
                             >
                                 {isRecommended && (
                                     <div className="absolute top-0 right-0 bg-brand-500 text-black text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase tracking-wider animate-pulse">
                                         Recommended
                                     </div>
                                 )}
                                 <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">{cat.icon}</div>
                                 <div className={`text-sm font-bold uppercase mb-1 ${selectedCategory === cat.id ? 'text-white' : 'text-zinc-400'}`}>{cat.title}</div>
                                 <div className="text-[10px] text-zinc-500 leading-tight">{cat.desc}</div>
                             </button>
                         )
                     })}
                 </div>
             )}

             {/* --- MANUAL MODE INPUT --- */}
             {inputMode === 'manual' && (
                 <div className="relative mb-6">
                     <input 
                        type="text"
                        value={manualGoal}
                        onChange={(e) => setManualGoal(e.target.value)}
                        placeholder={activeTab === 'daily' ? "E.g. Lose fat, build muscle..." : "E.g. High protein meal prep..."}
                        className="w-full bg-black/50 border border-zinc-700 rounded-2xl py-4 pl-4 pr-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'daily' ? handleGeneratePlan() : handleGenerateWeekly())}
                     />
                 </div>
             )}
             
             {/* Lock Banner — Daily */}
             {activeTab === 'daily' && !canGenerateDaily && (
                 <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700 rounded-2xl px-4 py-3 mb-3">
                     <div className="text-2xl">🔒</div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">Daily Protocol Locked</div>
                         <div className="text-[10px] text-zinc-500 mt-0.5">
                             Today's plan has been created. Resets at midnight — available again in:
                         </div>
                     </div>
                     {countdownDaily && (
                         <div className="text-right shrink-0">
                             <div className="font-mono text-base font-black text-brand-400 tabular-nums">{countdownDaily}</div>
                             <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Hr:Min:Sec</div>
                         </div>
                     )}
                 </div>
             )}

             {/* Lock Banner — Weekly */}
             {activeTab === 'weekly' && !canGenerateWeekly && (
                 <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700 rounded-2xl px-4 py-3 mb-3">
                     <div className="text-2xl">📅</div>
                     <div className="flex-1 min-w-0">
                         <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">Weekly Supply Active</div>
                         <div className="text-[10px] text-zinc-500 mt-0.5">
                             Available again{lockedUntilWeekly
                               ? ` on ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][lockedUntilWeekly.getDay()]}, ${lockedUntilWeekly.toLocaleDateString('en-US',{day:'numeric',month:'short'})}`
                               : ' in 7 days'} — countdown:
                         </div>
                     </div>
                     {countdownWeekly && (
                         <div className="text-right shrink-0">
                             <div className="font-mono text-base font-black text-amber-400 tabular-nums">{countdownWeekly}</div>
                             <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Hr:Min:Sec</div>
                         </div>
                     )}
                 </div>
             )}

             <button 
                onClick={activeTab === 'daily' ? handleGeneratePlan : handleGenerateWeekly}
                disabled={
                    isLoading ||
                    (inputMode === 'manual' && !manualGoal) ||
                    (activeTab === 'daily' && !canGenerateDaily) ||
                    (activeTab === 'weekly' && !canGenerateWeekly)
                }
                className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase rounded-xl shadow-[0_0_20px_rgba(51,173,174,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
                {isLoading ? (
                    <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Initializing Strategy...
                    </>
                ) : (activeTab === 'daily' && !canGenerateDaily) || (activeTab === 'weekly' && !canGenerateWeekly) ? (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        LOCKED — COME BACK TOMORROW
                    </>
                ) : (
                    <>GENERATE {activeTab === 'daily' ? 'DAILY ORDERS' : 'SUPPLY LOGISTICS'}</>
                )}
             </button>
         </div>
      </div>
      )}

      {/* --- WEEKLY VIEW --- */}
      {activeTab === 'weekly' && weeklyPlan && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold uppercase tracking-wider">{weeklyPlan.weekName}</h3>
                  <button className="bg-brand-500/20 text-brand-400 px-3 py-1 rounded-lg text-xs font-bold uppercase hover:bg-brand-500/30 transition-colors">
                      Save Logistics
                  </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  {weeklyPlan.days.map((dayPlan, dayIdx) => {
                      const isExpanded = expandedDay === dayPlan.day;
                      return (
                          <div key={dayIdx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden transition-all duration-300 shadow-sm">
                              {/* Day Header */}
                              <button 
                                onClick={() => setExpandedDay(isExpanded ? null : dayPlan.day)}
                                className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isExpanded ? 'bg-teal-500 text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                          {dayPlan.day.substring(0, 3)}
                                      </div>
                                      <div className="text-left">
                                          <div className="font-bold text-zinc-900 dark:text-white">{dayPlan.day}</div>
                                          <div className="text-[10px] text-zinc-500">
                                              {dayPlan.totalCalories} kcal • {dayPlan.totalSugar}g Sugar
                                          </div>
                                      </div>
                                  </div>
                                  <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''} text-zinc-400`}>
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                  </div>
                              </button>

                              {/* Meals List */}
                              {isExpanded && (
                                  <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-4 space-y-4">
                                      {dayPlan.meals.map((meal, mIdx) => {
                                          const mealKey = `${dayIdx}-${mIdx}`;
                                          const isCompleted = completedWeeklyIndices.includes(mealKey);
                                          const isVerifying = verifyingWeeklyMeal?.d === dayIdx && verifyingWeeklyMeal?.m === mIdx;

                                          return (
                                          <div key={mIdx} className={`bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border shadow-sm transition-all ${isCompleted ? 'border-emerald-500/30 opacity-75' : 'border-zinc-200 dark:border-zinc-800'}`}>
                                              
                                              {/* Visualizer Banner */}
                                              <div className="h-24 w-full">
                                                  <MealVisualizer name={meal.menuName} type={meal.type} isCompleted={isCompleted} />
                                              </div>

                                              <div className="p-3">
                                                  <div className="mb-2">
                                                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">{meal.menuName}</h4>
                                                      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mt-1">{meal.contents}</p>
                                                  </div>
                                                  
                                                  {/* Verification UI */}
                                                  {!isCompleted && isVerifying ? (
                                                      <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl animate-in fade-in">
                                                          <div className="text-[9px] font-bold text-zinc-500 uppercase mb-2 text-center">Verify Rations</div>
                                                          <input 
                                                              type="file" 
                                                              accept="image/*"
                                                              ref={fileInputRef}
                                                              className="hidden"
                                                              onChange={handleFileSelect}
                                                          />
                                                          {evidencePreview ? (
                                                              <div className="space-y-2">
                                                                  <div className="h-20 w-full bg-zinc-900 rounded-lg overflow-hidden relative">
                                                                      <img src={evidencePreview} className="w-full h-full object-cover opacity-80" />
                                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                                          <svg className="w-6 h-6 text-emerald-500 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                      </div>
                                                                  </div>
                                                                  <div className="flex gap-2">
                                                                      <button onClick={() => { setVerifyingWeeklyMeal(null); setEvidencePreview(null); }} className="flex-1 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-[9px] font-bold uppercase">Cancel</button>
                                                                      <button onClick={confirmWeeklyConsumption} className="flex-1 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-bold uppercase shadow-lg">Confirm</button>
                                                                  </div>
                                                              </div>
                                                          ) : (
                                                              <div className="flex gap-2">
                                                                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 border border-dashed border-zinc-400 dark:border-zinc-600 hover:border-teal-500 text-zinc-500 hover:text-teal-500 rounded-lg text-[9px] font-bold uppercase transition-colors">
                                                                      📷 Photo
                                                                  </button>
                                                                  <button onClick={() => setVerifyingWeeklyMeal(null)} className="px-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-bold">X</button>
                                                              </div>
                                                          )}
                                                      </div>
                                                  ) : (
                                                      <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2">
                                                          <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono text-zinc-400">
                                                              <span>{meal.calories} kcal</span>
                                                              <span className="text-zinc-300">|</span>
                                                              <span className={meal.sugarGrams < 5 ? 'text-emerald-500' : 'text-rose-500'}>
                                                                  {meal.sugarGrams}g Sugar
                                                              </span>
                                                          </div>
                                                          
                                                          {!isCompleted && (
                                                              <button 
                                                                onClick={() => setVerifyingWeeklyMeal({d: dayIdx, m: mIdx})}
                                                                className="text-teal-500 hover:text-teal-400 text-[9px] font-bold uppercase border border-teal-500/30 hover:bg-teal-500/10 px-3 py-1 rounded-lg transition-all"
                                                              >
                                                                  Verify Intake
                                                              </button>
                                                          )}
                                                      </div>
                                                  )}
                                              </div>
                                          </div>
                                      )})}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* --- DAILY VIEW --- */}
      {activeTab === 'daily' && dietPlan && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6">
              
              {/* Summary Card */}
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                   {/* Background Decor */}
                   <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                       <span className="text-9xl font-black text-zinc-500">{dietPlan.score}</span>
                   </div>

                   <div className="flex-1 text-center md:text-left z-10">
                       <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm text-3xl mb-3">
                           {dietPlan.icon}
                       </div>
                       <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Target Acquired</div>
                       <h3 className="text-2xl font-black text-zinc-900 dark:text-white leading-tight capitalize mb-2">
                           {dietPlan.target}
                       </h3>
                       <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-700/30">
                           <p className="text-sm text-zinc-600 dark:text-zinc-400 italic leading-relaxed">
                               "{dietPlan.summary}"
                           </p>
                       </div>
                   </div>
                   
                   <div className="flex-shrink-0 z-10 bg-white dark:bg-zinc-950 p-4 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                       <CircleChart score={dietPlan.score} />
                   </div>
              </div>

              {/* Meal Timeline */}
              <div className="space-y-6">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2">Daily Roadmap</div>
                  
                  {dietPlan.meals.map((meal, idx) => {
                      const isCompleted = completedMealIndices.includes(idx);
                      const isVerifying = verifyingMeal === idx;

                      return (
                      <div key={idx} className={`group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border transition-all duration-300 shadow-sm relative ${isCompleted ? 'border-emerald-500/30 dark:border-emerald-500/20 opacity-80' : 'border-zinc-200 dark:border-zinc-800 hover:border-rose-500/50'}`}>
                          
                          {/* Visualizer Banner */}
                          <div className="h-32 w-full">
                              <MealVisualizer name={meal.menuName} type={meal.type} isCompleted={isCompleted} />
                          </div>
                          
                          <div className="p-5">
                              <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 leading-tight">{meal.menuName}</h4>
                                  
                                  {/* Reroll Button - Only show if not completed */}
                                  {!isCompleted && (
                                      <div className="flex items-center gap-2">
                                          {loadingSwap === idx ? (
                                              <div className="w-5 h-5 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin"></div>
                                          ) : (
                                              <button 
                                                onClick={() => handleSwapMeal(idx, meal)}
                                                className="text-zinc-400 hover:text-teal-500 transition-colors"
                                                title="Swap Meal"
                                              >
                                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                              </button>
                                          )}
                                      </div>
                                  )}
                              </div>
                              
                              <p className="text-sm text-zinc-500 leading-relaxed mb-4 line-clamp-2">{meal.contents}</p>
                              
                              {/* Expanded Recipe View */}
                              {showRecipe === idx && meal.instructions && (
                                  <div className="mt-2 mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 animate-in slide-in-from-top-2">
                                      <div className="font-bold uppercase text-[9px] text-zinc-400 mb-1">Execution</div>
                                      {meal.instructions}
                                  </div>
                              )}

                              {/* Action Footer */}
                              <div className="pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                                  
                                  {/* Verification UI */}
                                  {!isCompleted && isVerifying ? (
                                      <div className="bg-black/5 dark:bg-black/20 p-3 rounded-xl animate-in fade-in">
                                          <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2 text-center">Verify Rations</div>
                                          <input 
                                              type="file" 
                                              accept="image/*"
                                              ref={fileInputRef}
                                              className="hidden"
                                              onChange={handleFileSelect}
                                          />
                                          {evidencePreview ? (
                                              <div className="space-y-2">
                                                  <div className="h-24 w-full bg-zinc-900 rounded-lg overflow-hidden relative">
                                                      <img src={evidencePreview} className="w-full h-full object-cover opacity-80" />
                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                          <svg className="w-8 h-8 text-emerald-500 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                      </div>
                                                  </div>
                                                  <div className="flex gap-2">
                                                      <button onClick={() => { setVerifyingMeal(null); setEvidencePreview(null); }} className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[10px] font-bold uppercase">Cancel</button>
                                                      <button onClick={confirmConsumption} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase shadow-lg shadow-emerald-500/20">Confirm</button>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="flex gap-2">
                                                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-teal-500 text-zinc-500 hover:text-teal-500 rounded-lg text-[10px] font-bold uppercase transition-colors">
                                                      📷 Upload Photo
                                                  </button>
                                                  <button onClick={() => setVerifyingMeal(null)} className="px-3 py-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-[10px] font-bold">X</button>
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono font-bold text-zinc-400">
                                              <span>{meal.calories} kcal</span>
                                              <span className="text-zinc-300 dark:text-zinc-700">|</span>
                                              <span className={meal.sugarGrams < 5 ? 'text-emerald-500' : 'text-rose-500'}>
                                                  {meal.sugarGrams}g Sugar
                                              </span>
                                          </div>
                                          
                                          <div className="flex items-center gap-3">
                                              {meal.instructions && (
                                                  <button 
                                                    onClick={() => setShowRecipe(showRecipe === idx ? null : idx)}
                                                    className="text-[10px] font-bold uppercase text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                                  >
                                                      {showRecipe === idx ? 'Hide Brief' : 'Brief'}
                                                  </button>
                                              )}
                                              
                                              {!isCompleted && (
                                                  <button 
                                                    onClick={() => setVerifyingMeal(idx)}
                                                    className="bg-zinc-900 dark:bg-white text-white dark:text-black px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide hover:opacity-90 transition-opacity shadow-lg"
                                                  >
                                                      Verify Intake
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      )}

      {/* --- SHOPPING LIST TAB --- */}
      {activeTab === 'shop' && (
          <div className="animate-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl mb-6">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Tactical Logistics</h2>
                          <p className="text-zinc-400 text-sm">Procurement checklist for active mission.</p>
                      </div>
                      <div className="bg-teal-500/10 text-teal-500 p-2 rounded-xl">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                      </div>
                  </div>

                  {shoppingList.length === 0 ? (
                      <div className="text-center py-10 text-zinc-500 italic">
                          No active plan detected. Generate a diet protocol first.
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {shoppingList.map((item, idx) => (
                              <label key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-zinc-800 hover:border-teal-500/50 cursor-pointer transition-all group">
                                  <div className="relative">
                                      <input type="checkbox" className="peer appearance-none w-5 h-5 rounded border border-zinc-600 bg-zinc-900 checked:bg-teal-500 checked:border-teal-500 transition-colors" />
                                      <svg className="absolute top-1 left-1 w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                  <span className="text-sm font-medium text-zinc-300 peer-checked:text-zinc-600 peer-checked:line-through transition-colors">
                                      {item}
                                  </span>
                              </label>
                          ))}
                      </div>
                  )}
                  
                  <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
                      <button 
                        className="text-xs font-bold uppercase text-zinc-500 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl" 
                        onClick={handlePrintManifest}
                      >
                          Print Document
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- EMPTY STATE --- */}
      {(!dietPlan && activeTab === 'daily' && !isLoading) && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 opacity-50">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-sm">Awaiting inputs for meal generation.</p>
          </div>
      )}
      
      {(!weeklyPlan && activeTab === 'weekly' && !isLoading) && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 opacity-50">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-sm">Define goal to generate supply logistics.</p>
          </div>
      )}
    </div>
  );
};

export default DietPlanScreen;
