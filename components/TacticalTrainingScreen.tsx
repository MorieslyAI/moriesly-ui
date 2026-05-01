
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, LedgerState, OperationPlan, TimeBlock } from '../types';
import {
  generateTrainingPlan,
  getActiveTrainingPlan,
  markTrainingCompleted,
  type TrainingPlanResponse,
  type ActiveTrainingResult,
} from '../services/api';

interface TacticalTrainingScreenProps {
  userProfile: UserProfile;
  ledger: LedgerState;
  onAddXp: (amount: number) => void;
  // Hoisted plan state (juga dibaca DashboardScreen)
  plan: OperationPlan | null;
  setPlan: (plan: OperationPlan | null) => void;
  // Hoisted completed workouts (read by DashboardScreen for progress bar)
  completedWorkouts: number[];
  setCompletedWorkouts: (indices: number[]) => void;
}

// --- NEW MEAL VISUALIZER (Matched with DietPlanScreen) ---
const MealVisualizer: React.FC<{ name: string, isCompleted: boolean }> = ({ name, isCompleted }) => {
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
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
            
            <div className={`text-4xl filter drop-shadow-2xl transform transition-transform duration-500 group-hover:scale-110 ${isCompleted ? 'grayscale opacity-50' : ''}`}>
                {icon}
            </div>
            
            <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                <span className="text-[8px] font-mono font-bold text-white/50 bg-black/40 px-1.5 py-0.5 rounded uppercase tracking-widest border border-white/5">
                    {label}
                </span>
            </div>

            {isCompleted && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] z-10">
                    <span className="bg-emerald-500 text-white px-2 py-1 rounded-full font-black uppercase text-[8px] tracking-widest border border-white">
                        INTAKE CONFIRMED
                    </span>
                </div>
            )}
        </div>
    );
};

// --- ADVANCED TACTICAL VISUALIZER (3-FRAME BIOMECHANICS) ---
const TacticalVisualizer: React.FC<{ actionName: string, isBurn: boolean }> = ({ actionName, isBurn }) => {
  const [animType, setAnimType] = useState<'run' | 'squat' | 'pushup' | 'jumping' | 'lift' | 'idle'>('idle');
  const [frame, setFrame] = useState(0);

  // Detect Animation Type based on keywords
  useEffect(() => {
    const name = (actionName || '').toLowerCase();
    if (name.match(/run|sprint|jog|walk|hike|treadmill/)) setAnimType('run');
    else if (name.match(/squat|lunge|leg|sit/)) setAnimType('squat');
    else if (name.match(/push|press|plank|chest|dip/)) setAnimType('pushup');
    else if (name.match(/jump|burpee|plyo|cardio|hiit|rope/)) setAnimType('jumping');
    else if (name.match(/lift|weight|curl|dumb|bell|row|pull|dead/)) setAnimType('lift');
    else setAnimType('idle');
  }, [actionName]);

  // Frame Loop Logic
  useEffect(() => {
      // Running needs 3 frames for smoothness, others use 2
      const maxFrames = animType === 'run' ? 3 : 2;
      const speed = animType === 'run' || animType === 'jumping' ? 250 : 800; // Fast vs Slow exercises

      const interval = setInterval(() => {
          setFrame(prev => (prev + 1) % maxFrames);
      }, speed);
      return () => clearInterval(interval);
  }, [animType]);

  const color = isBurn ? '#e11d48' : '#14b8a6'; 

  // --- SVG PATHS (Accurate Biomechanics) ---
  // Coordinate System: 100x100 viewbox. Head center approx 50,20. Floor at 90.
  
  const skeletons = {
      idle: [
          // Frame 0: Relaxed
          <g key="i0">
              <circle cx="50" cy="20" r="7" fill="currentColor" /> {/* Head */}
              <line x1="50" y1="27" x2="50" y2="55" strokeWidth="4" /> {/* Spine */}
              <line x1="50" y1="55" x2="45" y2="90" strokeWidth="4" /> {/* L Leg */}
              <line x1="50" y1="55" x2="55" y2="90" strokeWidth="4" /> {/* R Leg */}
              <line x1="50" y1="35" x2="35" y2="60" strokeWidth="3" /> {/* L Arm */}
              <line x1="50" y1="35" x2="65" y2="60" strokeWidth="3" /> {/* R Arm */}
          </g>,
          // Frame 1: Breathe (Chest expands, shoulders up)
          <g key="i1">
              <circle cx="50" cy="19" r="7" fill="currentColor" />
              <line x1="50" y1="26" x2="50" y2="54" strokeWidth="4" />
              <line x1="50" y1="54" x2="45" y2="90" strokeWidth="4" />
              <line x1="50" y1="54" x2="55" y2="90" strokeWidth="4" />
              <line x1="50" y1="33" x2="33" y2="58" strokeWidth="3" />
              <line x1="50" y1="33" x2="67" y2="58" strokeWidth="3" />
          </g>
      ],
      run: [
          // Frame 0: Right Leg Fwd Strike, Left Arm Fwd
          <g key="r0">
              <circle cx="55" cy="20" r="6" fill="currentColor" /> 
              <line x1="55" y1="26" x2="50" y2="50" strokeWidth="4" /> {/* Lean Spine */}
              <path d="M50 50 L70 70 L65 90" strokeWidth="4" fill="none" /> {/* R Leg (Front Plant) */}
              <path d="M50 50 L30 65 L20 55" strokeWidth="4" fill="none" /> {/* L Leg (Back Kick) */}
              <path d="M52 35 L70 45 L80 30" strokeWidth="3" fill="none" /> {/* L Arm (Fwd Swing) */}
              <path d="M52 35 L30 45 L20 35" strokeWidth="3" fill="none" /> {/* R Arm (Back) */}
          </g>,
          // Frame 1: Mid-Air Float (Transition)
          <g key="r1">
              <circle cx="50" cy="15" r="6" fill="currentColor" />
              <line x1="50" y1="21" x2="50" y2="45" strokeWidth="4" />
              <path d="M50 45 L60 65 L75 60" strokeWidth="4" fill="none" /> {/* R Leg (Recovery) */}
              <path d="M50 45 L40 65 L25 60" strokeWidth="4" fill="none" /> {/* L Leg (Recovery) */}
              <path d="M50 30 L65 40" strokeWidth="3" fill="none" />
              <path d="M50 30 L35 40" strokeWidth="3" fill="none" />
          </g>,
          // Frame 2: Left Leg Fwd Strike, Right Arm Fwd
          <g key="r2">
              <circle cx="55" cy="20" r="6" fill="currentColor" />
              <line x1="55" y1="26" x2="50" y2="50" strokeWidth="4" />
              <path d="M50 50 L30 70 L35 90" strokeWidth="4" fill="none" /> {/* L Leg (Front Plant) */}
              <path d="M50 50 L70 65 L80 55" strokeWidth="4" fill="none" /> {/* R Leg (Back Kick) */}
              <path d="M52 35 L30 45 L20 30" strokeWidth="3" fill="none" /> {/* R Arm (Fwd Swing) */}
              <path d="M52 35 L70 45 L80 35" strokeWidth="3" fill="none" /> {/* L Arm (Back) */}
          </g>
      ],
      squat: [
          // Frame 0: Standing
          <g key="s0">
              <circle cx="50" cy="20" r="7" fill="currentColor" />
              <line x1="50" y1="27" x2="50" y2="55" strokeWidth="4" />
              <line x1="50" y1="55" x2="40" y2="90" strokeWidth="4" />
              <line x1="50" y1="55" x2="60" y2="90" strokeWidth="4" />
              <line x1="50" y1="35" x2="25" y2="50" strokeWidth="3" />
              <line x1="50" y1="35" x2="75" y2="50" strokeWidth="3" />
          </g>,
          // Frame 1: Deep Squat (Hips drop, knees out)
          <g key="s1">
              <circle cx="50" cy="40" r="7" fill="currentColor" />
              <line x1="50" y1="47" x2="50" y2="70" strokeWidth="4" /> {/* Spine Compressed */}
              <path d="M50 70 L30 80 L35 90" strokeWidth="4" fill="none" /> {/* L Leg ZigZag */}
              <path d="M50 70 L70 80 L65 90" strokeWidth="4" fill="none" /> {/* R Leg ZigZag */}
              <line x1="50" y1="50" x2="20" y2="50" strokeWidth="3" /> {/* Arms Out for balance */}
              <line x1="50" y1="50" x2="80" y2="50" strokeWidth="3" />
          </g>
      ],
      pushup: [
          // Frame 0: High Plank
          <g key="p0">
              <circle cx="85" cy="40" r="6" fill="currentColor" />
              <line x1="80" y1="45" x2="40" y2="55" strokeWidth="4" /> {/* Body Straight */}
              <line x1="40" y1="55" x2="10" y2="60" strokeWidth="4" /> {/* Legs */}
              <line x1="75" y1="45" x2="75" y2="80" strokeWidth="3" /> {/* Arms Straight Down */}
          </g>,
          // Frame 1: Low Pushup
          <g key="p1">
              <circle cx="85" cy="70" r="6" fill="currentColor" />
              <line x1="80" y1="75" x2="40" y2="65" strokeWidth="4" />
              <line x1="40" y1="65" x2="10" y2="60" strokeWidth="4" />
              <path d="M75 75 L60 65 L75 80" strokeWidth="3" fill="none" /> {/* Elbow Bent */}
          </g>
      ],
      jumping: [
          // Frame 0: "I" Shape
          <g key="j0">
              <circle cx="50" cy="20" r="7" fill="currentColor" />
              <line x1="50" y1="27" x2="50" y2="55" strokeWidth="4" />
              <line x1="50" y1="55" x2="45" y2="90" strokeWidth="4" />
              <line x1="50" y1="55" x2="55" y2="90" strokeWidth="4" />
              <line x1="50" y1="35" x2="40" y2="65" strokeWidth="3" /> {/* Arms Down */}
              <line x1="50" y1="35" x2="60" y2="65" strokeWidth="3" />
          </g>,
          // Frame 1: "X" Shape
          <g key="j1">
              <circle cx="50" cy="25" r="7" fill="currentColor" />
              <line x1="50" y1="32" x2="50" y2="60" strokeWidth="4" />
              <line x1="50" y1="60" x2="25" y2="90" strokeWidth="4" /> {/* Legs Wide */}
              <line x1="50" y1="60" x2="75" y2="90" strokeWidth="4" />
              <line x1="50" y1="40" x2="20" y2="15" strokeWidth="3" /> {/* Arms Up */}
              <line x1="50" y1="40" x2="80" y2="15" strokeWidth="3" />
          </g>
      ],
      lift: [
          // Frame 0: Start (Bar at shins/waist)
          <g key="l0">
              <circle cx="50" cy="20" r="7" fill="currentColor" />
              <line x1="50" y1="27" x2="50" y2="60" strokeWidth="4" />
              <line x1="50" y1="60" x2="35" y2="90" strokeWidth="4" />
              <line x1="50" y1="60" x2="65" y2="90" strokeWidth="4" />
              <path d="M50 35 L30 65" strokeWidth="3" fill="none" />
              <path d="M50 35 L70 65" strokeWidth="3" fill="none" />
              <line x1="20" y1="65" x2="80" y2="65" strokeWidth="6" stroke="currentColor" /> {/* Barbell */}
              <circle cx="20" cy="65" r="6" />
              <circle cx="80" cy="65" r="6" />
          </g>,
          // Frame 1: End (Overhead Press)
          <g key="l1">
              <circle cx="50" cy="20" r="7" fill="currentColor" />
              <line x1="50" y1="27" x2="50" y2="60" strokeWidth="4" />
              <line x1="50" y1="60" x2="35" y2="90" strokeWidth="4" />
              <line x1="50" y1="60" x2="65" y2="90" strokeWidth="4" />
              <path d="M50 35 L30 15" strokeWidth="3" fill="none" />
              <path d="M50 35 L70 15" strokeWidth="3" fill="none" />
              <line x1="20" y1="15" x2="80" y2="15" strokeWidth="6" stroke="currentColor" /> {/* Barbell */}
              <circle cx="20" cy="15" r="6" />
              <circle cx="80" cy="15" r="6" />
          </g>
      ]
  };

  const currentPose = skeletons[animType] ? skeletons[animType][frame] : skeletons.idle[frame % 2];
  
  // Ghosting Effect: Get the previous frame to show faintly behind
  const prevFrameIndex = frame === 0 ? (animType === 'run' ? 2 : 1) : frame - 1;
  const prevPose = skeletons[animType] ? skeletons[animType][prevFrameIndex] : skeletons.idle[0];

  return (
    <div className="relative w-16 h-16 md:w-24 md:h-24 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-zinc-600 transition-colors flex-shrink-0">
      
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`, backgroundSize: '8px 8px' }}>
      </div>

      {/* Radar Scan Effect */}
      <div className="absolute inset-0 border-t border-white/20 animate-[scan-vertical_1.5s_infinite_linear] opacity-30"></div>

      <svg viewBox="0 0 100 100" className="w-14 h-14 md:w-20 md:h-20 relative z-10 overflow-visible">
        <defs>
           <filter id="glow-skeleton">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
              </feMerge>
           </filter>
        </defs>

        {/* Ghost Frame (Motion Blur Simulation) */}
        <g stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.2">
            {prevPose}
        </g>

        {/* Active Frame */}
        <g 
            stroke={color} 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill={color} 
            filter="url(#glow-skeleton)"
        >
            {currentPose}
        </g>
      </svg>
      
      {/* Status Text Overlay */}
      <div className="absolute bottom-1 right-2 text-[6px] md:text-[8px] font-mono font-bold text-zinc-500 uppercase">
          {animType}
      </div>
    </div>
  );
};

// --- NEW ANATOMY VISUALIZER FOR SELECTION ---
const AnatomyIcon: React.FC<{ type: string, isActive: boolean }> = ({ type, isActive }) => {
    const color = isActive ? '#14b8a6' : '#71717a'; // Teal vs Zinc-500
    
    // Basic human shape paths
    const head = "M50 25 C50 20 54 15 58 15 C62 15 66 20 66 25 C66 30 62 35 58 35 C54 35 50 30 50 25";
    const torso = "M48 38 L68 38 L65 65 L51 65 Z";
    const arms = "M48 40 L35 55 M68 40 L81 55";
    const legs = "M51 65 L48 90 M65 65 L68 90";
    
    // Highlight paths based on type
    const isFull = type === 'Full Body';
    const isUpper = type === 'Upper';
    const isLower = type === 'Lower';
    const isCore = type === 'Core';
    const isCardio = type === 'Cardio';
    const isCustom = type === 'Custom';

    if (isCustom) {
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M50 20 L55 35 L70 35 L58 45 L63 60 L50 50 L37 60 L42 45 L30 35 L45 35 Z" fill="none" stroke={color} strokeWidth="3" className={isActive ? 'animate-spin-slow' : ''} />
                <circle cx="50" cy="50" r="10" fill={isActive ? color : 'none'} stroke={color} />
            </svg>
        )
    }

    if (isCardio) {
        return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M50 30 Q35 15 25 35 Q15 55 50 80 Q85 55 75 35 Q65 15 50 30" fill={isActive ? color : 'none'} stroke={color} strokeWidth="3" className={isActive ? 'animate-pulse' : ''} />
            </svg>
        )
    }

    return (
        <svg viewBox="0 0 116 116" className="w-full h-full overflow-visible">
            {/* Base Skeleton (Ghost) */}
            <g stroke="#3f3f46" strokeWidth="2" fill="none" opacity="0.3">
                <path d={head} />
                <path d={torso} />
                <path d={arms} />
                <path d={legs} />
            </g>

            {/* Active Highlights */}
            <g stroke={color} strokeWidth={isActive ? "4" : "2"} fill={isActive ? color : "none"} fillOpacity="0.3">
                {(isFull || isUpper) && <path d={head} />}
                {(isFull || isUpper || isCore) && <path d={torso} />}
                {(isFull || isUpper) && <path d={arms} />}
                {(isFull || isLower) && <path d={legs} />}
            </g>
        </svg>
    );
};


const TacticalTrainingScreen: React.FC<TacticalTrainingScreenProps> = ({ userProfile, ledger, onAddXp, plan, setPlan, completedWorkouts, setCompletedWorkouts }) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'burn' | 'build'>('burn'); 
  
  // -- NEW: AUTO / MANUAL SWITCH --
  const [inputMode, setInputMode] = useState<'auto' | 'manual'>('auto');
  
  // -- AUTO PARAMS --
  const [focusArea, setFocusArea] = useState<'Full Body' | 'Upper' | 'Lower' | 'Core' | 'Cardio' | 'Custom'>('Full Body');
  const [customFocusInput, setCustomFocusInput] = useState(''); // New input for Custom Focus
  const [intensity, setIntensity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  // Custom Loadout Dropdown State
  const [equipment, setEquipment] = useState<'Bodyweight' | 'Dumbbells' | 'Gym' | 'Home Items'>('Bodyweight');
  const [showLoadoutMenu, setShowLoadoutMenu] = useState(false);

  // -- MANUAL PARAMS --
  const [customParams, setCustomParams] = useState(''); 
  
  // -- COMPLETION STATE (local, persisted via Firestore) --
  const [completedMeals, setCompletedMeals] = useState<number[]>([]);
  /** Active plan ID for today — used for markTrainingCompleted */
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  /** Lock state — 1 plan per hari */
  const [canGenerate, setCanGenerate] = useState(true);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');

  const [activeVerification, setActiveVerification] = useState<number | null>(null);
  const [activeMealVerification, setActiveMealVerification] = useState<number | null>(null);

  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mealFileInputRef = useRef<HTMLInputElement>(null);
  const loadoutRef = useRef<HTMLDivElement>(null);

  const sugarToBurn = ledger.consumed;

  // ── Load active plan on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function loadActivePlan() {
      try {
        setIsLoadingActive(true);
        const res: ActiveTrainingResult = await getActiveTrainingPlan();
        setCanGenerate(res.canGenerate);
        setLockedUntil(new Date(res.lockedUntil));
        if (res.plan) {
          setPlan(res.plan as unknown as OperationPlan);
          setActivePlanId(res.plan.id);
          setCompletedWorkouts(res.plan.completedWorkoutIndices ?? []);
          setCompletedMeals(res.plan.completedMealIndices ?? []);
        }
      } catch (err) {
        console.error('Failed to load active training plan:', err);
      } finally {
        setIsLoadingActive(false);
      }
    }
    loadActivePlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown ticker ──────────────────────────────────────────────────────
  useEffect(() => {
    const fmt = (diff: number) => {
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const tick = () => {
      if (!lockedUntil) return;
      const diff = lockedUntil.getTime() - Date.now();
      if (diff <= 0) { setCanGenerate(true); setCountdown(''); }
      else setCountdown(fmt(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Handle click outside for dropdown
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (loadoutRef.current && !loadoutRef.current.contains(event.target as Node)) {
              setShowLoadoutMenu(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const confirmCompletion = async () => {
      if (activeVerification === null || !activePlanId) return;
      const idx = activeVerification;
      // Optimistic update
      setCompletedWorkouts([...completedWorkouts, idx]);
      onAddXp(20);
      setActiveVerification(null);
      setEvidencePreview(null);
      // Persist to Firestore
      markTrainingCompleted(activePlanId, 'workout', idx).catch(e =>
          console.warn('[TrainingDone] Failed to save:', e),
      );
  };

  const confirmMealCompletion = async () => {
      if (activeMealVerification === null || !activePlanId) return;
      const idx = activeMealVerification;
      // Optimistic update
      setCompletedMeals([...completedMeals, idx]);
      onAddXp(15);
      setActiveMealVerification(null);
      setEvidencePreview(null);
      // Persist to Firestore
      markTrainingCompleted(activePlanId, 'meal', idx).catch(e =>
          console.warn('[TrainingMealDone] Failed to save:', e),
      );
  };

  const generateMission = async () => {
    setLoading(true);
    // Reset completed status saat generate plan baru
    setCompletedWorkouts([]);
    setCompletedMeals([]);
    try {
        const effectiveFocus = focusArea === 'Custom'
            ? (customFocusInput || 'General Fitness')
            : focusArea;

        const res = await generateTrainingPlan({
            mode,
            inputMode,
            focusArea:    inputMode === 'auto' ? effectiveFocus : undefined,
            intensity:    inputMode === 'auto' ? intensity : undefined,
            equipment:    inputMode === 'auto' ? equipment : undefined,
            customParams: inputMode === 'manual' ? customParams : undefined,
            userProfile: {
                age:    userProfile.age,
                weight: userProfile.weight,
                gender: userProfile.gender,
            },
        });

        setPlan(res as unknown as OperationPlan);
        setActivePlanId(res.id);
        // After successful generation, lock until midnight
        setCanGenerate(false);
        const tomorrow = new Date();
        tomorrow.setUTCHours(24, 0, 0, 0);
        setLockedUntil(tomorrow);
    } catch (e: any) {
        console.error(e);
        const msg: string = e.message ?? e.toString();
        const status = e.status ?? e.statusCode;
        if (status === 409 || msg.includes('409')) {
            // Already generated today — update lock state
            setCanGenerate(false);
            const tomorrow = new Date();
            tomorrow.setUTCHours(24, 0, 0, 0);
            setLockedUntil(tomorrow);
            alert('Mission Protocol has already been generated today. Available again tomorrow.');
        } else if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
            alert('Mission Control Offline: Rate limit exceeded. Coba lagi sebentar.');
        } else {
            alert('Mission generation failed. Periksa koneksi dan coba lagi.');
        }
    } finally {
        setLoading(false);
    }
  };

  // Icons for Loadout
  const loadoutIcons: Record<string, React.ReactNode> = {
      'Bodyweight': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      'Dumbbells': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      'Gym': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      'Home Items': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  };

  if (isLoadingActive) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Loading Mission Data...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER: OPERATIONAL STATUS */}
      <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl mb-6 relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none rounded-3xl"></div>
          
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <div className="text-[10px] font-mono text-teal-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                          Operations Center
                      </div>
                      <h2 className="text-2xl font-black text-white leading-none uppercase">Tactical Schedule</h2>
                  </div>
                  <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-700">
                      <div className="text-[10px] text-zinc-500 uppercase text-center">Load</div>
                      <div className={`text-xl font-black text-center ${sugarToBurn > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {sugarToBurn}g
                      </div>
                  </div>
              </div>

              {/* MISSION CONFIGURATOR */}
              <div className="space-y-6 bg-black/20 p-4 rounded-2xl border border-zinc-800">
                  
                  {/* 1. OBJECTIVE */}
                  <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Objective</label>
                      <div className="flex bg-black p-1 rounded-xl">
                          <button onClick={() => setMode('burn')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${mode === 'burn' ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Fat Burn</button>
                          <button onClick={() => setMode('build')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${mode === 'build' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Muscle Build</button>
                      </div>
                  </div>

                  {/* 2. FOCUS AREA */}
                  <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Target Zone</label>
                      <div className="grid grid-cols-3 gap-2">
                          {(['Full Body', 'Upper', 'Lower', 'Core', 'Cardio', 'Custom'] as const).map(zone => (
                              <button
                                  key={zone}
                                  onClick={() => setFocusArea(zone)}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                      focusArea === zone 
                                      ? 'bg-zinc-800 border-teal-500 text-teal-500 shadow-lg' 
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                                  }`}
                              >
                                  {/* RESPONSIVE ICON CONTAINER: Scale SVG to fit container */}
                                  <div className="w-8 h-8 md:w-10 md:h-10 mb-1">
                                      <AnatomyIcon type={zone} isActive={focusArea === zone} />
                                  </div>
                                  <span className="text-[9px] font-bold uppercase">{zone}</span>
                              </button>
                          ))}
                      </div>
                      {focusArea === 'Custom' && (
                          <input 
                              type="text" 
                              value={customFocusInput}
                              onChange={(e) => setCustomFocusInput(e.target.value)}
                              placeholder="Specific focus (e.g. Glutes, Shoulders)..."
                              className="w-full mt-2 bg-black border border-zinc-700 rounded-lg p-2 text-xs text-white focus:border-teal-500 outline-none"
                          />
                      )}
                  </div>

                  {/* 3. LOADOUT & INTENSITY ROW */}
                  <div className="grid grid-cols-2 gap-4">
                      {/* Loadout */}
                      <div className="relative" ref={loadoutRef}>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Equipment</label>
                          <button 
                              onClick={() => setShowLoadoutMenu(!showLoadoutMenu)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center justify-between text-xs text-white"
                          >
                              <div className="flex items-center gap-2">
                                  {loadoutIcons[equipment]}
                                  <span>{equipment}</span>
                              </div>
                              <svg className={`w-4 h-4 transition-transform ${showLoadoutMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          
                          {showLoadoutMenu && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-xl">
                                  {(['Bodyweight', 'Dumbbells', 'Gym', 'Home Items'] as const).map(eq => (
                                      <button
                                          key={eq}
                                          onClick={() => { setEquipment(eq); setShowLoadoutMenu(false); }}
                                          className="w-full text-left px-4 py-3 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                                      >
                                          {loadoutIcons[eq]}
                                          {eq}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* Intensity */}
                      <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase mb-2 block">Intensity</label>
                          <div className="flex bg-black p-1 rounded-xl h-[42px]">
                              {(['Low', 'Medium', 'High'] as const).map(lvl => (
                                  <button
                                      key={lvl}
                                      onClick={() => setIntensity(lvl)}
                                      className={`flex-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                                          intensity === lvl 
                                          ? (lvl === 'High' ? 'bg-rose-600 text-white' : lvl === 'Medium' ? 'bg-orange-500 text-white' : 'bg-teal-500 text-white')
                                          : 'text-zinc-500 hover:text-zinc-300'
                                      }`}
                                  >
                                      {lvl}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* Manual Override Toggle */}
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setInputMode(inputMode === 'auto' ? 'manual' : 'auto')}
                          className="text-[10px] text-zinc-500 underline hover:text-zinc-300"
                      >
                          {inputMode === 'auto' ? 'Switch to Manual Prompt' : 'Switch to Auto Selector'}
                      </button>
                  </div>

                  {inputMode === 'manual' && (
                      <textarea 
                          value={customParams}
                          onChange={(e) => setCustomParams(e.target.value)}
                          placeholder="Describe specific injuries, detailed equipment list, or specific workout style..."
                          className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs text-white h-24 focus:border-teal-500 outline-none resize-none"
                      />
                  )}

                  {/* Lock Banner */}
                  {!canGenerate && (
                      <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700 rounded-2xl px-4 py-3 mb-3">
                          <div className="text-2xl">🔒</div>
                          <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">Daily Mission Locked</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">
                                  Today's protocol has been created. Resets at midnight — available again in:
                              </div>
                          </div>
                          {countdown && (
                              <div className="text-right shrink-0">
                                  <div className="font-mono text-base font-black text-teal-400 tabular-nums">{countdown}</div>
                                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Hr:Min:Sec</div>
                              </div>
                          )}
                      </div>
                  )}

                  <button
                    onClick={generateMission}
                    disabled={loading || !canGenerate}
                    className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black uppercase rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                      {loading ? (
                          <>
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              Designing Protocol...
                          </>
                      ) : !canGenerate ? (
                          <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              LOCKED — COME BACK TOMORROW
                          </>
                      ) : (
                          <>GENERATE DAILY ORDERS</>
                      )}
                  </button>
              </div>
          </div>
      </div>

      {/* PLAN DISPLAY */}
      {plan && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
              
              <div className="flex justify-between items-end px-2">
                  <div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Active Operation</div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{plan.codename}</h3>
                  </div>
                  <div className="text-right">
                      <div className="text-[10px] font-bold text-zinc-500 uppercase">Est. Burn</div>
                      <div className="text-lg font-black text-orange-500">~{plan.totalCaloriesBurn} kcal</div>
                  </div>
              </div>

              {/* TIMELINE */}
              <div className="relative border-l-2 border-zinc-800 ml-4 space-y-8">
                  {plan.schedule.map((block, idx) => {
                      const isWorkout = block.sugarImpact < 0;
                      const isWorkoutCompleted = completedWorkouts.includes(idx);
                      const isMealCompleted = completedMeals.includes(idx);
                      
                      const isVerifying = activeVerification === idx;
                      const isVerifyingMeal = activeMealVerification === idx;

                      return (
                          <div key={idx} className="relative pl-6">
                              {/* Timeline Dot */}
                              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-colors duration-500
                                  ${isWorkoutCompleted ? 'bg-emerald-500 border-emerald-300' : isWorkout ? 'bg-rose-600 border-rose-400' : 'bg-zinc-900 border-zinc-600'}`}>
                              </div>
                              
                              {/* Time Label */}
                              <div className="flex items-baseline gap-2 mb-2">
                                  <span className="text-xl font-black text-white tracking-tight">{block.timeLabel}</span>
                                  <span className="text-[10px] font-bold text-teal-500 uppercase tracking-widest">{block.phase}</span>
                              </div>

                              {/* Content Card */}
                              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm group transition-all duration-300">
                                  
                                  {/* ACTION SECTION (Workout) */}
                                  <div className={`p-4 border-b border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center ${isWorkout ? 'bg-rose-50 dark:bg-rose-900/10' : ''} ${isWorkoutCompleted ? 'opacity-50' : ''}`}>
                                      <div className="flex-1 pr-4">
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="text-lg">{isWorkout ? '⚡' : '🧘'}</span>
                                              <h4 className={`font-bold uppercase text-sm ${isWorkout ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                  {block.actionName}
                                              </h4>
                                              {isWorkoutCompleted && <span className="bg-emerald-500/20 text-emerald-500 text-[9px] font-bold px-2 py-0.5 rounded">DONE</span>}
                                          </div>
                                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pl-7">
                                              {block.actionDetail}
                                          </p>
                                          
                                          {/* VERIFICATION FLOW FOR WORKOUTS */}
                                          {isWorkout && !isWorkoutCompleted && (
                                              <div className="mt-4 pl-7">
                                                  {isVerifying ? (
                                                      <div className="bg-black/20 p-3 rounded-xl border border-dashed border-zinc-500 animate-in fade-in">
                                                          {/* ... (Verification UI same as before) ... */}
                                                          <div className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Upload Proof of Execution</div>
                                                          <input 
                                                              type="file" 
                                                              accept="image/*"
                                                              ref={fileInputRef}
                                                              className="hidden"
                                                              onChange={handleFileSelect}
                                                          />
                                                          
                                                          {evidencePreview ? (
                                                              <div className="space-y-2">
                                                                  <div className="h-32 w-full bg-black rounded-lg overflow-hidden relative">
                                                                      <img src={evidencePreview} className="w-full h-full object-cover opacity-80" />
                                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                                          <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded">EVIDENCE ATTACHED</span>
                                                                      </div>
                                                                  </div>
                                                                  <div className="flex gap-2">
                                                                      <button onClick={() => { setActiveVerification(null); setEvidencePreview(null); }} className="flex-1 py-2 bg-zinc-700 rounded-lg text-xs font-bold text-white">Cancel</button>
                                                                      <button onClick={confirmCompletion} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-xs font-bold text-white shadow-lg">CONFIRM SUCCESS</button>
                                                                  </div>
                                                              </div>
                                                          ) : (
                                                              <div className="flex gap-2">
                                                                  <button 
                                                                      onClick={() => fileInputRef.current?.click()}
                                                                      className="flex-1 py-2 border border-zinc-500 hover:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors"
                                                                  >
                                                                      📷 Take Photo
                                                                  </button>
                                                                  <button 
                                                                      onClick={() => setActiveVerification(null)}
                                                                      className="px-3 text-zinc-500 text-xs hover:text-white"
                                                                  >
                                                                      Cancel
                                                                  </button>
                                                              </div>
                                                          )}
                                                      </div>
                                                  ) : (
                                                      <button 
                                                          onClick={() => setActiveVerification(idx)}
                                                          className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-emerald-500 hover:text-emerald-500 text-zinc-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                                                      >
                                                          <span className="w-2 h-2 border border-current rounded-sm"></span>
                                                          Mark Completed
                                                      </button>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                      
                                      {/* TACTICAL VISUALIZER - RESPONSIVE SIZE */}
                                      <TacticalVisualizer actionName={block.actionName} isBurn={isWorkout} />
                                  </div>

                                  {/* FUEL SECTION (MEAL) */}
                                  <div className={`p-4 bg-zinc-5 dark:bg-zinc-950/50 ${isMealCompleted ? 'opacity-50' : ''}`}>
                                      <div className="flex items-start gap-4">
                                          {/* INSTANT DIGITAL ASSET - RESPONSIVE SIZE */}
                                          <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 relative flex-shrink-0 shadow-lg">
                                              <MealVisualizer name={block.fuelName} isCompleted={isMealCompleted} />
                                          </div>

                                          <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-lg">🍱</span>
                                                  <h4 className="font-bold uppercase text-sm text-zinc-700 dark:text-zinc-300">
                                                      {block.fuelName}
                                                  </h4>
                                              </div>
                                              <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                                                  {block.fuelDetail}
                                              </p>

                                              {/* MEAL VERIFICATION FLOW */}
                                              {!isMealCompleted && (
                                                  <div className="mt-2">
                                                      {isVerifyingMeal ? (
                                                          <div className="bg-black/20 p-3 rounded-xl border border-dashed border-zinc-500 animate-in fade-in">
                                                              {/* ... Meal verification UI ... */}
                                                              <div className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Upload Rations Proof</div>
                                                              <input type="file" accept="image/*" ref={mealFileInputRef} className="hidden" onChange={handleFileSelect} />
                                                              {evidencePreview ? (
                                                                  <div className="space-y-2">
                                                                      <div className="h-24 w-full bg-black rounded-lg overflow-hidden relative">
                                                                          <img src={evidencePreview} className="w-full h-full object-cover opacity-80" />
                                                                          <div className="absolute inset-0 flex items-center justify-center">
                                                                              <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded">READY</span>
                                                                          </div>
                                                                      </div>
                                                                      <div className="flex gap-2">
                                                                          <button onClick={() => { setActiveMealVerification(null); setEvidencePreview(null); }} className="flex-1 py-1.5 bg-zinc-700 rounded-lg text-[10px] font-bold text-white">Cancel</button>
                                                                          <button onClick={confirmMealCompletion} className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-[10px] font-bold text-white shadow-lg">CONFIRM INTAKE</button>
                                                                      </div>
                                                                  </div>
                                                              ) : (
                                                                  <div className="flex gap-2">
                                                                      <button onClick={() => mealFileInputRef.current?.click()} className="flex-1 py-2 border border-zinc-500 hover:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors">📷 Scan Meal</button>
                                                                      <button onClick={() => setActiveMealVerification(null)} className="px-2 text-zinc-500 text-[10px] hover:text-white">X</button>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      ) : (
                                                          <button onClick={() => setActiveMealVerification(idx)} className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 hover:border-teal-500 hover:text-teal-500 text-zinc-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all">
                                                              <span className="w-2 h-2 border border-current rounded-sm"></span>Verify Intake
                                                          </button>
                                                      )}
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  </div>

                              </div>
                          </div>
                      );
                  })}
              </div>

          </div>
      )}

      {/* EMPTY STATE */}
      {!plan && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 opacity-50">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm text-center">Awaiting mission parameters.<br/>Define constraints to receive orders.</p>
          </div>
      )}

    </div>
  );
};

export default TacticalTrainingScreen;
