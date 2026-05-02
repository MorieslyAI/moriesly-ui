import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as api from './services/api';
import type { LoginResult } from './components/LoginScreen';
import type { SetupCalibrationData } from './components/SetupScreen';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { MessageSquare, Dumbbell, Wheat, Droplet, Leaf, Check } from 'lucide-react';
import VideoFeed, { VideoFeedHandle } from './components/VideoFeed';
import SetupScreen from './components/SetupScreen';
import OnboardingScreen from './components/OnboardingScreen';
import LoginScreen from './components/LoginScreen';
import LegalReminder from './components/LegalReminder';
import SugarPile from './components/SugarPile';
import BurnMeter from './components/BurnMeter';
import GlucosePredictor from './components/GlucosePredictor';
import OrganMap from './components/OrganMap';
import DeceptionDetector from './components/DeceptionDetector';
import FullDisclosure from './components/FullDisclosure'; // NEW
import MetabolicInvoice from './components/MetabolicInvoice';
import EvidencePanel from './components/EvidencePanel';
import NavBar from './components/NavBar';
import DietPlanScreen from './components/DietPlanScreen';
import ConsultantScreen from './components/ConsultantScreen';
import WeightTrackerScreen from './components/WeightTrackerScreen';
import HistoryScreen from './components/HistoryScreen';
import TriggerModal from './components/TriggerModal';
import DeathWaiver from './components/DeathWaiver';
import WillpowerGauntlet from './components/WillpowerGauntlet';
import TacticalTrainingScreen from './components/TacticalTrainingScreen';
import ReceiptAnalysis from './components/ReceiptAnalysis';
import VersusArena from './components/VersusArena';
import GlycationScanner from './components/GlycationScanner';
import SettingsScreen from './components/SettingsScreen';
import DeviceSyncScreen from './components/DeviceSyncScreen';
import UnifiedProfileDashboard from './components/UnifiedProfileDashboard';
import NotificationCenter from './components/NotificationCenter'; // NEW
import DashboardScreen from './components/DashboardScreen'; // NEW
import StatusScreen from './components/StatusScreen'; // NEW
import TrackScreen from './components/TrackScreen'; // NEW
import ExploreScreen from './components/ExploreScreen'; // NEW

import JSON5 from 'json5';
import { GeminiLiveService } from './services/geminiLiveService';
import { ConnectionState, HistoryItem, LedgerState, LogEntry, UserProfile, ActiveCrash, PendingScanResult, WeightEntry, GoalConfig, ConsumptionTrigger, ConsultationSession, ReceiptAnalysis as ReceiptData, VersusResult, SkinAnalysis, FaceZone, DietPlan, OperationPlan, LabelScanResult, BarcodeScanResult } from './types';
import { MANUAL_SCAN_MODEL, GET_SYSTEM_INSTRUCTION, LABEL_SCAN_PROMPT, FOOD_SCAN_PROMPT, IDENTIFY_SCAN_PROMPT, QR_SCAN_PROMPT, RECEIPT_SCAN_PROMPT, VERSUS_SCAN_PROMPT, SKIN_SCAN_PROMPT, API_KEY, safeGenerateContent } from './constants';
import { getLocalDateString } from './utils';
import { postScanImage, postVersusScan, postSkinScan, saveDashboardHistoryItem, startVideoCallSession, endVideoCallSession, getSocketToken } from './services/api';

function App() {
    const [showOnboarding, setShowOnboarding] = useState(() => {
        return localStorage.getItem('hasSeenOnboarding') !== 'true';
    });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLegal, setShowLegal] = useState(false);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('isDarkMode') === 'true';
    });
    const [currentView, setCurrentView] = useState<'dashboard' | 'camera' | 'diet' | 'consultant' | 'tracker' | 'history' | 'blog' | 'training' | 'medical' | 'settings' | 'devices' | 'profile' | 'notifications' | 'chat' | 'calendar' | 'status' | 'track' | 'explore'>('dashboard');

    const [addOnTargetId, setAddOnTargetId] = useState<string | null>(null); // NEW: Track which item is receiving an add-on
    const [isFullScreenVideo, setIsFullScreenVideo] = useState(false);

    const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
    const [trainingPlan, setTrainingPlan] = useState<OperationPlan | null>(null);
    const [completedWorkouts, setCompletedWorkouts] = useState<number[]>([]);
    const [completedMeals, setCompletedMeals] = useState<number[]>([]);

    const [userStats, setUserStats] = useState<UserProfile>(() => {
        const saved = localStorage.getItem('userStats');
        const defaultProfile: UserProfile = {
            name: 'Agent',
            gender: 'male',
            age: 30,
            height: 175,
            weight: 75,
            level: 1,
            currentXp: 0,
            nextLevelXp: 100,
            streak: 0,
            lastCheckInDate: null,
            rankTitle: 'Rookie Agent',
            medicalConditions: []
        };
        try {
            if (saved) {
                const parsed = JSON5.parse(saved);
                return { ...defaultProfile, ...parsed };
            }
            return defaultProfile;
        } catch (e) {
            return defaultProfile;
        }
    });

    const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => {
        const saved = localStorage.getItem('weightHistory');
        try {
            const parsed = saved ? JSON5.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    });

    const [currentGoal, setCurrentGoal] = useState<GoalConfig>(() => {
        const saved = localStorage.getItem('currentGoal');
        const defaultGoal: GoalConfig = {
            eventName: "Summer Body Mission",
            startDate: getLocalDateString(),
            targetDate: getLocalDateString(new Date(new Date().setMonth(new Date().getMonth() + 3))),
            startWeight: 75,
            currentWeight: 75,
            targetWeight: 68
        };
        try {
            if (saved) {
                const parsed = JSON5.parse(saved);
                return { ...defaultGoal, ...parsed };
            }
            return defaultGoal;
        } catch (e) {
            return defaultGoal;
        }
    });

    const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
    const [isScanning, setIsScanning] = useState(false);
    const [scanMode, setScanMode] = useState<'food' | 'label' | 'qr' | 'receipt' | 'versus'>('food');
    const [isConfirmingScan, setIsConfirmingScan] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);

    const [agentVolume, setAgentVolume] = useState(0);
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [manualName, setManualName] = useState('');
    const [manualType, setManualType] = useState<'food' | 'drink'>('food');
    const [showTriggerModal, setShowTriggerModal] = useState(false);
    const [showDeathWaiver, setShowDeathWaiver] = useState(false);
    const [activeCrash, setActiveCrash] = useState<ActiveCrash | null>(null);
    const [transcript, setTranscript] = useState<{ text: string, isUser: boolean } | null>(null);
    const [missionLogs, setMissionLogs] = useState<LogEntry[]>([]);
    const transcriptTimeoutRef = useRef<number | null>(null);
    const [consultationHistory, setConsultationHistory] = useState<ConsultationSession[]>([]);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    const aiResponseBuffer = useRef<string>("");
    const activeLogId = useRef<string | null>(null);
    const lastSpeaker = useRef<'user' | 'spy' | null>(null);

    const [ledger, setLedger] = useState<LedgerState>(() => {
        const saved = localStorage.getItem('ledger');
        const defaultLedger: LedgerState = {
            consumed: 0,
            saved: 0,
            willpower: 50,
            limit: 25,
            sugarDebt: 0,
            calories: 0,
            macros: { protein: 0, carbs: 0, fat: 0 },
            vitamins: [],
            lastUpdatedDate: getLocalDateString()
        };
        try {
            if (saved) {
                const parsed = JSON5.parse(saved);
                const today = getLocalDateString();
                // If the date has changed, reset daily totals but keep limit and sugarDebt
                if (parsed.lastUpdatedDate && parsed.lastUpdatedDate !== today) {
                    return {
                        ...defaultLedger,
                        limit: parsed.limit || defaultLedger.limit,
                        sugarDebt: parsed.sugarDebt || 0,
                        lastUpdatedDate: today
                    };
                }
                return { ...defaultLedger, ...parsed, macros: { ...defaultLedger.macros, ...(parsed.macros || {}) }, vitamins: parsed.vitamins || [] };
            }
            return defaultLedger;
        } catch (e) {
            return defaultLedger;
        }
    });

    const [history, setHistory] = useState<HistoryItem[]>(() => {
        const saved = localStorage.getItem('history');
        if (saved) {
            try {
                const parsed = JSON5.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed
                        .filter((item: any) => item.metadata?.type !== 'checkin') // Remove old check-ins
                        .map((item: any) => {
                            const d = new Date(item.timestamp);
                            return {
                                ...item,
                                timestamp: isNaN(d.getTime()) ? new Date() : d
                            };
                        });
                }
                return [];
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [pendingItem, setPendingItem] = useState<PendingScanResult | null>(null);
    const [identifiedItem, setIdentifiedItem] = useState<{ name: string, type: 'food' | 'drink', imageBase64: string } | null>(null);

    // --- SPECIAL MODE RESULTS ---
    const [labelResult, setLabelResult] = useState<LabelScanResult | null>(null);
    const [barcodeResult, setBarcodeResult] = useState<BarcodeScanResult | null>(null); // NEW
    const [receiptResult, setReceiptResult] = useState<ReceiptData | null>(null);
    const [versusResult, setVersusResult] = useState<VersusResult | null>(null);
    const [skinResult, setSkinResult] = useState<SkinAnalysis | null>(null);

    // Versus Mode State Machine
    const [versusStage, setVersusStage] = useState<'idle' | 'captureA' | 'captureB'>('idle');
    const [versusImgA, setVersusImgA] = useState<string | null>(null);
    const [versusImgB, setVersusImgB] = useState<string | null>(null);

    const serviceRef = useRef<GeminiLiveService | null>(null);
    const videoFeedRef = useRef<VideoFeedHandle>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeVideoSessionIdRef = useRef<string | null>(null);
    const isFinalizingVideoRef = useRef(false);
    const [videoRemainingSeconds, setVideoRemainingSeconds] = useState<number | null>(null);
    const [videoRemainingCallsToday, setVideoRemainingCallsToday] = useState<number | null>(null);

    const sugarPercent = Math.min((ledger.consumed / ledger.limit) * 100, 100);
    const isOverLimit = ledger.consumed > ledger.limit;

    // --- NOTIFICATION BADGE STATE ---
    const hasNotifications = useMemo(() => {
        return ledger.consumed > ledger.limit || ledger.sugarDebt > 0 || (userStats.medicalConditions && userStats.medicalConditions.length > 0);
    }, [ledger, userStats]);

    // ─── Session Restore ────────────────────────────────────────────────────────
    // Saat app pertama kali mount, coba restore sesi dari httpOnly cookie.
    // Jika berhasil, langsung masuk ke app tanpa perlu login ulang.
    useEffect(() => {
        api.tryRestoreSession()
            .then((session) => {
                if (session) {
                    setIsLoggedIn(true);
                    if (session.isCalibrationComplete) {
                        setIsSetupComplete(true);
                    }
                    if (session.displayName) {
                        setUserStats(prev => ({ ...prev, name: session.displayName }));
                    }
                }
            })
            .finally(() => setIsCheckingSession(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            if (activeVideoSessionIdRef.current) {
                void endVideoCallSession(activeVideoSessionIdRef.current, 'app_unmount');
            }
        };
    }, []);

    useEffect(() => {
        const today = getLocalDateString();
        if (ledger.lastUpdatedDate && ledger.lastUpdatedDate !== today) {
            setLedger(prev => ({
                ...prev,
                consumed: 0,
                saved: 0,
                calories: 0,
                macros: { protein: 0, carbs: 0, fat: 0 },
                vitamins: [],
                lastUpdatedDate: today
            }));
        }
    }, [ledger.lastUpdatedDate]);

    useEffect(() => {
        try {
            localStorage.setItem('userStats', JSON.stringify(userStats));
        } catch (e) {
            console.error("Failed to save userStats to localStorage:", e);
        }
    }, [userStats]);

    useEffect(() => {
        try {
            localStorage.setItem('ledger', JSON.stringify(ledger));
        } catch (e) {
            console.error("Failed to save ledger to localStorage:", e);
        }
    }, [ledger]);

    useEffect(() => {
        try {
            localStorage.setItem('history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history to localStorage:", e);
            // If full, trim history to last 50 items as a fallback
            if (history.length > 50) {
                const trimmed = history.slice(0, 50);
                try {
                    localStorage.setItem('history', JSON.stringify(trimmed));
                } catch (e2) {
                    console.error("Even trimmed history failed to save:", e2);
                }
            }
        }
    }, [history]);

    useEffect(() => {
        try {
            localStorage.setItem('weightHistory', JSON.stringify(weightHistory));
        } catch (e) {
            console.error("Failed to save weightHistory to localStorage:", e);
        }
    }, [weightHistory]);

    useEffect(() => {
        try {
            localStorage.setItem('currentGoal', JSON.stringify(currentGoal));
        } catch (e) {
            console.error("Failed to save currentGoal to localStorage:", e);
        }
    }, [currentGoal]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        try {
            localStorage.setItem('isDarkMode', String(isDarkMode));
        } catch (e) {
            console.error('Failed to save isDarkMode:', e);
        }
    }, [isDarkMode]);

    useEffect(() => {
        // Reset Versus state when switching modes
        if (scanMode !== 'versus') {
            setVersusStage('idle');
            setVersusImgA(null);
            setVersusImgB(null);
            setVersusResult(null);
        }
    }, [scanMode]);

    const addXp = (amount: number) => {
        setUserStats(prev => {
            let newXp = prev.currentXp + amount;
            let newLevel = prev.level;
            let nextXp = prev.nextLevelXp;
            while (newXp >= nextXp && newLevel < 100) {
                newLevel += 1;
                newXp = newXp - nextXp;
                nextXp = Math.floor(nextXp * 1.15);
            }
            if (newLevel >= 100) { newLevel = 100; newXp = 0; }
            const newRank = newLevel >= 100 ? "The Glycemic God" : newLevel >= 75 ? "Bio-Hacking Legend" : newLevel >= 50 ? "Master of Metabolism" : newLevel >= 30 ? "Elite Detective" : newLevel >= 20 ? "Metabolic Enforcer" : newLevel >= 10 ? "Sugar Hunter" : newLevel >= 5 ? "Field Operative" : "Rookie Agent";
            return { ...prev, level: newLevel, currentXp: newXp, nextLevelXp: nextXp, rankTitle: newRank };
        });
    };

    const handleCheckIn = () => {
        const today = getLocalDateString();
        if (userStats.lastCheckInDate === today) return;

        // Reset ledger for the new day
        setLedger(prev => ({
            ...prev,
            consumed: 0,
            saved: 0,
            calories: 0,
            macros: { protein: 0, carbs: 0, fat: 0 },
            vitamins: [],
            lastUpdatedDate: today
        }));

        setUserStats(prev => {
            let newStreak = prev.streak;
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            if (prev.lastCheckInDate === getLocalDateString(yesterday)) newStreak += 1; else if (prev.lastCheckInDate !== today) newStreak = 1;
            return { ...prev, streak: newStreak, lastCheckInDate: today };
        });
        addXp(50);
    };

    const handleLoginSuccess = (result: LoginResult) => {
        setIsLoggedIn(true);
        setShowLegal(true);
        if (result.isCalibrationComplete) {
            setIsSetupComplete(true);
        }
    };

    const handleLogout = async () => {
        try {
            await api.logout();
        } catch (e) {
            console.error('[Logout] API call failed, continuing anyway:', e);
        }
        // Clear all persisted local state
        localStorage.removeItem('userStats');
        localStorage.removeItem('ledger');
        localStorage.removeItem('history');
        localStorage.removeItem('weightHistory');
        localStorage.removeItem('currentGoal');
        // Reset React state so the user sees the LoginScreen
        setIsLoggedIn(false);
        setIsSetupComplete(false);
        setCurrentView('dashboard');
    };

    const handleSetupComplete = (
        limit: number,
        profileName: string,
        stats: any,
        calibration: SetupCalibrationData
    ) => {
        // Update state lokal langsung untuk UX responsif
        setLedger(prev => ({ ...prev, limit }));
        setUserStats(prev => ({ ...prev, name: profileName, ...stats }));
        setCurrentGoal(prev => ({ ...prev, startWeight: stats.weight, currentWeight: stats.weight, targetWeight: stats.weight - 5 }));
        setWeightHistory([{ date: getLocalDateString(), weight: stats.weight }]);
        setIsSetupComplete(true);

        // Simpan data kalibrasi ke BE secara async (tidak block UI)
        api.saveCalibration({
            name: profileName,
            gender: stats.gender,
            age: stats.age,
            height: stats.height,
            weight: stats.weight,
            medicalConditions: stats.medicalConditions ?? [],
            archetypeId: calibration.archetypeId,
            dailySteps: calibration.dailySteps,
            workoutFreq: calibration.workoutFreq,
            workoutIntensity: calibration.workoutIntensity,
            goalMode: calibration.goalMode,
            customSugarLimit: calibration.customSugarLimit,
        }).catch((err) => {
            console.error('[Calibration] Gagal menyimpan ke server:', err?.message);
        });
    };

    const addHistoryItem = async (item: HistoryItem) => {
        setHistory(prev => [item, ...prev]);
        try {
            await saveDashboardHistoryItem(item);
        } catch (e) {
            console.error("Failed to save history to backend:", e);
        }
    };

    const handleUpdateHistoryItem = async (updatedItem: HistoryItem) => {
        // 1. Find the old item in history
        const oldItem = history.find(item => item.id === updatedItem.id);
        if (!oldItem) return;

        // 2. Update history
        setHistory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));

        try {
            await saveDashboardHistoryItem(updatedItem);
        } catch (e) {
            console.error("Failed to update history to backend:", e);
        }

        // 3. Update ledger (subtract old values, add new values)
        setLedger(prev => {
            const oldMacros = oldItem.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 };
            const newMacros = updatedItem.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 };

            return {
                ...prev,
                consumed: Math.round((prev.consumed - (oldItem.sugarg || 0) + (updatedItem.sugarg || 0)) * 10) / 10,
                calories: Math.round((prev.calories - (oldItem.calories || 0) + (updatedItem.calories || 0)) * 10) / 10,
                macros: {
                    protein: Math.round((prev.macros.protein - oldMacros.protein + newMacros.protein) * 10) / 10,
                    carbs: Math.round((prev.macros.carbs - oldMacros.carbs + newMacros.carbs) * 10) / 10,
                    fat: Math.round((prev.macros.fat - oldMacros.fat + newMacros.fat) * 10) / 10,
                    fiber: Math.round(((prev.macros.fiber || 0) - (oldMacros.fiber || 0) + (newMacros.fiber || 0)) * 10) / 10
                }
            };
        });
    };

    const sanitizeNutritionalData = (data: any) => {
        const calories = Math.min(data.calories || 0, 5000);
        const sugar = Math.min(data.sugar || data.sugar_grams || data.hidden_sugar_grams || 0, 500);
        const glycemicIndex = Math.min(data.glycemicIndex || 0, 100);
        const macros = {
            protein: Math.min(data.macros?.protein || data.protein_grams || 0, 500),
            carbs: Math.min(data.macros?.carbs || data.carb_grams || 0, 1000),
            fat: Math.min(data.macros?.fat || data.fat_grams || 0, 500),
            fiber: Math.min(data.macros?.fiber || data.fiber_grams || 0, 200),
        };
        return { ...data, calories, sugar, glycemicIndex, macros };
    };

    const handleTextAddOn = async (itemId: string, text: string) => {
        if (isScanning) return null;
        setIsScanning(true);
        updateStreamingLog('spy', `Analyzing add-on: ${text}...`);

        try {
            const response = await api.postAddonScan(text);

            if (response.success && response.data) {
                const data = sanitizeNutritionalData(response.data);
                const item = history.find(h => h.id === itemId);
                if (item) {
                    const updatedItem = {
                        ...item,
                        name: `${item.name} (+ ${text})`,
                        sugarg: Math.round(((item.sugarg || 0) + (data.sugar || 0)) * 10) / 10,
                        calories: Math.round(((item.calories || 0) + (data.calories || 0)) * 10) / 10,
                        hasAddOn: true,
                        macros: {
                            protein: Math.round(((item.macros?.protein || 0) + (data.protein || 0)) * 10) / 10,
                            carbs: Math.round(((item.macros?.carbs || 0) + (data.carbs || 0)) * 10) / 10,
                            fat: Math.round(((item.macros?.fat || 0) + (data.fat || 0)) * 10) / 10,
                            fiber: Math.round(((item.macros?.fiber || 0) + (data.fiber || 0)) * 10) / 10
                        }
                    };
                    handleUpdateHistoryItem(updatedItem);
                    updateStreamingLog('spy', `Add-on processed: +${data.calories} kcal`);
                    return data;
                }
            }
        } catch (err) {
            console.error("Failed to process text add-on:", err);
            alert("Failed to analyze add-on. Please try again.");
        } finally {
            setIsScanning(false);
        }
        return null;
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                setUploadedImage(base64);
            };
            reader.readAsDataURL(file);
        }
        // CRITICAL: Reset input value so onChange fires even if the same file is selected again
        e.target.value = '';
    };

    // --- FACE SCAN HANDLER (fully delegated to BE) ---
    const handleSkinScan = async (file: File) => {
        if (isScanning) return;
        setIsScanning(true);
        setSkinResult(null);

        try {
            // 1. Baca file menjadi base64
            const base64Image = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // 2. Kirim ke BE — semua logika AI ada di MasterAPI
            const apiRes = await postSkinScan(base64Image);

            if (apiRes.success && apiRes.data) {
                const data = apiRes.data;
                setSkinResult(data);
                addXp(50);

                // Catat ke history
                addHistoryItem({
                    id: uuidv4(),
                    name: `Bio-Scan: Age ${data.biologicalAge}`,
                    sugarg: 0,
                    action: 'scanned',
                    itemType: 'skin',
                    timestamp: new Date(),
                    aiVerdict: `Glycation: ${data.glycationLevel}`,
                    imageBase64: base64Image,
                    metadata: data
                });
            } else {
                alert("Scan gagal. Coba lagi.");
            }
        } catch (err) {
            console.error("Skin scan error:", err);
            alert("Scan gagal diproses. Pastikan kamu sudah login.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleManualScan = async () => {
        if (isScanning) return;
        const base64Image = uploadedImage || videoFeedRef.current?.getSnapshot();
        if (!base64Image) { updateStreamingLog('spy', 'Error: No image.'); return; }

        // --- VERSUS MODE LOGIC ---
        if (scanMode === 'versus') {
            if (versusStage === 'idle' || versusStage === 'captureA') {
                setVersusImgA(base64Image);
                setVersusStage('captureB');
                updateStreamingLog('spy', 'Item A Acquired. Please Scan Item B.');
                setUploadedImage(null); // Clear upload for next item
                return;
            }

            if (versusStage === 'captureB') {
                setVersusImgB(base64Image);
                // DO NOT RETURN, PROCEED TO SCAN BOTH
            } else {
                // Should not happen, but reset if so
                setVersusStage('idle');
                return;
            }
        }

        setIsScanning(true);
        setPendingItem(null); setLabelResult(null); setReceiptResult(null); setBarcodeResult(null);
        if (scanMode !== 'versus') { setVersusResult(null); } // Only clear versus if not in versus mode
        setIsCorrecting(false); activeLogId.current = null;
        updateStreamingLog('spy', 'Analyzing...');

        try {
            // --- VERSUS MODE LOGIC ---
            if (scanMode === 'versus') {
                const apiRes = await postVersusScan(versusImgA || base64Image, base64Image); // Use API
                if (apiRes.success && apiRes.data) {
                    try {
                        const data = apiRes.data;
                        setVersusResult(data);
                        // Versus stage reset happens in UI close
                    } catch (err) {
                        console.error("Failed to parse versus result:", err);
                        alert("Failed to analyze comparison. Please try again.");
                    }
                }
            }
            // --- STANDARD PROMPT CONSTRUCTION ---
            else {
                const apiRes = await postScanImage(base64Image, scanMode); // Use API

                if (apiRes.success && apiRes.data) {
                    try {
                        const data = apiRes.data;

                        if (addOnTargetId) {
                            const item = history.find(h => h.id === addOnTargetId);
                            if (item) {
                                const rawData = data;
                                const dataSanitized = sanitizeNutritionalData(rawData);
                                const updatedItem = {
                                    ...item,
                                    name: `${item.name} (+ Add-on Scan)`,
                                    sugarg: Math.round(((item.sugarg || 0) + dataSanitized.sugar) * 10) / 10,
                                    calories: Math.round(((item.calories || 0) + dataSanitized.calories) * 10) / 10,
                                    hasAddOn: true,
                                    macros: {
                                        protein: Math.round(((item.macros?.protein || 0) + dataSanitized.macros.protein) * 10) / 10,
                                        carbs: Math.round(((item.macros?.carbs || 0) + dataSanitized.macros.carbs) * 10) / 10,
                                        fat: Math.round(((item.macros?.fat || 0) + dataSanitized.macros.fat) * 10) / 10,
                                        fiber: Math.round(((item.macros?.fiber || 0) + dataSanitized.macros.fiber) * 10) / 10
                                    }
                                };
                                handleUpdateHistoryItem(updatedItem);
                                setAddOnTargetId(null);
                                setCurrentView('dashboard');
                                updateStreamingLog('spy', `Add-on scan processed!`);
                            }
                            return;
                        }

                        if (scanMode === 'receipt') {
                            setReceiptResult(data);
                            // CRITICAL FIX: Calculate total sugar from individual items
                            // 'wastedOnSugar' is a monetary value, not grams.
                            const totalActualSugarGrams = data.items
                                ? data.items.reduce((acc: number, item: any) => acc + (item.sugarGrams || 0), 0)
                                : 0;

                            addHistoryItem({
                                id: uuidv4(),
                                name: 'Receipt Scan',
                                sugarg: Math.round(totalActualSugarGrams * 10) / 10,
                                action: 'scanned',
                                itemType: 'receipt',
                                timestamp: new Date(),
                                aiVerdict: data.financialVerdict,
                                imageBase64: base64Image,
                                metadata: data
                            });
                            setCurrentView('dashboard'); // Switch to dashboard to show result
                        } else if (scanMode === 'label') {
                            setLabelResult(data);
                            addHistoryItem({ id: uuidv4(), name: 'Label Scan', sugarg: Math.round((data.hidden_sugar_grams || 0) * 10) / 10, action: 'scanned', itemType: 'label', timestamp: new Date(), aiVerdict: data.verdict, imageBase64: base64Image, metadata: data });
                            setCurrentView('dashboard'); // Switch to dashboard to show result
                        } else if (scanMode === 'qr') {
                            setBarcodeResult(data);
                            addHistoryItem({ id: uuidv4(), name: data.product_name || 'Barcode Scan', sugarg: Math.round((data.sugar_grams || 0) * 10) / 10, action: 'scanned', itemType: 'qr', timestamp: new Date(), aiVerdict: `Risk: ${data.risk_level}`, imageBase64: base64Image, metadata: data });
                            setCurrentView('dashboard'); // Switch to dashboard to show result
                        } else {
                            setIdentifiedItem({
                                name: data.name || "Unknown Item",
                                type: data.type === 'drink' ? 'drink' : 'food',
                                imageBase64: base64Image
                            });
                            setIsConfirmingScan(true);
                            setCurrentView('dashboard'); // Switch to dashboard to show result
                        }
                    } catch (err) {
                        console.error("Failed to parse scan result:", err);
                        alert("Failed to analyze image. Please try again.");
                    }
                }
            }
        } catch (e) { console.error(e); updateStreamingLog('spy', 'Scan Failed'); }
        finally { setIsScanning(false); }
    };

    const handleReanalyze = async (overrideName?: string, overrideType?: 'food' | 'drink') => {
        const targetName = overrideName || manualName;
        const targetType = overrideType || manualType;

        if (!targetName || isScanning) return;
        setIsScanning(true);
        setIsCorrecting(false);
        updateStreamingLog('spy', 'Re-analyzing with manual input...');

        try {
            const base64Image = identifiedItem?.imageBase64 || pendingItem?.imageBase64 || uploadedImage || videoFeedRef.current?.getSnapshot() || undefined;

            const response = await api.postReanalyzeScan(targetName, targetType || "food", base64Image);

            if (response.success && response.data) {
                const data = sanitizeNutritionalData(response.data);
                setPendingItem({
                    name: data.name,
                    sugar: Math.round(data.sugar * 10) / 10,
                    calories: Math.round(data.calories * 10) / 10,
                    macros: {
                        protein: Math.round(data.macros.protein * 10) / 10,
                        carbs: Math.round(data.macros.carbs * 10) / 10,
                        fat: Math.round(data.macros.fat * 10) / 10,
                        fiber: Math.round(data.macros.fiber * 10) / 10
                    },
                    vitamins: data.vitamins || [],
                    glycemicIndex: data.glycemicIndex,
                    verdict: data.verdict,
                    type: data.type === 'drink' ? 'drink' : 'food',
                    confidence_score: data.confidence_score,
                    sugar_sources: data.sugar_sources,
                    visual_cues: data.visual_cues,
                    data_ref: data.data_ref,
                    focus_tax: data.focus_tax,
                    aging_grade: data.aging_grade,
                    sleep_penalty: data.sleep_penalty,
                    honest_name: data.honest_name,
                    imageBase64: base64Image || null,
                    ingredients: data.ingredients,
                    explanation: data.explanation,
                    transFat: data.transFat || data.trans_fat || data.transfat || 0,
                    salt: data.salt || data.sodium || data.natrium || 0,
                    organ_impact: data.organ_impact
                });
                setIsConfirmingScan(false);
                setIdentifiedItem(null);
            }
        } catch (e) {
            console.error(e);
            alert("Re-analysis failed.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleVersusDecision = (winner: 'A' | 'B' | 'Reject') => {
        if (!versusResult) return;

        if (winner === 'Reject') {
            setLedger(prev => ({
                ...prev,
                saved: Math.round((prev.saved + (versusResult.itemA.sugar + versusResult.itemB.sugar) / 2) * 10) / 10,
                willpower: prev.willpower + 50
            }));
            addXp(50);
            addHistoryItem({
                id: uuidv4(),
                name: `VS: ${versusResult.itemA.name} vs ${versusResult.itemB.name}`,
                sugarg: 0,
                action: 'rejected',
                itemType: 'versus',
                timestamp: new Date(),
                aiVerdict: "Rejected both options. " + versusResult.verdict,
                metadata: versusResult
            });
        } else {
            // User Consumed one
            const chosenItem = winner === 'A' ? versusResult.itemA : versusResult.itemB;
            const newConsumed = ledger.consumed + chosenItem.sugar;

            setLedger(prev => {
                let addedDebt = 0;
                if (prev.consumed >= prev.limit) addedDebt = chosenItem.sugar;
                else if (newConsumed > prev.limit) addedDebt = newConsumed - prev.limit;
                return {
                    ...prev,
                    consumed: Math.round(newConsumed * 10) / 10,
                    sugarDebt: Math.round((prev.sugarDebt + addedDebt) * 10) / 10,
                    willpower: Math.max(0, prev.willpower - 10)
                }
            });
            addXp(10);

            addHistoryItem({
                id: uuidv4(),
                name: chosenItem.name,
                sugarg: Math.round(chosenItem.sugar * 10) / 10,
                calories: Math.round((chosenItem.calories || 0) * 10) / 10,
                action: 'consumed',
                itemType: 'versus', // Log as Versus item but consumed
                timestamp: new Date(),
                aiVerdict: `Chose over ${winner === 'A' ? versusResult.itemB.name : versusResult.itemA.name}. ${versusResult.verdict}`,
                metadata: versusResult
            });
        }

        setVersusResult(null);
        setVersusImgA(null);
        setVersusImgB(null);
        setVersusStage('idle');
        setUploadedImage(null); // Clear upload to allow fresh start
    };

    const initiateDecision = (action: 'consumed' | 'rejected') => {
        console.log(`[DEBUG] initiateDecision called with action: ${action}`);
        if (!pendingItem) {
            console.warn("[DEBUG] initiateDecision: pendingItem is null");
            return;
        }
        if (action === 'consumed') {
            console.log(`[DEBUG] initiateDecision: sugar amount is ${pendingItem.sugar}`);
            if (pendingItem.sugar > 40) {
                console.log("[DEBUG] initiateDecision: showing death waiver");
                setShowDeathWaiver(true);
            } else {
                console.log("[DEBUG] initiateDecision: showing trigger modal");
                setShowTriggerModal(true);
            }
        } else {
            console.log("[DEBUG] initiateDecision: finalizing rejection");
            finalizeDecision('rejected');
        }
    };

    const finalizeDecision = (action: 'consumed' | 'rejected', trigger?: ConsumptionTrigger, ratio: number = 1) => {
        console.log(`[DEBUG] finalizeDecision called with action: ${action}, trigger: ${trigger}`);
        if (!pendingItem) {
            console.warn("[DEBUG] finalizeDecision: pendingItem is null");
            return;
        }
        let antidote = "";

        let itemCalories = Math.round(Math.min((pendingItem.calories || 0) * ratio, 5000) * 10) / 10;
        let itemProtein = Math.round(Math.min((pendingItem.macros?.protein || 0) * ratio, 500) * 10) / 10;
        let itemCarbs = Math.round(Math.min((pendingItem.macros?.carbs || 0) * ratio, 1000) * 10) / 10;
        let itemFat = Math.round(Math.min((pendingItem.macros?.fat || 0) * ratio, 500) * 10) / 10;
        let itemFiber = Math.round(Math.min((pendingItem.macros?.fiber || 0) * ratio, 200) * 10) / 10;
        let itemSugar = Math.round(Math.min(pendingItem.sugar * ratio, 500) * 10) / 10;

        if (action === 'consumed') {
            // Fallback calculation if calories are 0 but macros exist
            if (itemCalories === 0 && (itemProtein > 0 || itemCarbs > 0 || itemFat > 0)) {
                itemCalories = Math.round(((itemProtein * 4) + (itemCarbs * 4) + (itemFat * 9)) * 10) / 10;
            }

            // Fallback if everything is 0 but sugar exists (sugar is a carb)
            if (itemCalories === 0 && itemSugar > 0) {
                itemCalories = Math.round((itemSugar * 4) * 10) / 10;
                itemCarbs = Math.max(itemCarbs, itemSugar);
            }

            const newConsumed = ledger.consumed + itemSugar;

            // Calculate new macros
            const newProtein = (ledger.macros?.protein || 0) + itemProtein;
            const newCarbs = (ledger.macros?.carbs || 0) + itemCarbs;
            const newFat = (ledger.macros?.fat || 0) + itemFat;
            const newFiber = (ledger.macros?.fiber || 0) + itemFiber;
            const newCalories = (ledger.calories || 0) + itemCalories;

            // Accumulate vitamins
            // Logic moved inside setLedger to ensure we use the latest state

            setLedger(prev => {
                let addedDebt = 0;
                if (prev.consumed >= prev.limit) addedDebt = itemSugar;
                else if (newConsumed > prev.limit) addedDebt = newConsumed - prev.limit;

                // Calculate new vitamins inside setter to use latest prev state
                const currentVitamins = prev.vitamins || [];
                const newVitamins = pendingItem.vitamins || [];
                const updatedVitamins = [...currentVitamins];

                newVitamins.forEach(newVit => {
                    const existingIndex = updatedVitamins.findIndex(v => v.name === newVit.name);
                    if (existingIndex >= 0) {
                        updatedVitamins[existingIndex] = {
                            ...updatedVitamins[existingIndex],
                            percent: updatedVitamins[existingIndex].percent + (parseFloat(newVit.amount) * ratio),
                        };
                    } else {
                        updatedVitamins.push({ ...newVit, percent: parseFloat(newVit.amount) * ratio });
                    }
                });

                return {
                    ...prev,
                    consumed: Math.round(newConsumed * 10) / 10,
                    sugarDebt: Math.round((prev.sugarDebt + addedDebt) * 10) / 10,
                    willpower: Math.max(0, prev.willpower - 10),
                    calories: Math.round(newCalories * 10) / 10,
                    macros: {
                        protein: Math.round(newProtein * 10) / 10,
                        carbs: Math.round(newCarbs * 10) / 10,
                        fat: Math.round(newFat * 10) / 10,
                        fiber: Math.round(newFiber * 10) / 10
                    },
                    vitamins: updatedVitamins
                }
            });
            addXp(10);
            if (itemSugar > 15 && (pendingItem.glycemicIndex || 50) > 50) {
                const minutesToCrash = 90 - ((pendingItem.glycemicIndex || 50) * 0.5);
                const crashDate = new Date(); crashDate.setMinutes(crashDate.getMinutes() + minutesToCrash);
                antidote = itemSugar > 30 ? "Walk 15 mins" : "Drink Water";
                setActiveCrash({ crashTime: crashDate, severity: itemSugar > 40 ? 'critical' : 'moderate', antidote: antidote, isMitigated: false });
            }
        } else {
            setLedger(prev => ({
                ...prev,
                saved: Math.round((prev.saved + itemSugar) * 10) / 10,
                willpower: prev.willpower + 100
            }));
            addXp(25);
        }
        const gl = (pendingItem.glycemicIndex !== undefined) ? Math.round((pendingItem.glycemicIndex * pendingItem.sugar) / 100) : undefined;

        addHistoryItem({
            id: uuidv4(),
            name: pendingItem.honest_name || pendingItem.name,
            sugarg: itemSugar,
            calories: action === 'consumed' ? itemCalories : pendingItem.calories,
            macros: action === 'consumed' ? { protein: itemProtein, carbs: itemCarbs, fat: itemFat, fiber: itemFiber } : pendingItem.macros,
            vitamins: pendingItem.vitamins,
            glycemicIndex: pendingItem.glycemicIndex,
            glycemicLoad: gl,
            action,
            itemType: pendingItem.type,
            timestamp: new Date(),
            aiVerdict: pendingItem.verdict,
            imageBase64: pendingItem.imageBase64,
            focusTax: pendingItem.focus_tax,
            agingImpact: pendingItem.aging_grade,
            antidote: antidote || undefined,
            trigger: trigger,
            metadata: {
                organ_impact: pendingItem.organ_impact,
                transFat: pendingItem.transFat,
                salt: pendingItem.salt,
                consumptionRatio: ratio
            }
        });
        setPendingItem(null); setUploadedImage(null); setIsCorrecting(false); setShowTriggerModal(false); setShowDeathWaiver(false);
    };

    // --- VOICE MODE RE-INTEGRATION ---
    const finalizeVideoSession = async (reason: string, transcript?: Array<{ role: string, text: string }>) => {
        if (isFinalizingVideoRef.current) return;
        isFinalizingVideoRef.current = true;

        const sessionId = activeVideoSessionIdRef.current;
        let summaryData;

        if (sessionId) {
            try {
                summaryData = await endVideoCallSession(sessionId, reason, transcript);
            } catch (err) {
                console.error('[VideoCall] Failed to finalize session:', err);
            }
        }

        activeVideoSessionIdRef.current = null;
        setVideoRemainingSeconds(null);
        isFinalizingVideoRef.current = false;
        return { ...summaryData, sessionId };
    };

    const disconnectVoiceLink = async (reason: string = 'manual_end', transcript?: Array<{ role: string, text: string }>) => {
        if (serviceRef.current) {
            try {
                await serviceRef.current.disconnect();
            } catch (err) {
                console.error('[VideoCall] Failed to disconnect service:', err);
            }
            serviceRef.current = null;
        }

        setConnectionState(ConnectionState.DISCONNECTED);
        return await finalizeVideoSession(reason, transcript);
    };

    const handleConnect = async () => {
        if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.CONNECTED) {
            return;
        }

        setConnectionState(ConnectionState.CONNECTING);
        let startedSessionId: string | null = null;

        try {
            // 1) Reserve server-side quota before opening Gemini Live in browser
            const session = await startVideoCallSession();
            startedSessionId = session.sessionId;
            activeVideoSessionIdRef.current = session.sessionId;
            setVideoRemainingSeconds(session.maxDurationSeconds);
            setVideoRemainingCallsToday(session.remainingCallsToday);
            const socket = await getSocketToken('video');

            // 2) Initialize Gemini Live via backend websocket relay (API key stays on server)
            serviceRef.current = new GeminiLiveService({
                socketToken: socket.socketToken,
                sessionId: session.sessionId,
            });

            await serviceRef.current.connect({
                onOpen: () => {
                    setConnectionState(ConnectionState.CONNECTED);
                    updateStreamingLog('spy', 'Secure Voice Link Established.');
                },
                onMessage: (text, isUser) => {
                    if (text) {
                        if (transcriptTimeoutRef.current) window.clearTimeout(transcriptTimeoutRef.current);

                        // 1. UPDATE REAL-TIME LOGS
                        const speaker = isUser ? 'user' : 'spy';

                        setMissionLogs(prev => {
                            const lastLog = prev[prev.length - 1];

                            // Check if we should append to the last log or create a new one
                            // Rule: Append if same speaker AND activeLogId matches the last log's ID
                            if (lastLog && lastLog.sender === speaker && activeLogId.current === lastLog.id) {
                                return prev.map(log =>
                                    log.id === lastLog.id
                                        ? { ...log, text: log.text + text }
                                        : log
                                );
                            } else {
                                // New turn
                                const newId = uuidv4();
                                activeLogId.current = newId;
                                lastSpeaker.current = speaker;
                                return [...prev, { id: newId, timestamp: new Date(), sender: speaker, text: text }];
                            }
                        });

                        // 2. UPDATE FLOATING BUBBLE (Accumulate for smoother reading)
                        setTranscript(prev => {
                            if (prev && prev.isUser === isUser) {
                                return { text: prev.text + text, isUser };
                            }
                            return { text, isUser };
                        });

                        transcriptTimeoutRef.current = window.setTimeout(() => setTranscript(null), 5000);
                    }
                },
                onError: (err) => {
                    console.error(err);
                    setConnectionState(ConnectionState.ERROR);
                    updateStreamingLog('spy', 'Connection Error: ' + err.message);
                    void disconnectVoiceLink('transport_error');
                },
                onClose: () => {
                    setConnectionState(ConnectionState.DISCONNECTED);
                    updateStreamingLog('spy', 'Link Terminated.');
                    void finalizeVideoSession('transport_closed');
                },
                onAudioData: (vol) => setAgentVolume(vol),
                onPolicyUpdate: (policy) => {
                    setVideoRemainingSeconds(policy.remainingSessionSeconds);
                    if (policy.shouldEnd || policy.status === 'ended') {
                        updateStreamingLog('spy', 'Video call ended by policy: ' + (policy.reason || 'limit reached'));
                        void disconnectVoiceLink(policy.reason || 'policy_end');
                    }
                }
            }, GET_SYSTEM_INSTRUCTION(ledger.limit, userStats));

        } catch (e: any) {
            console.error(e);
            setConnectionState(ConnectionState.ERROR);
            updateStreamingLog('spy', e?.message || 'Initialization Failed.');

            if (startedSessionId) {
                try {
                    await endVideoCallSession(startedSessionId, 'connect_failed');
                } catch (endErr) {
                    console.error('[VideoCall] Failed to close startup session:', endErr);
                }
            }

            activeVideoSessionIdRef.current = null;
            setVideoRemainingSeconds(null);
        }
    };

    const handleDisconnect = async (transcriptOrReason?: Array<{ role: string, text: string }> | string) => {
        if (Array.isArray(transcriptOrReason)) {
            return await disconnectVoiceLink('manual_end', transcriptOrReason);
        } else if (typeof transcriptOrReason === 'string') {
            void disconnectVoiceLink(transcriptOrReason);
        } else {
            void disconnectVoiceLink('manual_end');
        }
    };

    const handleFrameCapture = useCallback((base64Data: string) => {
        if (serviceRef.current && connectionState === ConnectionState.CONNECTED) {
            serviceRef.current.sendVideoFrame(base64Data);
        }
    }, [connectionState]);

    const handleMitigateCrash = () => { if (!activeCrash) return; setActiveCrash(prev => prev ? ({ ...prev, isMitigated: true }) : null); addXp(30); updateStreamingLog('spy', 'Crash Protocol Mitigated. Good job.'); };
    const handlePayDebt = (amount: number) => { setLedger(prev => ({ ...prev, sugarDebt: Math.round(Math.max(0, prev.sugarDebt - amount) * 10) / 10 })); addXp(100); updateStreamingLog('spy', 'Debt Cleared.'); };

    // Updated Helper: Always force a new log entry to ensure it's recorded
    const updateStreamingLog = (sender: 'user' | 'spy', text: string) => {
        setMissionLogs(prev => {
            const newId = uuidv4();
            // Reset tracking for fresh logs from system events
            activeLogId.current = newId;
            lastSpeaker.current = sender;
            return [...prev, { id: newId, timestamp: new Date(), sender, text }];
        });
    };

    if (isCheckingSession) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
                    <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Connecting...</p>
                </div>
            </div>
        );
    }
    if (showOnboarding) {
        return <OnboardingScreen onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('hasSeenOnboarding', 'true');
        }} />;
    }
    if (!isLoggedIn) { return <LoginScreen onLogin={handleLoginSuccess} />; }
    if (showLegal) { return <LegalReminder onAccept={() => setShowLegal(false)} />; }
    if (!isSetupComplete) { return <SetupScreen onComplete={handleSetupComplete} initialStats={userStats} />; }

    const sharedVideoFeed = (
        <VideoFeed
            ref={videoFeedRef}
            isActive={true}
            isScanning={connectionState === ConnectionState.CONNECTED}
            isProcessing={isScanning}
            onFrameCapture={handleFrameCapture}
            scanMode={scanMode as any}
            onToggleMode={(m) => setScanMode(m)}
            onScanTrigger={handleManualScan}
            radiationLevel={pendingItem?.sugar || 0}
            hideScanModes={currentView === 'consultant'}
            uploadedImage={uploadedImage}
            headerAction={
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-zinc-800/80 backdrop-blur-md text-white p-2.5 rounded-full border border-zinc-700 shadow-lg active:scale-95 transition-all hover:bg-zinc-700"
                        title="Upload Image"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </button>
                    {/* Clear Image Button */}
                    {uploadedImage && (
                        <button
                            onClick={() => setUploadedImage(null)}
                            className="bg-rose-600/80 backdrop-blur-md text-white p-2.5 rounded-full border border-rose-500 shadow-lg active:scale-95 transition-all hover:bg-rose-500"
                            title="Clear Image"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                    {/* INLINE VOICE TOGGLE BUTTON */}
                    <button
                        onClick={() => {
                            if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
                                handleDisconnect();
                            } else {
                                handleConnect();
                            }
                        }}
                        className={`backdrop-blur-md text-white p-2.5 rounded-full border shadow-lg active:scale-95 transition-all
                          ${connectionState === ConnectionState.CONNECTED
                                ? 'bg-rose-600/90 border-rose-500/50 hover:bg-rose-500 animate-pulse'
                                : connectionState === ConnectionState.CONNECTING
                                    ? 'bg-yellow-600/90 border-yellow-500/50 hover:bg-yellow-500'
                                    : 'bg-brand-600/80 border-brand-500/50 hover:bg-brand-500'
                            }`}
                        title={connectionState === ConnectionState.CONNECTED ? "Stop Voice Mode" : "Start Live Voice"}
                    >
                        {connectionState === ConnectionState.CONNECTED ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                    </button>
                </div>
            }
        />
    );

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-10 transition-colors duration-500">

            {/* Hidden File Input for Upload */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* MODALS */}
            {receiptResult && (<div className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"><div className="w-full max-w-lg"><ReceiptAnalysis data={receiptResult} onClose={() => setReceiptResult(null)} /></div></div>)}

            {/* VERSUS ARENA MODAL */}
            {versusResult && (
                <VersusArena
                    data={versusResult}
                    imgA={versusImgA!}
                    imgB={versusImgB!}
                    onClose={() => { setVersusResult(null); setVersusImgA(null); setVersusImgB(null); setVersusStage('idle'); setUploadedImage(null); }}
                    onChoose={handleVersusDecision}
                />
            )}

            {showDeathWaiver && pendingItem && (<DeathWaiver itemName={pendingItem.honest_name || pendingItem.name} sugarGrams={pendingItem.sugar} userProfile={userStats} onConfirm={() => finalizeDecision('consumed', 'Habit')} onCancel={() => setShowDeathWaiver(false)} />)}
            {showTriggerModal && !showDeathWaiver && (<TriggerModal onSelect={(trigger, ratio) => finalizeDecision('consumed', trigger, ratio)} onCancel={() => setShowTriggerModal(false)} />)}

            {/* HEADER */}
            {!isFullScreenVideo && currentView !== 'profile' && currentView !== 'notifications' && currentView !== 'camera' && (
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-900 transition-colors duration-500">
                    <div className="max-w-500 mx-auto w-full px-4 py-4">
                        <div className="flex items-center justify-between">
                            {/* CLICKABLE LOGO/AVATAR FOR PROFILE NAVIGATION */}
                            <button onClick={() => setCurrentView('profile')} className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left">
                                <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center overflow-hidden border border-white/10 shadow-sm">
                                    <img src="https://i.ibb.co.com/hJYKch5n/Logo-Moriesly-remove-bg.png" alt="Moriesly AI" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h1 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
                                        Moriesly <span className="text-[10px] font-normal text-zinc-500">Ai</span>
                                    </h1>
                                </div>
                            </button>
                            <div className="flex gap-3">
                                {/* NEW: Notification Button */}
                                <button
                                    onClick={() => setCurrentView('notifications')}
                                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-white transition-colors relative"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    {hasNotifications && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-zinc-900"></div>}
                                </button>
                                {/* Theme Toggle - Hidden as per user request for light mode preference */}
                                {/* <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-brand-500 transition-colors">{isDarkMode ? '☀️' : '🌙'}</button> */}

                                {/* Large Chat Button */}
                                <button
                                    onClick={() => setCurrentView('consultant')}
                                    className="w-10 h-10 rounded-full bg-brand-500 border border-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all active:scale-95"
                                >
                                    <MessageSquare className="w-5 h-5" fill="currentColor" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>
            )}

            <main className={`max-w-500 mx-auto w-full px-4 py-4 md:py-8 flex flex-col gap-8 ${currentView === 'profile' || currentView === 'notifications' ? 'p-0 max-w-full' : ''}`}>

                {currentView === 'status' ? (<StatusScreen />)
                    : currentView === 'track' ? (<TrackScreen />)
                        : currentView === 'explore' ? (<ExploreScreen userStats={userStats} ledger={ledger} history={history} />)
                            : currentView === 'diet' ? (<DietPlanScreen userProfile={userStats} onAddXp={addXp} dietPlan={dietPlan} setDietPlan={setDietPlan} />)
                                : currentView === 'training' ? (<TacticalTrainingScreen userProfile={userStats} ledger={ledger} onAddXp={addXp} plan={trainingPlan} setPlan={setTrainingPlan} completedWorkouts={completedWorkouts} setCompletedWorkouts={setCompletedWorkouts} completedMeals={completedMeals} setCompletedMeals={setCompletedMeals} />)
                                    : currentView === 'medical' ? (<GlycationScanner data={skinResult} onScan={handleSkinScan} isLoading={isScanning} onClose={() => setCurrentView('dashboard')} />)
                                        : currentView === 'consultant' || currentView === 'chat' ? (<ConsultantScreen userProfile={userStats} connectionState={connectionState} onConnect={handleConnect} onDisconnect={handleDisconnect} videoFeedNode={sharedVideoFeed} agentVolume={agentVolume} consultationHistory={consultationHistory} onSaveSession={(s) => setConsultationHistory(prev => [s, ...prev])} missionLogs={missionLogs} onFlipCamera={() => videoFeedRef.current?.flipCamera()} onToggleFlash={() => videoFeedRef.current?.toggleFlash()} transcript={transcript} onAddXp={addXp} onToggleFullScreen={setIsFullScreenVideo} />)
                                            : currentView === 'tracker' ? (<WeightTrackerScreen weightHistory={weightHistory} goal={currentGoal} sugarHistory={history} onUpdateGoal={setCurrentGoal} onAddWeight={(w) => { /* update weight */ }} />)
                                                : currentView === 'history' || currentView === 'calendar' ? (
                                                    <HistoryScreen
                                                        history={history}
                                                        onExport={() => { }}
                                                        onUpdateHistoryItem={handleUpdateHistoryItem}
                                                        onScanAddOn={(item) => {
                                                            setAddOnTargetId(item.id);
                                                            setScanMode('food');
                                                            setCurrentView('camera');
                                                        }}
                                                        onTextAddOn={handleTextAddOn}
                                                    />
                                                )
                                                    : currentView === 'settings' ? (
                                                        <SettingsScreen
                                                            userProfile={userStats}
                                                            goal={currentGoal}
                                                            currentLimit={ledger.limit}
                                                            isDarkMode={isDarkMode}
                                                            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                                                            onUpdate={(p, l, g) => {
                                                                setUserStats(p);
                                                                setLedger(prev => ({ ...prev, limit: l }));
                                                                setCurrentGoal(g);
                                                                setCurrentView('profile');
                                                            }}
                                                            onBack={() => setCurrentView('profile')}
                                                            onLogout={handleLogout}
                                                        />
                                                    )
                                                        : currentView === 'devices' ? (<DeviceSyncScreen history={history} ledger={ledger} dietPlan={dietPlan} trainingPlan={trainingPlan} onToggleFullScreen={setIsFullScreenVideo} onBackToHome={() => { setIsFullScreenVideo(false); setCurrentView('dashboard'); }} />)
                                                            : currentView === 'profile' ? (
                                                                <UnifiedProfileDashboard
                                                                    userProfile={userStats}
                                                                    history={history}
                                                                    dietPlan={dietPlan}
                                                                    trainingPlan={trainingPlan}
                                                                    skinResult={skinResult}
                                                                    consultationHistory={consultationHistory}
                                                                    ledger={ledger}
                                                                    onBack={() => setCurrentView('dashboard')}
                                                                    onSettings={() => setCurrentView('settings')}
                                                                />
                                                            )
                                                                : currentView === 'notifications' ? (<NotificationCenter userProfile={userStats} ledger={ledger} onClose={() => setCurrentView('dashboard')} />)
                                                                    : currentView === 'camera' ? (
                                                                        <div className="fixed inset-0 z-100 bg-black">
                                                                            {sharedVideoFeed}

                                                                            {/* CLOSE BUTTON */}
                                                                            <button
                                                                                onClick={() => {
                                                                                    setCurrentView('dashboard');
                                                                                    setAddOnTargetId(null);
                                                                                }}
                                                                                className="absolute top-6 left-6 z-50 w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 transition-all border border-white/10"
                                                                            >
                                                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                            </button>

                                                                            {/* INLINE VOICE TRANSCRIPT OVERLAY */}
                                                                            {connectionState === ConnectionState.CONNECTED && transcript && (
                                                                                <div className="absolute bottom-24 left-4 right-4 z-40 flex justify-center pointer-events-none">
                                                                                    <div className={`max-w-[90%] px-4 py-3 rounded-2xl backdrop-blur-md border border-white/10 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 ${transcript.isUser ? 'bg-black/70 text-white/90 text-right ml-auto rounded-br-none' : 'bg-teal-900/80 text-teal-50 mr-auto rounded-bl-none'}`}>
                                                                                        {transcript.text}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* VERSUS OVERLAY PROMPTS */}
                                                                            {scanMode === 'versus' && (
                                                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-full flex justify-center">
                                                                                    {versusStage === 'captureB' ? (
                                                                                        <div className="bg-rose-600/90 text-white px-6 py-3 rounded-2xl backdrop-blur-md text-sm font-black uppercase border border-rose-400 shadow-2xl animate-in fade-in zoom-in">
                                                                                            SCAN ITEM B (RIGHT)
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="bg-teal-600/90 text-white px-6 py-3 rounded-2xl backdrop-blur-md text-sm font-black uppercase border border-teal-400 shadow-2xl animate-in fade-in zoom-in">
                                                                                            SCAN ITEM A (LEFT)
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                        : (
                                                                            <>
                                                                                {/* BIO REPORT / SCAN RESULT OVERLAY */}
                                                                                {(pendingItem || labelResult || barcodeResult || identifiedItem) ? (
                                                                                    <div className="px-4 pt-4 pb-24 min-h-screen bg-[#fafafa]">
                                                                                        <div className={`bg-white dark:bg-zinc-900 rounded-3xl p-6 border dark:border-zinc-800/50 shadow-sm min-h-25 flex flex-col justify-center relative overflow-hidden transition-all duration-500 ${pendingItem && pendingItem.sugar > 25 ? 'border-rose-500/50 shadow-[0_0_20px_rgba(225,29,72,0.2)]' : 'border-zinc-200'}`}>
                                                                                            {pendingItem && pendingItem.sugar > 25 && (<div className="absolute inset-0 border-4 border-rose-500/30 rounded-3xl pointer-events-none animate-pulse"></div>)}
                                                                                            {labelResult ? (<DeceptionDetector data={labelResult} onClose={() => setLabelResult(null)} />)
                                                                                                : barcodeResult ? (<FullDisclosure data={barcodeResult} onClose={() => setBarcodeResult(null)} />)
                                                                                                    : identifiedItem ? (
                                                                                                        isConfirmingScan ? (
                                                                                                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4 items-center text-center py-4 md:py-8">
                                                                                                                <div className="w-16 h-16 md:w-24 md:h-24 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-1">
                                                                                                                    <Check className="w-8 h-8 md:w-12 md:h-12 text-teal-500" />
                                                                                                                </div>
                                                                                                                <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Scan Complete</h2>
                                                                                                                <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">AI has identified this item as:</p>
                                                                                                                <div className="text-xl md:text-3xl font-black text-teal-600 dark:text-teal-400 uppercase tracking-tighter px-4 py-2 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-900/50">
                                                                                                                    {identifiedItem.name}
                                                                                                                </div>

                                                                                                                <div className="w-full flex flex-col gap-2 md:gap-3 mt-2 md:mt-4">
                                                                                                                    <button
                                                                                                                        onClick={() => {
                                                                                                                            setManualName(identifiedItem.name);
                                                                                                                            setManualType(identifiedItem.type);
                                                                                                                            handleReanalyze(identifiedItem.name, identifiedItem.type);
                                                                                                                        }}
                                                                                                                        disabled={isScanning}
                                                                                                                        className="w-full py-3 md:py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50 text-sm md:text-base"
                                                                                                                    >
                                                                                                                        {isScanning ? 'Analyzing...' : 'View AI Analysis'}
                                                                                                                    </button>

                                                                                                                    <div className="relative flex items-center justify-center py-1 md:py-2">
                                                                                                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full"></div>
                                                                                                                        <span className="absolute bg-white dark:bg-zinc-900 px-2 text-[10px] text-zinc-400 font-bold uppercase">OR</span>
                                                                                                                    </div>

                                                                                                                    <button
                                                                                                                        onClick={() => {
                                                                                                                            setIsConfirmingScan(false);
                                                                                                                            setManualName(identifiedItem.name === "Unknown Item" ? "" : identifiedItem.name);
                                                                                                                            setManualType(identifiedItem.type);
                                                                                                                            setIsCorrecting(true);
                                                                                                                        }}
                                                                                                                        className="w-full py-3 md:py-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold uppercase tracking-wider transition-all active:scale-95 text-xs md:text-sm"
                                                                                                                    >
                                                                                                                        Manual Input / Re-analyze
                                                                                                                    </button>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
                                                                                                                {identifiedItem.imageBase64 && (
                                                                                                                    <div className="w-full h-48 rounded-2xl overflow-hidden mb-2 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                                                                                                        <img src={`data:image/jpeg;base64,${identifiedItem.imageBase64}`} alt="Scanned Item" className="w-full h-full object-cover" />
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {isCorrecting && (
                                                                                                                    <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                                                                                                        <h3 className="text-sm font-bold uppercase text-zinc-500 mb-3">Manual Correction</h3>
                                                                                                                        <div className="flex flex-col gap-3">
                                                                                                                            <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="E.g. Iced Vanilla Latte" className="w-full bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-teal-500 transition-colors" />
                                                                                                                            <div className="flex gap-2">
                                                                                                                                <button onClick={() => setManualType('food')} className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase ${manualType === 'food' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 ring-1 ring-orange-500' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>Food</button>
                                                                                                                                <button onClick={() => setManualType('drink')} className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase ${manualType === 'drink' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 ring-1 ring-blue-500' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>Drink</button>
                                                                                                                            </div>
                                                                                                                            <div className="flex gap-2 mt-1">
                                                                                                                                <button onClick={() => { setIsCorrecting(false); setIsConfirmingScan(true); }} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-500 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700">Cancel</button>
                                                                                                                                <button onClick={() => handleReanalyze()} disabled={!manualName || isScanning} className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-500 shadow-lg shadow-teal-500/20 ${(!manualName || isScanning) ? 'opacity-50' : 'hover:bg-teal-400'}`}>{isScanning ? 'Analyzing...' : 'Analyze & Update'}</button>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                                {!isCorrecting && isScanning && (
                                                                                                                    <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in fade-in duration-300">
                                                                                                                        <div className="relative w-12 h-12 flex items-center justify-center">
                                                                                                                            <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full"></div>
                                                                                                                            <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                                                                                                            <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                                                                                                                        </div>
                                                                                                                        <div className="flex flex-col items-center gap-1">
                                                                                                                            <p className="text-sm font-black text-teal-500 uppercase tracking-widest animate-pulse">Deep Analysis</p>
                                                                                                                            <p className="text-[10px] text-zinc-500 font-mono uppercase">Extracting Nutritional Data...</p>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )
                                                                                                    ) : pendingItem ? (
                                                                                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6">
                                                                                                            {pendingItem.imageBase64 && (
                                                                                                                <div className="w-full h-32 md:h-48 rounded-2xl overflow-hidden mb-2 shadow-sm border border-zinc-100 dark:border-zinc-800">
                                                                                                                    <img src={`data:image/jpeg;base64,${pendingItem.imageBase64}`} alt="Scanned Item" className="w-full h-full object-cover" />
                                                                                                                </div>
                                                                                                            )}
                                                                                                            <div className="flex flex-col gap-2">
                                                                                                                <div className="flex items-center gap-3">
                                                                                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">DETECTED</span>
                                                                                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${pendingItem.type === 'drink'
                                                                                                                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                                                                                        : 'bg-orange-50 text-orange-600 border-orange-100'
                                                                                                                        }`}>
                                                                                                                        {pendingItem.type}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                                <div className="flex justify-between items-start">
                                                                                                                    <h2 className={`text-lg md:text-xl font-black leading-tight ${pendingItem.sugar > 20 && pendingItem.honest_name ? 'text-rose-500 uppercase tracking-tight' : 'text-zinc-900 dark:text-white'}`}>
                                                                                                                        {pendingItem.sugar > 20 && pendingItem.honest_name ? pendingItem.honest_name : pendingItem.name}
                                                                                                                    </h2>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {/* --- TOP STATS CARDS --- */}
                                                                                                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                                                                                                                <div className="bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-2 md:p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                                                                                                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                                                                        <svg className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17 19c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1h-4v-4c0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1v11c0 .55.45 1 1 1h11zM5 19V7h6v5h5v6H5z" /></svg>
                                                                                                                    </div>
                                                                                                                    <span className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                                                                                        <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                                                                                                        Sugar
                                                                                                                    </span>
                                                                                                                    <div className="text-lg md:text-xl font-black text-zinc-900 dark:text-white z-10">
                                                                                                                        {pendingItem.sugar}<span className="text-[10px] text-zinc-500 font-medium ml-0.5">g</span>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <div className="bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-2 md:p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                                                                                                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                                                                        <svg className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" /></svg>
                                                                                                                    </div>
                                                                                                                    <span className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                                                                                        <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                                                                                                        GI
                                                                                                                    </span>
                                                                                                                    <div className={`text-lg md:text-xl font-black z-10 ${(pendingItem.glycemicIndex || 0) > 70 ? 'text-rose-500' : (pendingItem.glycemicIndex || 0) > 55 ? 'text-amber-500' : 'text-emerald-500'
                                                                                                                        }`}>
                                                                                                                        {pendingItem.glycemicIndex || '-'}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <div className="bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-2 md:p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                                                                                                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                                                                        <svg className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" /></svg>
                                                                                                                    </div>
                                                                                                                    <span className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                                                                                        <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                                                                                                                        Cals
                                                                                                                    </span>
                                                                                                                    <div className="text-lg md:text-xl font-black text-zinc-900 dark:text-white z-10">
                                                                                                                        {pendingItem.calories || 0}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {/* --- MACRO & MICRO NUTRIENTS --- */}
                                                                                                            {(pendingItem.macros || (pendingItem.vitamins && pendingItem.vitamins.length > 0)) && (
                                                                                                                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800">
                                                                                                                    {/* Macros */}
                                                                                                                    {pendingItem.macros && (
                                                                                                                        <div className="mb-5">
                                                                                                                            <div className="flex items-center gap-1.5 mb-3">
                                                                                                                                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                                                                                                                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                                                                                                    Macros
                                                                                                                                </span>
                                                                                                                            </div>
                                                                                                                            <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner mb-4">
                                                                                                                                <div style={{ width: `${(pendingItem.macros.protein / ((pendingItem.macros.protein + pendingItem.macros.carbs + pendingItem.macros.fat + (pendingItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-blue-500"></div>
                                                                                                                                <div style={{ width: `${(pendingItem.macros.carbs / ((pendingItem.macros.protein + pendingItem.macros.carbs + pendingItem.macros.fat + (pendingItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-orange-500"></div>
                                                                                                                                <div style={{ width: `${(pendingItem.macros.fat / ((pendingItem.macros.protein + pendingItem.macros.carbs + pendingItem.macros.fat + (pendingItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-rose-500"></div>
                                                                                                                                {pendingItem.macros.fiber !== undefined && pendingItem.macros.fiber > 0 && (
                                                                                                                                    <div style={{ width: `${(pendingItem.macros.fiber / ((pendingItem.macros.protein + pendingItem.macros.carbs + pendingItem.macros.fat + pendingItem.macros.fiber) || 1)) * 100}%` }} className="h-full bg-emerald-500"></div>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                                                                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-500">
                                                                                                                                        <Dumbbell className="w-3.5 h-3.5" />
                                                                                                                                    </div>
                                                                                                                                    <div className="flex flex-col">
                                                                                                                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Protein</span>
                                                                                                                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{pendingItem.macros.protein}g</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                                                                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-500/20 text-orange-500">
                                                                                                                                        <Wheat className="w-3.5 h-3.5" />
                                                                                                                                    </div>
                                                                                                                                    <div className="flex flex-col">
                                                                                                                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Carbs</span>
                                                                                                                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{pendingItem.macros.carbs}g</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                                                                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-500">
                                                                                                                                        <Droplet className="w-3.5 h-3.5" />
                                                                                                                                    </div>
                                                                                                                                    <div className="flex flex-col">
                                                                                                                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Fat</span>
                                                                                                                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{pendingItem.macros.fat}g</span>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                                {pendingItem.macros.fiber !== undefined && pendingItem.macros.fiber > 0 && (
                                                                                                                                    <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                                                                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500">
                                                                                                                                            <Leaf className="w-3.5 h-3.5" />
                                                                                                                                        </div>
                                                                                                                                        <div className="flex flex-col">
                                                                                                                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Fiber</span>
                                                                                                                                            <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{pendingItem.macros.fiber.toFixed(1)}g</span>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    )}

                                                                                                                    {/* Divider */}
                                                                                                                    {(pendingItem.macros && pendingItem.vitamins && pendingItem.vitamins.length > 0) && (
                                                                                                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full my-4 border-dashed border-t"></div>
                                                                                                                    )}

                                                                                                                    {/* Micros */}
                                                                                                                    {pendingItem.vitamins && pendingItem.vitamins.length > 0 && (
                                                                                                                        <div>
                                                                                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                                                                                                Micros
                                                                                                                            </span>
                                                                                                                            <div className="flex flex-wrap gap-2">
                                                                                                                                {pendingItem.vitamins.map((v, i) => (
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
                                                                                                            <div className="bg-teal-50 dark:bg-teal-900/10 rounded-xl p-4 border-l-2 border-teal-500 relative overflow-hidden mb-6">
                                                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                                                    <svg className="w-3 h-3 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                                                                    <span className="text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-wider">AI Verdict</span>
                                                                                                                </div>
                                                                                                                <p className="text-sm font-medium text-teal-900 dark:text-teal-100 leading-snug">
                                                                                                                    "{pendingItem.verdict}"
                                                                                                                </p>
                                                                                                            </div>

                                                                                                            {/* Declassified Composition */}
                                                                                                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 mb-6">
                                                                                                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2"> <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> Declassified Composition </h4> {pendingItem.ingredients && pendingItem.ingredients.length > 0 && (<div className="flex flex-wrap gap-2 mb-4"> {pendingItem.ingredients.map((ing, i) => (<span key={i} className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase shadow-sm"> {ing} </span>))} </div>)} <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed italic bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-700/30"> "{pendingItem.explanation}" </p>
                                                                                                            </div>

                                                                                                            <EvidencePanel confidence={pendingItem.confidence_score || 85} sugarSources={pendingItem.sugar_sources || []} visualCues={pendingItem.visual_cues || []} dataRef={pendingItem.data_ref || "AI Pattern Matching"} itemName={pendingItem.name} sugarAmount={pendingItem.sugar} />
                                                                                                            <MetabolicInvoice focusTax={pendingItem.focus_tax} agingGrade={pendingItem.aging_grade as any} sleepPenalty={pendingItem.sleep_penalty as any} />
                                                                                                            <SugarPile grams={pendingItem.sugar} />
                                                                                                            <BurnMeter sugarGrams={pendingItem.sugar} />
                                                                                                            <div className="space-y-4 mb-6">
                                                                                                                <GlucosePredictor sugar={pendingItem.sugar} gi={pendingItem.glycemicIndex || 50} />
                                                                                                                <OrganMap
                                                                                                                    sugar={pendingItem.sugar}
                                                                                                                    calories={pendingItem.calories}
                                                                                                                    fat={pendingItem.macros?.fat}
                                                                                                                    protein={pendingItem.macros?.protein}
                                                                                                                    fiber={pendingItem.macros?.fiber}
                                                                                                                    type={pendingItem.type}
                                                                                                                    impactData={pendingItem.organ_impact}
                                                                                                                />
                                                                                                            </div>

                                                                                                            {pendingItem.sugar > 20 ? (
                                                                                                                <WillpowerGauntlet
                                                                                                                    onSuccess={() => {
                                                                                                                        console.log("[DEBUG] WillpowerGauntlet success");
                                                                                                                        initiateDecision('consumed');
                                                                                                                    }}
                                                                                                                    onFail={() => {
                                                                                                                        console.log("[DEBUG] WillpowerGauntlet fail");
                                                                                                                        initiateDecision('rejected');
                                                                                                                    }}
                                                                                                                    sugarAmount={pendingItem.sugar}
                                                                                                                />
                                                                                                            ) : (
                                                                                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                                                                                    <button
                                                                                                                        onClick={() => initiateDecision('rejected')}
                                                                                                                        onTouchEnd={(e) => { e.preventDefault(); initiateDecision('rejected'); }}
                                                                                                                        className="py-4 rounded-2xl font-bold bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors flex flex-col items-center gap-1"
                                                                                                                    >
                                                                                                                        <span>Reject</span><span className="text-[9px] font-normal text-zinc-500">+25 XP</span>
                                                                                                                    </button>
                                                                                                                    <button
                                                                                                                        onClick={() => initiateDecision('consumed')}
                                                                                                                        onTouchEnd={(e) => { e.preventDefault(); initiateDecision('consumed'); }}
                                                                                                                        className="py-4 rounded-2xl font-bold bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black transition-colors flex flex-col items-center gap-1"
                                                                                                                    >
                                                                                                                        <span>Consume</span><span className="text-[9px] font-normal opacity-50">+10 XP</span>
                                                                                                                    </button>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <div className="text-center py-4">
                                                                                                            <div className="text-zinc-400 text-sm animate-pulse">
                                                                                                                {isScanning ? 'Processing Visual Data...' : uploadedImage ? 'Image Loaded. Press Shutter to Analyze.' : 'Align Target in Viewfinder'}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <DashboardScreen
                                                                                        userStats={userStats}
                                                                                        ledger={ledger}
                                                                                        onCheckIn={handleCheckIn}
                                                                                        onNavigate={setCurrentView}
                                                                                        history={history}
                                                                                        trainingPlan={trainingPlan}
                                                                                        completedWorkouts={completedWorkouts}
                                                                                        dietPlan={dietPlan}
                                                                                        onUpdateUser={setUserStats}
                                                                                    />
                                                                                )}
                                                                            </>
                                                                        )}
            </main>

            {!isFullScreenVideo && currentView !== 'notifications' && currentView !== 'camera' && (<NavBar currentView={currentView} onChangeView={setCurrentView} />)}
        </div>
    );
}

export default App;
