import React, { useCallback, useEffect, useState } from 'react';
import { UserProfile, LedgerState, HistoryItem } from '../types';
import {
  Newspaper,
  Users,
  User,
  ShoppingBag,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  TrendingUp,
  Calendar,
  Video,
  PlayCircle,
  MessageSquare,
  LayoutList,
  Trophy,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import * as api from '../services/api';
import type {
  NewsArticle,
  SocialPost,
  ShopProduct,
  LeaderboardEntry,
} from '../services/api';

import GroupChatPanel from './GroupChatPanel';
import CreateGroupChatPanel from './CreateGroupChatPanel';

interface ExploreScreenProps {
  userStats: UserProfile;
  ledger: LedgerState;
  history: HistoryItem[];
  onSetBackHandler?: (handler: (() => boolean) | null) => void;
}

// ─── Hook: Data Fetcher ───────────────────────────────────────────────────────
function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetcher()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return {
    data,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
      <Loader2 className="animate-spin mr-2" size={20} />
      Loading...
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4 text-red-600 dark:text-red-400">
      <div className="flex items-center gap-2 font-bold mb-2">
        <AlertCircle size={18} />
        Something went wrong
      </div>

      <p className="text-sm mb-3">{message}</p>

      <button
        onClick={onRetry}
        className="text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ExploreScreen: React.FC<ExploreScreenProps> = ({ userStats, onSetBackHandler }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'social' | 'shop'>(
    'news',
  );

  useEffect(() => {
    if (!onSetBackHandler) return;
    if (activeTab !== 'news') {
      onSetBackHandler(() => {
        setActiveTab('news');
        return true;
      });
    } else {
      onSetBackHandler(null);
    }
    return () => { onSetBackHandler(null); };
  }, [activeTab, onSetBackHandler]);

  const [socialTab, setSocialTab] = useState<'feed' | 'events' | 'groups' | 'privateChats' | 'profile' | 'leaderboard'>('feed');

  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [rsvpPosts, setRsvpPosts] = useState<Set<string>>(new Set());
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());

  // ── News ─────────────────────────────────────────────────────────────────
  const {
    data: newsData,
    loading: newsLoading,
    error: newsError,
    refetch: refetchNews,
  } = useFetch(() => api.getNews({ limit: 20 }), []);

  // ── Social Feed ──────────────────────────────────────────────────────────
  const feedType = socialTab === 'events' ? 'event' : 'all';
  
  const shouldFetchPosts =
    socialTab === 'feed' ||
    socialTab === 'events' ||
    socialTab === 'profile';

  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useFetch(
    () =>
      shouldFetchPosts
        ? api.getPosts({ type: feedType as any, limit: 50 })
        : Promise.resolve({ posts: [], hasMore: false }),
    [feedType, shouldFetchPosts],
  );

  // ── Leaderboard ──────────────────────────────────────────────────────────
  const {
    data: lbData,
    loading: lbLoading,
    error: lbError,
    refetch: refetchLb,
  } = useFetch(() => api.getLeaderboard(10), []);

  // ── Social Profile ───────────────────────────────────────────────────────
  const {
    data: profileData,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useFetch(() => api.getSocialProfile(), []);

  // ── Shop ─────────────────────────────────────────────────────────────────
  const {
    data: shopData,
    loading: shopLoading,
    error: shopError,
    refetch: refetchShop,
  } = useFetch(() => api.getShopRecommendations(), []);

  const { data: purchasesData, refetch: refetchPurchases } = useFetch(
    () => api.getMyPurchases(),
    [],
  );

  const purchasedIds = new Set(purchasesData?.purchasedIds ?? []);

  // ── Post Counts, for profile tab ─────────────────────────────────────────
  const myPosts = (postsData?.posts ?? []).filter(
    (p) =>
      p.authorName === userStats.name ||
      p.authorName === profileData?.name ||
      p.authorId === userStats.name,
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() || isPosting) return;

    setIsPosting(true);

    try {
      await api.createPost({
        content: newPostContent,
        type: 'post',
      });

      setNewPostContent('');
      refetchPosts();
    } catch (e: any) {
      console.error('Failed to create post:', e.message);
    } finally {
      setIsPosting(false);
    }
  }, [newPostContent, isPosting, refetchPosts]);

  const handleLike = useCallback(
    async (postId: string) => {
      try {
        const res = await api.toggleLike(postId);

        setLikedPosts((prev) => {
          const next = new Set(prev);

          if (res.liked) next.add(postId);
          else next.delete(postId);

          return next;
        });

        refetchPosts();
      } catch (e: any) {
        console.error('Failed to like:', e.message);
      }
    },
    [refetchPosts],
  );

  const handleRsvp = useCallback(
    async (postId: string) => {
      try {
        const res = await api.rsvpEvent(postId);

        setRsvpPosts((prev) => {
          const next = new Set(prev);

          if (res.rsvp) next.add(postId);
          else next.delete(postId);

          return next;
        });

        refetchPosts();
      } catch (e: any) {
        console.error('Failed to RSVP:', e.message);
      }
    },
    [refetchPosts],
  );

  const handleJoinGroup = useCallback(
    async (postId: string) => {
      try {
        const res = await api.joinGroup(postId);

        setJoinedGroups((prev) => {
          const next = new Set(prev);

          if (res.joined) next.add(postId);
          else next.delete(postId);

          return next;
        });

        refetchPosts();
      } catch (e: any) {
        console.error('Failed to join group:', e.message);
      }
    },
    [refetchPosts],
  );

  const handleBuy = useCallback(
    async (productId: string) => {
      try {
        await api.purchaseProduct(productId);
        refetchPurchases();
      } catch (e: any) {
        console.error('Failed to purchase:', e.message);
      }
    },
    [refetchPurchases],
  );

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderPost = (post: SocialPost) => (
    <article
      key={post.id}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-black overflow-hidden">
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-full h-full object-cover"
              />
            ) : (
              post.authorName?.charAt(0)?.toUpperCase() ?? 'U'
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-zinc-900 dark:text-white">
                {post.authorName}
              </h3>

              {post.type === 'event' && (
                <span className="text-[10px] font-black uppercase bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-2 py-1 rounded-full">
                  Event
                </span>
              )}

              {post.type === 'group' && (
                <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-2 py-1 rounded-full">
                  Group
                </span>
              )}

              {post.type === 'video' && (
                <span className="text-[10px] font-black uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-1 rounded-full">
                  Video
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 mb-4 whitespace-pre-line">
        {post.content}
      </p>

      {/* Event Details */}
      {post.type === 'event' && post.eventDate && (
        <div className="bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-black text-brand-700 dark:text-brand-300">
              <Calendar size={16} />
              {post.eventDate}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {post.attendees ?? 0} attending
            </p>
          </div>

          <button
            onClick={() => handleRsvp(post.id)}
            className={`text-white text-xs font-black px-4 py-2 rounded-xl transition-colors ${
              rsvpPosts.has(post.id)
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-brand-500 hover:bg-brand-600'
            }`}
          >
            {rsvpPosts.has(post.id) ? 'Going' : 'RSVP'}
          </button>
        </div>
      )}

      {/* Group Details */}
      {post.type === 'group' && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-black text-purple-700 dark:text-purple-300">
              <Users size={16} />
              Group Chat
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {post.members ?? 0} members
            </p>
          </div>

          <button
            onClick={() => handleJoinGroup(post.id)}
            className={`text-white text-xs font-black px-4 py-2 rounded-xl transition-colors ${
              joinedGroups.has(post.id)
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-purple-500 hover:bg-purple-600'
            }`}
          >
            {joinedGroups.has(post.id) ? 'Joined' : 'Join'}
          </button>
        </div>
      )}

      {/* Video Post */}
      {post.type === 'video' && post.videoThumbnail && (
        <div className="relative rounded-2xl overflow-hidden mb-4 bg-zinc-100 dark:bg-zinc-800">
          <img
            src={post.videoThumbnail}
            alt="Video thumbnail"
            className="w-full h-64 object-cover"
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              <PlayCircle className="text-zinc-900" size={36} />
            </div>
          </div>

          {post.duration && (
            <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-lg">
              {post.duration}
            </span>
          )}
        </div>
      )}

      {/* Regular Media */}
      {post.type !== 'video' && post.mediaUrl && (
        <img
          src={post.mediaUrl}
          alt="Post media"
          className="w-full rounded-2xl mb-4 object-cover max-h-80"
        />
      )}

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <button
            onClick={() => handleLike(post.id)}
            className={`flex items-center gap-2 transition-colors group ${
              likedPosts.has(post.id)
                ? 'text-rose-500'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-rose-500'
            }`}
          >
            <Heart
              size={18}
              className={likedPosts.has(post.id) ? 'fill-current' : ''}
            />
            <span className="text-sm font-bold">{post.likes}</span>
          </button>

          <button className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-colors">
            <MessageCircle size={18} />
            <span className="text-sm font-bold">{post.comments}</span>
          </button>
        </div>

        <button className="text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-colors">
          <Share2 size={18} />
        </button>
      </div>
    </article>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white">
          Explore
        </h1>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Discover news, community updates, and curated products.
        </p>
      </div>

      {/* Main Tabs */}
      <div className="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl flex gap-1">
        {(['news', 'social', 'shop'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-black transition-all capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {tab === 'news' && <Newspaper size={16} />}
              {tab === 'social' && <Users size={16} />}
              {tab === 'shop' && <ShoppingBag size={16} />}

              {tab === 'news' ? 'News' : tab === 'social' ? 'Social' : 'Shop'}
            </span>
          </button>
        ))}
      </div>

      {/* ── NEWS TAB ── */}
      {activeTab === 'news' && (
        <section className="space-y-4">
          {newsLoading && <LoadingState />}

          {newsError && (
            <ErrorState message={newsError} onRetry={refetchNews} />
          )}

          {!newsLoading &&
            !newsError &&
            (newsData?.articles ?? []).map((article: NewsArticle) => (
              <article
                key={article.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm"
              >
                {article.imageUrl && (
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-56 object-cover"
                  />
                )}

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-2 py-1 rounded-full">
                      {article.category}
                    </span>

                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {article.source} •{' '}
                      {new Date(article.date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
                    {article.title}
                  </h3>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                    {article.summary}
                  </p>

                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-black text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Read Full Story
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </article>
            ))}

          {!newsLoading && !newsError && newsData?.articles.length === 0 && (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              No articles yet.
            </div>
          )}
        </section>
      )}

      {/* ── SOCIAL TAB ── */}
      {activeTab === 'social' && (
        <section className="space-y-5">
          {/* Sub Navigation */}
          <div className="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {(
                [
                  { id: 'feed', label: 'Home Feed', icon: LayoutList },
                  { id: 'events', label: 'Events', icon: Calendar },
                  { id: 'groups', label: 'Group Chat', icon: Users },
                  {
                    id: 'privateChats',
                    label: 'Add Group',
                    icon: MessageSquare,
                  },
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSocialTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                    socialTab === tab.id
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Create Post */}
          {socialTab === 'feed' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-black">
                  {userStats.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>

                <input
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePost();
                  }}
                  placeholder="Share your progress..."
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-zinc-900 dark:text-white"
                />

                <button
                  onClick={handleCreatePost}
                  disabled={isPosting || !newPostContent.trim()}
                  className="w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPosting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <MessageSquare size={18} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Group Chat List + Room */}
          {socialTab === 'groups' && (
            <GroupChatPanel
              userStats={userStats}
              refreshKey={groupRefreshKey}
            />
          )}
          
          {/* Add Group */}
          {socialTab === 'privateChats' && (
            <CreateGroupChatPanel
              onCreated={() => {
                setGroupRefreshKey((value) => value + 1);
                setSocialTab('groups');
              }}
            />
          )}

          {/* Leaderboard */}
          {socialTab === 'leaderboard' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-4">
                Health Leaderboard
              </h3>

              {lbLoading && <LoadingState />}

              {lbError && (
                <ErrorState message={lbError} onRetry={refetchLb} />
              )}

              {!lbLoading && !lbError && (
                <div className="space-y-3">
                  {(lbData?.leaderboard ?? []).map(
                    (entry: LeaderboardEntry) => (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-4 rounded-2xl ${
                          entry.isUser
                            ? 'bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900'
                            : 'bg-zinc-50 dark:bg-zinc-950'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                              entry.rank <= 3
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
                                : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                          >
                            #{entry.rank}
                          </div>

                          <div>
                            <div className="font-black text-zinc-900 dark:text-white">
                              {entry.isUser ? 'You' : entry.name}
                            </div>

                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              Performance score
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-black text-zinc-900 dark:text-white">
                              {entry.score}
                            </div>
                          </div>

                          {entry.trend === 'up' ? (
                            <TrendingUp
                              size={18}
                              className="text-emerald-500"
                            />
                          ) : entry.trend === 'down' ? (
                            <TrendingUp
                              size={18}
                              className="text-red-500 rotate-180"
                            />
                          ) : (
                            <span className="text-zinc-400 font-black">—</span>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          {socialTab === 'profile' && (
            <div className="space-y-5">
              {profileLoading && <LoadingState />}

              {profileError && (
                <ErrorState message={profileError} onRetry={refetchProfile} />
              )}

              {!profileLoading && !profileError && profileData && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-black text-3xl overflow-hidden">
                      {profileData.avatarUrl ? (
                        <img
                          src={profileData.avatarUrl}
                          alt={profileData.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        profileData.name?.charAt(0)?.toUpperCase() ?? 'U'
                      )}
                    </div>

                    <div>
                      <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
                        {profileData.name}
                      </h2>

                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {profileData.role}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-zinc-900 dark:text-white">
                        {profileData.postsCount}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        Posts
                      </div>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-zinc-900 dark:text-white">
                        {profileData.followersCount >= 1000
                          ? `${(profileData.followersCount / 1000).toFixed(1)}k`
                          : profileData.followersCount}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        Followers
                      </div>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-zinc-900 dark:text-white">
                        {profileData.likesReceived >= 1000
                          ? `${(profileData.likesReceived / 1000).toFixed(1)}k`
                          : profileData.likesReceived}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold">
                        Likes
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {postsLoading && <LoadingState />}

              {postsError && (
                <ErrorState message={postsError} onRetry={refetchPosts} />
              )}

              {!postsLoading &&
                !postsError &&
                (myPosts.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center">
                    <h3 className="font-black text-zinc-900 dark:text-white mb-1">
                      No posts yet
                    </h3>

                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Share your health journey with the community!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">{myPosts.map(renderPost)}</div>
                ))}
            </div>
          )}

          {/* Feed / Events / Groups */}
          {(socialTab === 'feed' || socialTab === 'events') && (
            <div className="space-y-4">
              {postsLoading && <LoadingState />}

              {postsError && (
                <ErrorState message={postsError} onRetry={refetchPosts} />
              )}

              {!postsLoading &&
                !postsError &&
                (postsData?.posts ?? []).map(renderPost)}

              {!postsLoading &&
                !postsError &&
                (postsData?.posts ?? []).length === 0 && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center text-zinc-500 dark:text-zinc-400">
                    No content yet.
                  </div>
                )}
            </div>
          )}
        </section>
      )}

      {/* ── SHOP TAB ── */}
      {activeTab === 'shop' && (
        <section className="space-y-5">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-zinc-800 dark:to-zinc-950 rounded-3xl p-6 text-white">
            <div className="text-sm font-black uppercase tracking-wider text-brand-300 mb-2">
              Moriesly AI Shop
            </div>

            <h2 className="text-2xl font-black mb-2">
              Curated for {userStats.name}
            </h2>

            <p className="text-sm text-zinc-300">
              Based on your recent sugar spikes and macro gaps, we&apos;ve
              selected these essentials.
            </p>
          </div>

          {shopLoading && <LoadingState />}

          {shopError && <ErrorState message={shopError} onRetry={refetchShop} />}

          {!shopLoading && !shopError && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(shopData?.products ?? []).map((product: ShopProduct) => {
                const isPurchased = purchasedIds.has(product.id);

                const displayPrice =
                  typeof product.price === 'number'
                    ? `${product.currency ?? '$'}${product.price.toFixed(2)}`
                    : String(product.price);

                return (
                  <article
                    key={product.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm"
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-52 object-cover"
                      />
                    )}

                    <div className="p-5">
                      <div className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                        {product.brand}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2">
                        {product.name}
                      </h3>

                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                        {product.reason}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="text-xl font-black text-zinc-900 dark:text-white">
                          {displayPrice}
                        </div>

                        <button
                          onClick={() => !isPurchased && handleBuy(product.id)}
                          disabled={isPurchased}
                          className={`p-2 rounded-xl transition-colors flex items-center justify-center ${
                            isPurchased
                              ? 'bg-emerald-500 text-white'
                              : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-brand-600 dark:hover:bg-brand-200'
                          }`}
                        >
                          {isPurchased ? (
                            <span className="text-xs font-black px-2">
                              Owned
                            </span>
                          ) : (
                            <ShoppingBag size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!shopLoading &&
            !shopError &&
            (shopData?.products ?? []).length === 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center text-zinc-500 dark:text-zinc-400">
                No products available.
              </div>
            )}
        </section>
      )}
    </div>
  );
};

export default ExploreScreen;