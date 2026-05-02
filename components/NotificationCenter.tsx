import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Trash2, CheckCheck, Bell } from 'lucide-react';
import { LedgerState, UserProfile } from '../types';
import {
  getNotifications,
  markAllNotificationsRead,
  deleteNotification,
  type AppNotification,
} from '../services/api';

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface NotificationCenterProps {
  userProfile: UserProfile;
  ledger: LedgerState;
  onClose: () => void;
  /** Called after "mark all read" so the parent can reset its badge. */
  onMarkedAllRead?: () => void;
}

// â”€â”€â”€ Ephemeral (client-side) alert builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// These are NOT stored on the backend â€” they reflect real-time state derived
// from the user's profile and ledger (medical conditions, streak, hydration).

function buildEphemeralAlerts(
  userProfile: UserProfile,
  ledger: LedgerState,
): AppNotification[] {
  const list: AppNotification[] = [];
  const now = new Date();

  // Medical conditions â€” constant reminders
  if (userProfile.medicalConditions && userProfile.medicalConditions.length > 0) {
    userProfile.medicalConditions.forEach((cond, i) => {
      list.push({
        id: `ephemeral-med-${i}`,
        type: 'info',
        category: 'medical',
        title: 'MEDICAL WATCH',
        message: `Monitoring glucose spikes strictly due to active condition: ${cond}.`,
        timestamp: new Date().toISOString(),
        read: true, // ephemeral â€” don't count toward unread badge
      });
    });
  }

  // Sugar debt still pending
  if (ledger.sugarDebt > 0) {
    list.push({
      id: 'ephemeral-debt',
      type: 'warning',
      category: 'sugar',
      title: 'METABOLIC DEBT PENDING',
      message: `${ledger.sugarDebt}g of sugar awaiting neutralization. Physical activity required to clear the ledger.`,
      timestamp: new Date().toISOString(),
      read: true,
    });
  }

  // Hydration reminder (daytime only)
  if (now.getHours() >= 10 && now.getHours() < 18) {
    list.push({
      id: 'ephemeral-hydro',
      type: 'success',
      category: 'hydration',
      title: 'HYDRATION CHECK',
      message: 'Water supports kidney filtration of excess glucose. Target 500ml before your next meal.',
      timestamp: new Date().toISOString(),
      read: true,
    });
  }

  // Streak milestone
  if (userProfile.streak > 2) {
    list.push({
      id: 'ephemeral-streak',
      type: 'success',
      category: 'streak',
      title: 'DISCIPLINE RECORD',
      message: `${userProfile.streak}-day streak active. Neural pathways for metabolic resistance are strengthening.`,
      timestamp: new Date().toISOString(),
      read: true,
    });
  }

  return list;
}

// â”€â”€â”€ Helper: relative time label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const sec  = Math.floor(diff / 1_000);
  const min  = Math.floor(sec  / 60);
  const hr   = Math.floor(min  / 60);
  const day  = Math.floor(hr   / 24);
  if (sec < 60)  return 'just now';
  if (min < 60)  return `${min}m ago`;
  if (hr  < 24)  return `${hr}h ago`;
  if (day < 7)   return `${day}d ago`;
  return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// â”€â”€â”€ Style map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CARD_STYLE: Record<string, string> = {
  critical: 'bg-rose-50   dark:bg-rose-950/20   border-rose-200   dark:border-rose-500/50',
  warning:  'bg-amber-50  dark:bg-amber-950/20  border-amber-200  dark:border-amber-500/50',
  success:  'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/50',
  info:     'bg-blue-50   dark:bg-blue-950/20   border-blue-200   dark:border-blue-500/50',
};

const DOT_STYLE: Record<string, string> = {
  critical: 'bg-rose-500 animate-pulse',
  warning:  'bg-amber-500',
  success:  'bg-emerald-500',
  info:     'bg-blue-400',
};

const TITLE_STYLE: Record<string, string> = {
  critical: 'text-rose-500',
  warning:  'text-amber-500',
  success:  'text-emerald-500',
  info:     'text-blue-400',
};

const EMOJI: Record<string, string> = {
  critical: 'âš ï¸',
  warning:  'âš¡',
  success:  'ðŸ›¡ï¸',
  info:     'â„¹ï¸',
};

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userProfile,
  ledger,
  onClose,
  onMarkedAllRead,
}) => {

  const [persisted,      setPersistedAlerts] = useState<AppNotification[]>([]);
  const [isLoading,      setIsLoading]        = useState(true);
  const [isMarkingRead,  setIsMarkingRead]    = useState(false);
  const [deletingIds,    setDeletingIds]      = useState<Set<string>>(new Set());
  const [fetchError,     setFetchError]       = useState<string | null>(null);

  // Merge backend + ephemeral, deduplicate by id, sort newest first
  const allAlerts = React.useMemo(() => {
    const ephemeral = buildEphemeralAlerts(userProfile, ledger);
    const ids = new Set(persisted.map((n) => n.id));
    const merged = [
      ...persisted,
      ...ephemeral.filter((e) => !ids.has(e.id)),
    ];
    return merged.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [persisted, userProfile, ledger]);

  const unreadFromBackend = persisted.filter((n) => !n.read).length;

  // â”€â”€ Fetch from backend on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { notifications } = await getNotifications(30);
      setPersistedAlerts(notifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setFetchError('Could not load notifications. Showing local alerts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // â”€â”€ Mark all read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMarkAllRead = async () => {
    if (unreadFromBackend === 0) return;
    setIsMarkingRead(true);
    try {
      await markAllNotificationsRead();
      setPersistedAlerts((prev) => prev.map((n) => ({ ...n, read: true })));
      onMarkedAllRead?.();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  // â”€â”€ Delete one notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async (id: string) => {
    // Ephemeral (client-only) alerts have ids starting with "ephemeral-"
    if (id.startsWith('ephemeral-')) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteNotification(id);
      setPersistedAlerts((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="pb-24 animate-in slide-in-from-right-4 duration-300">

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="bg-white/80 dark:bg-zinc-900/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wider leading-none">
              Alert Log
            </h2>
            <p className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5">
              {isLoading ? 'Syncing...' : `${allAlerts.length} signal${allAlerts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Unread badge */}
          {unreadFromBackend > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadFromBackend}
            </span>
          )}
          {/* Mark all read */}
          {unreadFromBackend > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingRead}
              className="flex items-center gap-1 text-[9px] font-black uppercase text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors disabled:opacity-50"
              title="Mark all as read"
            >
              {isMarkingRead
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCheck className="w-3.5 h-3.5" />
              }
              <span className="hidden sm:inline">Read all</span>
            </button>
          )}
        </div>
      </div>

      {/* â”€â”€ Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="p-4 space-y-3">

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <p className="text-xs font-medium text-zinc-400">Syncing alerts from server...</p>
          </div>
        )}

        {/* Fetch error */}
        {!isLoading && fetchError && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
            âš ï¸ {fetchError}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
            <Bell className="w-8 h-8 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-400 text-center">
              All systems nominal.<br />No alerts detected.
            </p>
          </div>
        )}

        {/* Alert cards */}
        {!isLoading && allAlerts.map((alert) => {
          const isDeleting  = deletingIds.has(alert.id);
          const isEphemeral = alert.id.startsWith('ephemeral-');
          const canDelete   = !isEphemeral;

          return (
            <div
              key={alert.id}
              className={`relative overflow-hidden rounded-2xl p-4 border transition-all hover:scale-[1.01] group
                ${CARD_STYLE[alert.type] ?? CARD_STYLE.info}
                ${!alert.read && !isEphemeral ? 'ring-2 ring-offset-1 ring-zinc-200 dark:ring-zinc-700' : ''}
                ${isDeleting ? 'opacity-40 scale-95' : ''}
              `}
            >
              {/* Unread dot */}
              {!alert.read && !isEphemeral && (
                <span className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-rose-500" />
              )}

              {/* Title row */}
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${DOT_STYLE[alert.type] ?? DOT_STYLE.info}`} />
                  <h3 className={`text-xs font-black uppercase tracking-wider ${TITLE_STYLE[alert.type] ?? TITLE_STYLE.info}`}>
                    {alert.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[9px] font-mono text-zinc-400">
                    {isEphemeral ? 'Live' : relativeTime(alert.timestamp)}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(alert.id)}
                      disabled={isDeleting}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400"
                      title="Dismiss"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message */}
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium relative z-10 pl-4">
                {alert.message}
              </p>

              {/* Background emoji decor */}
              <div className={`absolute -right-4 -bottom-4 opacity-5 text-6xl pointer-events-none grayscale group-hover:grayscale-0 transition-all ${TITLE_STYLE[alert.type] ?? ''}`}>
                {EMOJI[alert.type] ?? 'â„¹ï¸'}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default NotificationCenter;

