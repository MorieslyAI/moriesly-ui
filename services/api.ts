// ─── API Service ─────────────────────────────────────────────────────────────
// Semua HTTP calls ke MasterAPI BE.
// Access token disimpan di memory (tidak di localStorage) agar aman dari XSS.

import { auth } from "./firebase";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── Fetch Helper ─────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
      _accessToken = token;
    } catch (e) {
      console.warn("Failed to get fresh token", e);
      if (_accessToken) {
        headers["Authorization"] = `Bearer ${_accessToken}`;
      }
    }
  } else if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "omit", // Kita tidak lagi bergantung pada cookie backend
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data as any)?.error ?? `Request failed: ${res.status}`;
    const err = new Error(message) as Error & { status: number; code?: string };
    err.status = res.status;
    err.code = (data as any)?.code;
    throw err;
  }

  return data as T;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  isNewUser?: boolean;
}

export interface MeResponse {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  isCalibrationComplete: boolean;
  createdAt?: string;
}

export interface CalibrationPayload {
  name: string;
  gender: "male" | "female";
  age: number;
  height: number;
  weight: number;
  archetypeId: "desk" | "field" | "heavy" | "custom";
  dailySteps?: number;
  workoutFreq?: number;
  workoutIntensity?: "low" | "mod" | "high";
  medicalConditions: string[];
  goalMode: "cut" | "maintain" | "bulk" | "custom";
  customSugarLimit?: number;
}

export interface CalibrationResponse {
  message: string;
  sugarLimit: number;
}

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName }),
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function googleSignIn(
  idToken: string,
  refreshToken: string,
): Promise<AuthResponse> {
  const data = await request<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken, refreshToken }),
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function refreshToken(): Promise<AuthResponse> {
  // Tidak perlu kirim body — Firebase SDK yang handle refresh token
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken(true);
    setAccessToken(token);
    return { accessToken: token, isCalibrationComplete: false }; // Dummy response karena format AuthResponse
  }
  throw new Error("No user logged in");
}

export async function logout(): Promise<void> {
  await auth.signOut();
  await request("/auth/logout", { method: "POST" }).catch(() => {});
  setAccessToken(null);
}

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>("/auth/me");
}

export interface SocketTokenResponse {
  socketToken: string;
  expiresIn: number;
  scope: "chat" | "video" | "all";
}

export async function getSocketToken(
  scope: "chat" | "video" | "all" = "all",
): Promise<SocketTokenResponse> {
  return request<SocketTokenResponse>("/auth/socket-token", {
    method: "POST",
    body: JSON.stringify({ scope }),
  });
}

// ─── User / Calibration Endpoints ─────────────────────────────────────────────

export async function saveCalibration(
  payload: CalibrationPayload,
): Promise<CalibrationResponse> {
  return request<CalibrationResponse>("/user/calibration", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Dashboard Endpoints ──────────────────────────────────────────────────────

export interface DashboardInsights {
  highlights: any[];
  projections: { trend: string; text: string };
  weakness: string;
  blindspot: string;
  metabolicInsight: string;
}

export interface DashboardGoals {
  targetWeight: number;
  currentWeight: number;
  endDate: string;
}

export interface DashboardHealthMetrics {
  hydration: number;
  stress: number;
  recovery: number;
  glucose: number;
  metabolicScore: number;
}

export interface DashboardNutrition {
  summary: {
    caloriesIn: number;
    caloriesBurned: number;
    netCalories: number;
    targetCalories: number;
    protein: number;
    proteinTarget: number;
    carbs: number;
    carbsTarget: number;
    fat: number;
    fatTarget: number;
  };
  specific: {
    sugar: number;
    sugarLimit: number;
    fiber: number;
    fiberTarget: number;
  };
}

export interface DashboardHomeResponse {
  insights: DashboardInsights;
  goals: DashboardGoals;
  healthMetrics: DashboardHealthMetrics;
  nutrition: DashboardNutrition;
}

export async function getDashboardHome(
  dateStr?: string,
): Promise<DashboardHomeResponse> {
  const query = dateStr ? `?date=${dateStr}` : "";
  return request<DashboardHomeResponse>(`/dashboard/home${query}`, {
    method: "GET",
  });
}

export async function getDashboardHistory(dateStr: string): Promise<any[]> {
  return request<any[]>(`/dashboard/history?date=${dateStr}`, {
    method: "GET",
  });
}

export type TimeRange = "30S" | "1M" | "15M" | "1H" | "24H" | "7D" | "30D";

export interface RangeMetricsResponse {
  timeRange: TimeRange;
  metabolicTrend: number;
  energyTrend: number;
}

export async function getDashboardRangeMetrics(
  range: TimeRange,
): Promise<RangeMetricsResponse> {
  return request<RangeMetricsResponse>(
    `/dashboard/range-metrics?range=${encodeURIComponent(range)}`,
    {
      method: "GET",
    },
  );
}

export async function saveDashboardHistoryItem(
  item: any,
): Promise<{ success: boolean; id: string }> {
  return request<{ success: boolean; id: string }>("/dashboard/history", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

// ─── Status Endpoint ──────────────────────────────────────────────────────────

export interface UserStatusAlert {
  type: "danger" | "warning" | "info";
  title: string;
  message: string;
}

export interface UserStatusResponse {
  name: string;
  rankTitle: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  streak: number;
  weight: number | null;
  performanceScore: number;
  dietAdherence: number;
  activeAlerts: UserStatusAlert[];
  targetCalories: number;
  caloriesConsumedToday: number;
  nextEvaluation: string;
}

export async function getUserStatus(dateStr?: string): Promise<UserStatusResponse> {
  const query = dateStr ? `?date=${dateStr}` : "";
  return request<UserStatusResponse>(`/dashboard/status${query}`, {
    method: "GET",
  });
}

// ─── Diet Endpoints ─────────────────────────────────────────────────────────

export interface DietMeal {
  type: "Breakfast" | "Lunch" | "Dinner";
  menuName: string;
  contents: string;
  ingredients: string[];
  instructions?: string;
  prepTime: string;
  calories: number;
  sugarGrams: number;
  fiberGrams: number;
}

export interface DietPlanResponse {
  id: string;
  category?: string;
  target: string;
  icon: string;
  score: number;
  summary: string;
  meals: DietMeal[];
  consumedMealIndices?: number[];
}

export interface WeeklyDayPlan {
  day: string;
  meals: DietMeal[];
  totalCalories: number;
  totalSugar: number;
}

export interface WeeklyPlanResponse {
  id: string;
  weekName: string;
  category?: string;
  days: WeeklyDayPlan[];
  consumedMealKeys?: string[];
}

export interface ActiveDietPlansResponse {
  daily: DietPlanResponse | null;
  weekly: WeeklyPlanResponse | null;
  canGenerateDaily: boolean;
  canGenerateWeekly: boolean;
  lockedUntilDaily: string;
  lockedUntilWeekly: string;
}

export async function generateDailyDietPlan(payload: {
  category: string;
  inputMode: "auto" | "manual";
  manualGoal?: string;
  userProfile: {
    name: string;
    age: number;
    weight: number;
    height?: number;
  };
}): Promise<DietPlanResponse> {
  return request<DietPlanResponse>("/diet/plans/daily", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateWeeklyDietPlan(payload: {
  category: string;
  inputMode: "auto" | "manual";
  manualGoal?: string;
  userProfile: {
    name: string;
    age: number;
    weight: number;
  };
}): Promise<WeeklyPlanResponse> {
  return request<WeeklyPlanResponse>("/diet/plans/weekly", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function swapDietMeal(
  planId: string,
  mealIndex: number,
  currentMeal: DietMeal,
  target: string,
): Promise<DietMeal> {
  return request<DietMeal>(`/diet/plans/daily/${planId}/swap`, {
    method: "POST",
    body: JSON.stringify({ mealIndex, currentMeal, target }),
  });
}

export async function getActiveDietPlans(): Promise<ActiveDietPlansResponse> {
  return request<ActiveDietPlansResponse>("/diet/plans/active", {
    method: "GET",
  });
}

export async function markDietMealConsumed(
  planId: string,
  scope: "daily" | "weekly",
  mealIndex: number,
  dayIndex?: number,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/diet/plans/${planId}/consume`, {
    method: "POST",
    body: JSON.stringify({ scope, mealIndex, dayIndex }),
  });
}

// ─── Training Endpoints ─────────────────────────────────────────────────────

export interface TrainingTimeBlock {
  timeLabel: string;
  phase: "Morning" | "Afternoon" | "Evening" | "Night";
  actionName: string;
  actionDetail: string;
  fuelName: string;
  fuelDetail: string;
  sugarImpact: number;
}

export interface TrainingPlanResponse {
  id: string;
  codename: string;
  totalCaloriesBurn: number;
  schedule: TrainingTimeBlock[];
  completedWorkoutIndices?: number[];
  completedMealIndices?: number[];
}

export interface ActiveTrainingResult {
  plan: TrainingPlanResponse | null;
  canGenerate: boolean;
  lockedUntil: string;
}

export async function generateTrainingPlan(payload: {
  mode: string;
  inputMode: "auto" | "manual";
  focusArea?: string;
  intensity?: string;
  equipment?: string;
  customParams?: string;
  userProfile: {
    age: number;
    weight: number;
    gender: string;
  };
}): Promise<TrainingPlanResponse> {
  return request<TrainingPlanResponse>("/training/plans/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getActiveTrainingPlan(): Promise<ActiveTrainingResult> {
  return request<ActiveTrainingResult>("/training/plans/active", {
    method: "GET",
  });
}

export async function markTrainingCompleted(
  planId: string,
  kind: "workout" | "meal",
  index: number,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/training/plans/${planId}/complete`, {
    method: "POST",
    body: JSON.stringify({ kind, index }),
  });
}

// ─── Explore Endpoints ──────────────────────────────────────────────────────

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  category: string;
  source: string;
  date: string;
  url?: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  type: "post" | "event" | "group" | "video";
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  mediaUrl?: string;
  eventDate?: string;
  attendees?: number;
  members?: number;
  videoThumbnail?: string;
  duration?: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  tags: string[];
  reason: string;
  price: number | string;
  currency?: string;
}

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  name: string;
  score: number;
  trend: "up" | "down" | "flat";
  isUser: boolean;
}

export interface SocialProfile {
  avatarUrl: string;
  name: string;
  role: string;
  postsCount: number;
  followersCount: number;
  likesReceived: number;
}

export async function getNews(params?: {
  limit?: number;
}): Promise<{ articles: NewsArticle[] }> {
  const q = params?.limit ? `?limit=${params.limit}` : "";
  return request<{ articles: NewsArticle[] }>(`/explore/news${q}`, {
    method: "GET",
  });
}

export async function getPosts(params?: {
  type?: "all" | "event" | "group" | "video";
  limit?: number;
}): Promise<{ posts: SocialPost[]; hasMore: boolean }> {
  const search = new URLSearchParams();
  if (params?.type) search.set("type", params.type);
  if (params?.limit) search.set("limit", String(params.limit));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<{ posts: SocialPost[]; hasMore: boolean }>(
    `/explore/posts${suffix}`,
    {
      method: "GET",
    },
  );
}

export async function createPost(payload: {
  content: string;
  type?: "post" | "event" | "group";
}): Promise<{ success: boolean; postId: string }> {
  return request<{ success: boolean; postId: string }>("/explore/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function toggleLike(postId: string): Promise<{ liked: boolean }> {
  return request<{ liked: boolean }>(`/explore/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rsvpEvent(postId: string): Promise<{ rsvp: boolean }> {
  return request<{ rsvp: boolean }>(`/explore/posts/${postId}/rsvp`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function joinGroup(postId: string): Promise<{ joined: boolean }> {
  return request<{ joined: boolean }>(`/explore/posts/${postId}/join`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getLeaderboard(
  limit = 10,
): Promise<{ leaderboard: LeaderboardEntry[] }> {
  return request<{ leaderboard: LeaderboardEntry[] }>(
    `/explore/leaderboard?limit=${limit}`,
    {
      method: "GET",
    },
  );
}

export async function getSocialProfile(): Promise<SocialProfile> {
  return request<SocialProfile>("/explore/profile", {
    method: "GET",
  });
}

export async function getShopRecommendations(): Promise<{
  products: ShopProduct[];
}> {
  return request<{ products: ShopProduct[] }>("/explore/shop/recommendations", {
    method: "GET",
  });
}

export async function purchaseProduct(
  productId: string,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/explore/shop/${productId}/purchase`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getMyPurchases(): Promise<{ purchasedIds: string[] }> {
  return request<{ purchasedIds: string[] }>("/explore/shop/purchases", {
    method: "GET",
  });
}

// ─── Notification Endpoints ────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: "critical" | "warning" | "success" | "info";
  category: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export async function getNotifications(
  limit = 30,
): Promise<{ notifications: AppNotification[] }> {
  return request<{ notifications: AppNotification[] }>(
    `/notifications?limit=${limit}`,
    {
      method: "GET",
    },
  );
}

export async function markAllNotificationsRead(): Promise<{
  success: boolean;
}> {
  return request<{ success: boolean }>("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function deleteNotification(
  notificationId: string,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/notifications/${notificationId}`, {
    method: "DELETE",
  });
}

// ─── Chat Endpoints ───────────────────────────────────────────────────────────

export interface BackendChatSession {
  id: string;
  sessionType: "chat" | "video" | "clinical";
  status: "active" | "ended";
  summary: string;
  advice: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface BackendSessionDetail {
  session: BackendChatSession;
  messages: BackendChatMessage[];
}

export async function createChatSession(
  sessionType: "chat" | "video" | "clinical" = "chat",
): Promise<BackendChatSession> {
  return request<BackendChatSession>("/chat/sessions", {
    method: "POST",
    body: JSON.stringify({ sessionType }),
  });
}

export async function getChatSessions(
  limit = 30,
): Promise<BackendChatSession[]> {
  const res = await request<{ sessions: BackendChatSession[] }>(
    `/chat/sessions?limit=${limit}`,
    {
      method: "GET",
    },
  );
  return res.sessions;
}

export async function getChatSession(
  sessionId: string,
): Promise<BackendSessionDetail> {
  return request<BackendSessionDetail>(`/chat/sessions/${sessionId}`, {
    method: "GET",
  });
}

export async function streamChatMessage(
  sessionId: string,
  payload: {
    message: string;
    history: Array<{ role: "user" | "model"; text: string }>;
    userProfile: { name: string; age: number; weight: number };
    imageBase64?: string;
  },
  onToken: (token: string) => void,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}/chat/sessions/${sessionId}/message`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any)?.error ?? `Stream failed: ${res.status}`);
  }

  if (!res.body) {
    throw new Error("SSE stream body is empty.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let splitIndex = buffer.indexOf("\n\n");
    while (splitIndex !== -1) {
      const eventChunk = buffer.slice(0, splitIndex).trim();
      buffer = buffer.slice(splitIndex + 2);

      if (eventChunk.startsWith("data:")) {
        const data = eventChunk.slice(5).trim();

        if (data === "[DONE]") {
          return;
        }

        const parsed = JSON.parse(data) as { token?: string; error?: string };
        if (parsed.error) {
          throw new Error(parsed.error);
        }

        if (parsed.token) {
          onToken(parsed.token);
        }
      }

      splitIndex = buffer.indexOf("\n\n");
    }
  }
}

export async function endChatSession(
  sessionId: string,
  transcript: Array<{ role: string; text: string }>,
): Promise<{ summary: string; advice: string }> {
  return request<{ summary: string; advice: string }>(
    `/chat/sessions/${sessionId}/end`,
    {
      method: "PUT",
      body: JSON.stringify({ transcript }),
    },
  );
}

export async function deleteChatSession(
  sessionId: string,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/chat/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

// ─── Video Call Session Endpoints ────────────────────────────────────────────

export interface VideoCallPolicy {
  maxDurationSeconds: number;
  dailyMaxCalls: number;
  dailyMaxSeconds: number;
  maxConcurrentSessions: number;
}

export interface VideoCallQuotaResponse {
  dayKey: string;
  policy: VideoCallPolicy;
  startedCountToday: number;
  completedCountToday: number;
  activeSessionsToday: number;
  consumedSecondsToday: number;
  remainingCallsToday: number;
  remainingSecondsToday: number;
  activeSession: {
    sessionId: string;
    remainingSessionSeconds: number;
  } | null;
}

export interface VideoCallStartResponse {
  sessionId: string;
  dayKey: string;
  policy: VideoCallPolicy;
  maxDurationSeconds: number;
  remainingCallsToday: number;
  remainingSecondsToday: number;
  expiresAt: string;
}

export interface VideoCallHeartbeatResponse {
  status: "active" | "ended";
  shouldEnd: boolean;
  reason?: string;
  remainingSessionSeconds: number;
  remainingSecondsToday: number;
}

export interface VideoCallEndResponse {
  status: "ended";
  sessionId: string;
  dayKey: string;
  consumedSeconds: number;
  reason: string;
}

export async function getVideoCallQuota(): Promise<VideoCallQuotaResponse> {
  return request<VideoCallQuotaResponse>("/chat/video/quota", {
    method: "GET",
  });
}

export async function startVideoCallSession(): Promise<VideoCallStartResponse> {
  return request<VideoCallStartResponse>("/chat/video/sessions/start", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function heartbeatVideoCallSession(
  sessionId: string,
): Promise<VideoCallHeartbeatResponse> {
  return request<VideoCallHeartbeatResponse>(
    `/chat/video/sessions/${sessionId}/heartbeat`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function endVideoCallSession(
  sessionId: string,
  reason = "manual_end",
  transcript?: Array<{ role: string; text: string }>
): Promise<VideoCallEndResponse & { summary?: string; advice?: string }> {
  return request<VideoCallEndResponse & { summary?: string; advice?: string }>(
    `/chat/video/sessions/${sessionId}/end`,
    {
      method: "POST",
      body: JSON.stringify({ reason, transcript }),
    },
  );
}

// ─── Scan Endpoints ──────────────────────────────────────────────

export interface ScanResponse {
  success: boolean;
  data: any;
}

export async function postScanImage(
  base64Image: string,
  scanMode: "food" | "label" | "qr" | "receipt",
): Promise<ScanResponse> {
  return request<ScanResponse>("/scan", {
    method: "POST",
    body: JSON.stringify({ base64Image, scanMode }),
  });
}

export async function postVersusScan(
  base64ImageA: string,
  base64ImageB: string,
): Promise<ScanResponse> {
  return request<ScanResponse>("/scan", {
    method: "POST",
    body: JSON.stringify({ base64ImageA, base64ImageB, scanMode: "versus" }),
  });
}

export async function postReanalyzeScan(
  manualName: string,
  manualType: "food" | "drink",
  base64Image?: string,
): Promise<ScanResponse> {
  return request<ScanResponse>("/scan", {
    method: "POST",
    body: JSON.stringify({ manualName, manualType, base64Image, scanMode: "reanalyze" }),
  });
}

export async function postAddonScan(
  text: string,
): Promise<ScanResponse> {
  return request<ScanResponse>("/scan", {
    method: "POST",
    body: JSON.stringify({ text, scanMode: "addon" }),
  });
}

export async function postSkinScan(
  base64Image: string,
): Promise<ScanResponse> {
  return request<ScanResponse>("/scan", {
    method: "POST",
    body: JSON.stringify({ base64Image, scanMode: "skin" }),
  });
}

// ─── Session Restore ──────────────────────────────────────────────────────────
// Dipanggil saat app pertama kali mount untuk restore session dari cookie.

export interface SessionResult {
  accessToken: string;
  isCalibrationComplete: boolean;
  displayName: string;
}

export async function tryRestoreSession(): Promise<SessionResult | null> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe(); // Hanya jalankan sekali saat cek awal
      
      if (user) {
        try {
          const token = await user.getIdToken();
          setAccessToken(token);
          
          const me = await getMe();
          resolve({
            accessToken: token,
            isCalibrationComplete: me.isCalibrationComplete,
            displayName: me.displayName,
          });
        } catch {
          setAccessToken(null);
          resolve(null);
        }
      } else {
        setAccessToken(null);
        resolve(null);
      }
    });
  });
}
