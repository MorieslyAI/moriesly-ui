// ─── Local Notifications ─────────────────────────────────────────────────────
// Notifikasi lokal (Capacitor) untuk:
//   1. Over-consume gula   → langsung tampil saat user mencatat makanan/minuman.
//   2. Training plan       → pengingat tiap blok jadwal (workout + fuel).
//   3. Diet plan harian    → pengingat makan (Breakfast / Lunch / Dinner).
//
// Semua dijadwalkan di perangkat (tanpa server / FCM). Semua fungsi aman
// dipanggil kapan pun: jika permission ditolak atau plugin tidak tersedia,
// fungsi hanya no-op dan tidak melempar error.

import { LocalNotifications } from '@capacitor/local-notifications';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import type { MealItem, TimeBlock } from '../types';

// ─── Konstanta ───────────────────────────────────────────────────────────────

// ID notifikasi harus integer 32-bit. Tiap kategori punya rentang sendiri
// supaya bisa dibatalkan / dijadwalkan ulang tanpa saling menimpa.
const ID_TRAINING_WORKOUT = 10_000; // + index blok
const ID_TRAINING_FUEL = 10_100; // + index blok
const ID_DIET_MEAL = 20_000; // + index meal
const ID_RANGE_SIZE = 50;

/** Ingatkan workout sekian menit sebelum jam di jadwal. */
const WORKOUT_LEAD_MIN = 10;
/** Ingatkan fuel (makan) sekian menit setelah jam blok dimulai. */
const FUEL_DELAY_MIN = 45;
/** Ingatkan makan diet sekian menit sebelum jam makan. */
const MEAL_LEAD_MIN = 15;
/** Jam makan default (diet plan tidak menyimpan jam per meal). */
const MEAL_TIMES: Record<MealItem['type'], number> = {
  Breakfast: 7 * 60 + 30,
  Lunch: 12 * 60 + 30,
  Dinner: 18 * 60 + 30,
};
/** Abaikan jadwal yang jatuh kurang dari sekian ms dari sekarang. */
const MIN_FUTURE_MS = 5_000;

const SUGAR_WARN_RATIO = 0.8;

// ─── Helper internal ─────────────────────────────────────────────────────────

let permissionCache: boolean | null = null;

async function ensurePermission(): Promise<boolean> {
  if (permissionCache === true) return true;
  try {
    let status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      status = await LocalNotifications.requestPermissions();
    }
    permissionCache = status.display === 'granted';
  } catch (e) {
    console.warn('[LocalNotif] permission check failed:', e);
    permissionCache = false;
  }
  return permissionCache;
}

/** ID unik & monoton untuk notifikasi seketika, supaya alert berurutan tidak saling menimpa. */
let lastImmediateId = 0;
function nextImmediateId(): number {
  lastImmediateId = Math.max(lastImmediateId + 1, (Date.now() % 2_000_000_000) + 30_000);
  return lastImmediateId;
}

/** Serialisasi semua operasi schedule/cancel agar tidak saling balapan. */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T | undefined> {
  const next = queue.then(task).catch((e) => {
    console.warn('[LocalNotif] task failed:', e);
    return undefined;
  });
  queue = next;
  return next as Promise<T | undefined>;
}

async function cancelRange(base: number): Promise<void> {
  const notifications = Array.from({ length: ID_RANGE_SIZE }, (_, i) => ({ id: base + i }));
  await LocalNotifications.cancel({ notifications });
}

async function schedule(list: LocalNotificationSchema[]): Promise<void> {
  if (list.length === 0) return;
  await LocalNotifications.schedule({ notifications: list });
}

/** "07:00 AM" / "7:30 pm" / "18:15" → menit sejak 00:00. null bila tidak valid. */
function parseTimeLabel(label: string): number | null {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i.exec(label ?? '');
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = m[3]?.toUpperCase();
  if (mer === 'PM' && h < 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Date hari ini (waktu lokal perangkat) pada menit ke-N sejak tengah malam. */
function todayAt(minutes: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function isFuture(d: Date): boolean {
  return d.getTime() - Date.now() > MIN_FUTURE_MS;
}

function localDateKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Tandai sebuah alert sudah dikirim hari ini. Return true jika baru pertama kali. */
function markOncePerDay(key: string): boolean {
  const storageKey = `moriesly:notif:${key}:${localDateKey()}`;
  try {
    if (localStorage.getItem(storageKey)) return false;
    localStorage.setItem(storageKey, '1');
  } catch {
    /* storage tidak tersedia → tetap kirim */
  }
  return true;
}

// ─── 1. Over-consume gula ────────────────────────────────────────────────────

export interface SugarProgress {
  /** Total gula hari ini SEBELUM item ini dicatat (gram). */
  before: number;
  /** Total gula hari ini SESUDAH item ini dicatat (gram). */
  after: number;
  /** Batas gula harian (gram). */
  limit: number;
  itemName?: string;
}

/**
 * Kirim notifikasi langsung saat user mendekati / melewati batas gula harian.
 *  - melewati 80%  → sekali per hari
 *  - melewati 100% → sekali per hari
 *  - sudah di atas batas dan makan gula lagi → tiap kali
 */
export function notifySugarProgress({ before, after, limit, itemName }: SugarProgress): Promise<void> {
  if (!(limit > 0) || !(after > before)) return Promise.resolve();

  const round = (n: number) => Math.round(n);
  const item = itemName ? ` (${itemName})` : '';
  let content: { title: string; body: string } | null = null;

  if (after > limit) {
    const over = round(after - limit);
    if (before <= limit) {
      if (markOncePerDay('sugar-breach')) {
        content = {
          title: 'PROTOCOL BREACH',
          body: `Daily sugar limit exceeded by ${over}g${item} — ${round(after)}g / ${round(limit)}g. Stop sugar for today.`,
        };
      }
    } else {
      content = {
        title: 'OVER LIMIT — STILL CONSUMING',
        body: `+${round(after - before)}g sugar${item}. You are now ${over}g over your ${round(limit)}g limit.`,
      };
    }
  } else if (before < limit * SUGAR_WARN_RATIO && after >= limit * SUGAR_WARN_RATIO) {
    if (markOncePerDay('sugar-warn')) {
      content = {
        title: 'THRESHOLD APPROACHING',
        body: `Sugar at ${round((after / limit) * 100)}% of today's limit (${round(after)}g / ${round(limit)}g). Tread carefully.`,
      };
    }
  }

  if (!content) return Promise.resolve();
  const { title, body } = content;

  return enqueue(async () => {
    if (!(await ensurePermission())) return;
    await schedule([
      {
        id: nextImmediateId(),
        title,
        body,
        schedule: { at: new Date(Date.now() + 500), allowWhileIdle: true },
      },
    ]);
  }).then(() => undefined);
}

// ─── 2. Training plan ────────────────────────────────────────────────────────

/**
 * Jadwalkan ulang pengingat training untuk HARI INI.
 * Panggil setiap plan / status completed berubah (idempotent).
 * `schedule = null` membatalkan semua pengingat training.
 */
export function syncTrainingReminders(
  blocks: TimeBlock[] | null,
  completedWorkouts: number[],
  completedMeals: number[],
): Promise<void> {
  return enqueue(async () => {
    await cancelRange(ID_TRAINING_WORKOUT);
    await cancelRange(ID_TRAINING_FUEL);
    if (!blocks || blocks.length === 0) return;

    const list: LocalNotificationSchema[] = [];
    blocks.slice(0, ID_RANGE_SIZE).forEach((block, i) => {
      const start = parseTimeLabel(block.timeLabel);
      if (start === null) return;

      if (!completedWorkouts.includes(i)) {
        const at = todayAt(start - WORKOUT_LEAD_MIN);
        if (isFuture(at)) {
          list.push({
            id: ID_TRAINING_WORKOUT + i,
            title: `MISSION: ${block.actionName}`.toUpperCase(),
            body: `${block.timeLabel} — ${block.actionDetail}`,
            schedule: { at, allowWhileIdle: true },
          });
        }
      }

      if (!completedMeals.includes(i)) {
        const at = todayAt(start + FUEL_DELAY_MIN);
        if (isFuture(at)) {
          list.push({
            id: ID_TRAINING_FUEL + i,
            title: `FUEL UP: ${block.fuelName}`.toUpperCase(),
            body: block.fuelDetail,
            schedule: { at, allowWhileIdle: true },
          });
        }
      }
    });

    if (list.length === 0) return;
    if (!(await ensurePermission())) return;
    await schedule(list);
  }).then(() => undefined);
}

// ─── 3. Diet plan harian ─────────────────────────────────────────────────────

/**
 * Jadwalkan ulang pengingat makan untuk diet plan HARI INI.
 * `meals = null` membatalkan semua pengingat diet.
 */
export function syncDietReminders(
  meals: MealItem[] | null,
  consumedIndices: number[],
): Promise<void> {
  return enqueue(async () => {
    await cancelRange(ID_DIET_MEAL);
    if (!meals || meals.length === 0) return;

    const list: LocalNotificationSchema[] = [];
    meals.slice(0, ID_RANGE_SIZE).forEach((meal, i) => {
      if (consumedIndices.includes(i)) return;
      const mealTime = MEAL_TIMES[meal.type];
      if (mealTime === undefined) return;

      const at = todayAt(mealTime - MEAL_LEAD_MIN);
      if (!isFuture(at)) return;
      list.push({
        id: ID_DIET_MEAL + i,
        title: `${meal.type.toUpperCase()} TIME`,
        body: `${meal.menuName} — ${Math.round(meal.calories)} kcal, ${Math.round(meal.sugarGrams)}g sugar. Log it once eaten.`,
        schedule: { at, allowWhileIdle: true },
      });
    });

    if (list.length === 0) return;
    if (!(await ensurePermission())) return;
    await schedule(list);
  }).then(() => undefined);
}

// ─── Logout ──────────────────────────────────────────────────────────────────

/** Batalkan semua pengingat terjadwal (mis. saat logout agar tidak bocor ke akun lain). */
export function cancelAllReminders(): Promise<void> {
  return enqueue(async () => {
    await cancelRange(ID_TRAINING_WORKOUT);
    await cancelRange(ID_TRAINING_FUEL);
    await cancelRange(ID_DIET_MEAL);
  }).then(() => undefined);
}
