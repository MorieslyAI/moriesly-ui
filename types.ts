
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  sender: 'user' | 'spy';
  text: string;
  isWarning?: boolean;
}

export type ConsumptionTrigger = 'Hunger' | 'Boredom' | 'Stress' | 'Social' | 'Fatigue' | 'Habit';

// UPDATED: itemType now includes specific scan modes
export interface HistoryItem {
  id: string;
  name: string;
  sugarg: number;
  calories?: number; // NEW
  macros?: { // NEW
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  vitamins?: { // NEW
    name: string;
    amount: string;
    percent: number;
  }[];
  glycemicIndex?: number;
  glycemicLoad?: number;
  action: 'consumed' | 'rejected' | 'scanned';
  itemType?: 'food' | 'drink' | 'receipt' | 'versus' | 'skin' | 'label' | 'qr'; 
  timestamp: Date;
  aiVerdict: string;
  imageBase64?: string;
  focusTax?: number; 
  agingImpact?: string;
  antidote?: string; 
  trigger?: ConsumptionTrigger;
  metadata?: any; // Store complex results here (ReceiptData, VersusResult, LabelScanResult, etc)
  hasAddOn?: boolean; // NEW: Track if item has been updated with an add-on
}

export interface LedgerState {
  consumed: number;
  saved: number;
  willpower: number;
  limit: number;
  sugarDebt: number;
  calories: number; // NEW
  macros: { // NEW
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  vitamins?: { // NEW
    name: string;
    amount: string;
    percent: number;
  }[];
  lastUpdatedDate?: string; // NEW: To track when the ledger was last reset
}

export interface ActiveCrash {
  crashTime: Date; 
  severity: 'moderate' | 'severe' | 'critical';
  antidote: string; 
  isMitigated: boolean;
}

export interface AudioVolumeState {
  input: number; 
  output: number; 
}

export interface UserProfile {
  name: string;
  gender: 'male' | 'female';
  age: number;
  height: number; 
  weight: number; 
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streak: number;
  lastCheckInDate: string | null; 
  rankTitle: string;
  medicalConditions?: string[]; // NEW: Synced from Setup
  agent?: string; // NEW: Selected agent ID
  email?: string;
  password?: string;
  isWearableConnected?: boolean;
}

export interface PendingScanResult {
  name: string;
  sugar: number;
  calories?: number; // NEW
  macros?: { // NEW
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  vitamins?: { // NEW
    name: string;
    amount: string;
    percent: number;
  }[];
  glycemicIndex: number;
  verdict: string;
  type: 'food' | 'drink';
  imageBase64?: string;
  focus_tax: number; 
  aging_grade: 'Low' | 'Medium' | 'High' | 'Severe'; 
  sleep_penalty: 'None' | 'Mild' | 'Disruptive';
  honest_name?: string; 
  confidence_score?: number; 
  sugar_sources?: string[]; 
  visual_cues?: string[]; 
  data_ref?: string; 
  ingredients?: string[]; 
  explanation?: string;
  transFat?: number; // NEW
  salt?: number; // NEW
  organ_impact?: {
    id: string;
    stressLevel: 0 | 1 | 2;
    message: string;
    detail: string;
  }[];
  consumptionRatio?: number; // NEW: 0 to 1
}

// --- NEW FEATURES TYPES ---

export interface LabelScanResult {
  label_honesty_score: number; // 1-10
  product_name?: string; // NEW: Explicit product name detection
  hidden_additives: string[];
  deception_technique: string;
  technique_explanation: string;
  ingredients_snippet: string;
  verdict: string;
  hidden_sugar_grams: number;
  serving_size?: string; // NEW: To explain 8g vs 20g differences
  sodium_impact: 'Low' | 'Medium' | 'High' | 'Critical';
  sodium_explanation: string;
}

export interface BarcodeScanResult {
  product_name: string;
  sugar_grams: number;
  calories: number;
  risk_level: 'High' | 'Moderate' | 'Low';
  additives: {
    name: string;
    role: string;
    risk: string;
  }[];
  side_effects: {
    condition: string;
    severity: 'High' | 'Moderate' | 'Low';
    description: string;
    color: 'blue' | 'pink' | 'orange'; 
  }[];
}

export interface ReceiptItem {
  name: string;
  price: number;
  isSugary: boolean;
  sugarGrams: number;
}

export interface ReceiptAnalysis {
  totalSpent: number;
  wastedOnSugar: number;
  sugarPercentage: number; // Cost %
  currency: string; // e.g. "Rp", "$", "€"
  items: ReceiptItem[];
  financialVerdict: string; // e.g. "You wasted enough to buy a gym pass."
}

export interface VersusResult {
  winner: 'A' | 'B';
  itemA: { 
    name: string; 
    description: string; // Added for subtitle
    sugar: number; 
    calories: number; 
    score: number; 
    pros: string[]; 
    cons: string[] 
  };
  itemB: { 
    name: string; 
    description: string; // Added for subtitle
    sugar: number; 
    calories: number; 
    score: number; 
    pros: string[]; 
    cons: string[] 
  };
  verdict: string;
}

export interface FaceZone {
  area: string;
  condition: string; // e.g. "Glycation Lines", "Puffy", "Acne"
  severity: 'Low' | 'Medium' | 'High';
  treatment: string; // Specific advice for this spot
  explanation?: string; // Detailed observation
  coordinates?: { x: number; y: number }; // NEW: 0-100 Percentages relative to image
}

export interface SkinAnalysis {
  biologicalAge: number;
  glycationLevel: 'Low' | 'Moderate' | 'Critical';
  detectedIssues: string[]; // e.g. "Puffy Eyes", "Inflammation", "Acne"
  faceZones: FaceZone[]; // NEW: Specific mapped areas
  projection: string; // "In 5 years..."
  recommendations: {
      skincare: string;
      diet: string;
      habit: string;
      powerFoods: string[]; // NEW: Good foods
      avoidFoods: string[]; // NEW: Bad foods
      emergencyFix?: string; // NEW: Immediate quick fix
  };
}

export interface MealItem {
  type: 'Breakfast' | 'Lunch' | 'Dinner';
  menuName: string;
  contents: string; 
  ingredients: string[]; 
  instructions?: string; 
  prepTime: string; 
  calories: number;
  sugarGrams: number;
  fiberGrams: number;
}

export interface DayPlan {
  day: string; 
  meals: MealItem[];
  totalCalories: number;
  totalSugar: number;
}

export interface WeeklyPlan {
  id: string;
  weekName: string;
  days: DayPlan[];
}

export interface DietPlan {
  target: string;
  icon: string; 
  score: number; 
  summary: string;
  meals: MealItem[];
}

// --- TACTICAL TRAINING TYPES (Moved here for Sync) ---
export interface TimeBlock {
  timeLabel: string;
  phase: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  actionName: string;
  actionDetail: string;
  fuelName: string;
  fuelDetail: string;
  sugarImpact: number; // Negative for exercise, positive for food
}

export interface OperationPlan {
  codename: string;
  totalCaloriesBurn: number;
  schedule: TimeBlock[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; 
  timestamp: Date;
}

export interface WeightEntry {
  date: string; 
  weight: number;
}

export interface GoalConfig {
  eventName: string; 
  targetDate: string; 
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  startDate: string; 
  breakStartDate?: string; 
  breakDurationDays?: number; 
}

export interface ConsultationSession {
  id: string;
  date: Date;
  sessionType: 'video' | 'chat' | 'clinical'; // Added 'clinical'
  summary: string;
  advice: string; 
  transcript: ChatMessage[];
  userImages: string[]; 
  durationSeconds: number;
}

export interface Article {
  id: string;
  headline: string;
  location: string; 
  category: 'Breaking News' | 'Investigation' | 'Medical Report' | 'Opinion';
  caption: string; 
  fullContent: string; 
  timestamp: string;
  imagePrompt: string; 
  likes: number;
  impactScore: number;
}
