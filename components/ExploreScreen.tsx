import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, LedgerState, HistoryItem } from '../types';
import {
  Newspaper, Users, User, ShoppingBag, Heart, MessageCircle, Share2, ExternalLink,
  Search, TrendingUp, Calendar, Video, PlayCircle, MessageSquare, LayoutList,
  FileText, Trophy, Loader2, AlertCircle,
} from 'lucide-react';
import * as api from '../services/api';
import type {
  NewsArticle, SocialPost, ShopProduct, LeaderboardEntry, SocialProfile,
} from '../services/api';

interface ExploreScreenProps {
  userStats: UserProfile;
  ledger: LedgerState;
  history: HistoryItem[];
}

// ─── Hook: Data Fetcher ───────────────────────────────────────────────────────

function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refetch: () => setTick((t) => t + 1) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      <span className="text-sm">Loading...</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-zinc-500 text-center max-w-55">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider"
      >
        Try Again
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ExploreScreen: React.FC<ExploreScreenProps> = ({ userStats }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'social' | 'shop'>('news');
  const [socialTab, setSocialTab] = useState<'feed' | 'events' | 'groups' | 'profile' | 'leaderboard'>('feed');
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [rsvpPosts, setRsvpPosts]   = useState<Set<string>>(new Set());
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());

  // ── News ─────────────────────────────────────────────────────────────────
  const { data: newsData, loading: newsLoading, error: newsError, refetch: refetchNews } =
    useFetch(() => api.getNews({ limit: 20 }), []);

  // ── Social Feed ──────────────────────────────────────────────────────────
  const feedType = socialTab === 'feed' ? 'all' : socialTab === 'events' ? 'event' : socialTab === 'groups' ? 'group' : undefined;

  const { data: postsData, loading: postsLoading, error: postsError, refetch: refetchPosts } =
    useFetch(
      () => (feedType ? api.getPosts({ type: feedType as any, limit: 20 }) : Promise.resolve({ posts: [], hasMore: false })),
      [feedType],
    );

  // ── Leaderboard ──────────────────────────────────────────────────────────
  const { data: lbData, loading: lbLoading, error: lbError, refetch: refetchLb } =
    useFetch(() => api.getLeaderboard(10), []);

  // ── Social Profile ───────────────────────────────────────────────────────
  const { data: profileData, loading: profileLoading, error: profileError, refetch: refetchProfile } =
    useFetch(() => api.getSocialProfile(), []);

  // ── Shop ─────────────────────────────────────────────────────────────────
  const { data: shopData, loading: shopLoading, error: shopError, refetch: refetchShop } =
    useFetch(() => api.getShopRecommendations(), []);

  const { data: purchasesData, refetch: refetchPurchases } =
    useFetch(() => api.getMyPurchases(), []);

  const purchasedIds = new Set(purchasesData?.purchasedIds ?? []);

  // ── Post Counts (for profile tab) ────────────────────────────────────────
  const myPosts = (postsData?.posts ?? []).filter((p) => p.authorId === userStats.name);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreatePost = useCallback(async () => {
    if (!newPostContent.trim() || isPosting) return;
    setIsPosting(true);
    try {
      await api.createPost({ content: newPostContent, type: 'post' });
      setNewPostContent('');
      refetchPosts();
    } catch (e: any) {
      console.error('Failed to create post:', e.message);
    } finally {
      setIsPosting(false);
    }
  }, [newPostContent, isPosting, refetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      const res = await api.toggleLike(postId);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(postId); else next.delete(postId);
        return next;
      });
      refetchPosts();
    } catch (e: any) {
      console.error('Failed to like:', e.message);
    }
  }, [refetchPosts]);

  const handleRsvp = useCallback(async (postId: string) => {
    try {
      const res = await api.rsvpEvent(postId);
      setRsvpPosts((prev) => {
        const next = new Set(prev);
        if (res.rsvp) next.add(postId); else next.delete(postId);
        return next;
      });
      refetchPosts();
    } catch (e: any) {
      console.error('Failed to RSVP:', e.message);
    }
  }, [refetchPosts]);

  const handleJoinGroup = useCallback(async (postId: string) => {
    try {
      const res = await api.joinGroup(postId);
      setJoinedGroups((prev) => {
        const next = new Set(prev);
        if (res.joined) next.add(postId); else next.delete(postId);
        return next;
      });
      refetchPosts();
    } catch (e: any) {
      console.error('Failed to join group:', e.message);
    }
  }, [refetchPosts]);

  const handleBuy = useCallback(async (productId: string) => {
    try {
      await api.purchaseProduct(productId);
      refetchPurchases();
    } catch (e: any) {
      console.error('Failed to purchase:', e.message);
    }
  }, [refetchPurchases]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderPost = (post: SocialPost) => (
    <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img src={post.authorAvatar} alt={post.authorName} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <div className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-1.5">
              {post.authorName}
              {post.type === 'event' && <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Event</span>}
              {post.type === 'group' && <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Group</span>}
              {post.type === 'video' && <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Video</span>}
            </div>
            <div className="text-xs text-zinc-400">{new Date(post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
          </div>
        </div>
        <button className="text-zinc-400 hover:text-zinc-600"><Share2 className="w-4 h-4" /></button>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3 leading-relaxed">{post.content}</p>

      {/* Event Details */}
      {post.type === 'event' && post.eventDate && (
        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 mb-4 flex items-center justify-between border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-900 dark:text-white">{post.eventDate}</div>
              <div className="text-xs text-zinc-500">{post.attendees ?? 0} attending</div>
            </div>
          </div>
          <button
            onClick={() => handleRsvp(post.id)}
            className={`text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors ${rsvpPosts.has(post.id) ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-brand-500 hover:bg-brand-600'}`}
          >
            {rsvpPosts.has(post.id) ? 'Going' : 'RSVP'}
          </button>
        </div>
      )}

      {/* Group Details */}
      {post.type === 'group' && (
        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 mb-4 flex items-center justify-between border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-900 dark:text-white">Group Chat</div>
              <div className="text-xs text-zinc-500">{post.members ?? 0} members</div>
            </div>
          </div>
          <button
            onClick={() => handleJoinGroup(post.id)}
            className={`text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors ${joinedGroups.has(post.id) ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-purple-500 hover:bg-purple-600'}`}
          >
            {joinedGroups.has(post.id) ? 'Joined' : 'Join'}
          </button>
        </div>
      )}

      {/* Video Post */}
      {post.type === 'video' && post.videoThumbnail && (
        <div className="rounded-xl overflow-hidden mb-4 relative group cursor-pointer">
          <img src={post.videoThumbnail} alt="Video thumbnail" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <PlayCircle className="w-8 h-8" />
            </div>
          </div>
          {post.duration && (
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white">
              {post.duration}
            </div>
          )}
        </div>
      )}

      {/* Regular Media */}
      {post.type !== 'video' && post.mediaUrl && (
        <div className="rounded-xl overflow-hidden mb-4">
          <img src={post.mediaUrl} alt="Post content" className="w-full h-auto" />
        </div>
      )}

      <div className="flex items-center gap-6 border-t border-zinc-100 dark:border-zinc-800 pt-3">
        <button
          onClick={() => handleLike(post.id)}
          className={`flex items-center gap-2 transition-colors group ${likedPosts.has(post.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-rose-500'}`}
        >
          <Heart className={`w-4 h-4 group-active:scale-125 transition-transform ${likedPosts.has(post.id) ? 'fill-rose-500' : ''}`} />
          <span className="text-xs font-bold">{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs font-bold">{post.comments}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-white dark:bg-black flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Explore</h1>
          <div className="flex gap-2">
            <button className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          {(['news', 'social', 'shop'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              {tab === 'news' ? 'News' : tab === 'social' ? 'Social' : 'Shop'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">

        {/* ── NEWS TAB ── */}
        {activeTab === 'news' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {newsLoading && <LoadingState />}
            {newsError && <ErrorState message={newsError} onRetry={refetchNews} />}
            {!newsLoading && !newsError && (newsData?.articles ?? []).map((article) => (
              <div key={article.id} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800">
                <div className="h-48 overflow-hidden relative">
                  <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                    {article.category}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2 text-xs text-zinc-400 font-medium">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>{new Date(article.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 leading-tight">{article.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2">{article.summary}</p>
                  <a
                    href={article.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                  >
                    Read Full Story <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
            {!newsLoading && !newsError && newsData?.articles.length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">No articles yet.</div>
            )}
          </div>
        )}

        {/* ── SOCIAL TAB ── */}
        {activeTab === 'social' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sub Navigation */}
            <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl mb-4 overflow-x-auto scrollbar-hide">
              {([
                { id: 'feed',        label: 'Home Feed',   icon: LayoutList },
                { id: 'events',      label: 'Events',      icon: Calendar },
                { id: 'groups',      label: 'Group Chat',  icon: Users },
                { id: 'profile',     label: 'Profile',     icon: User },
                { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSocialTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    socialTab === tab.id
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${socialTab === tab.id ? 'text-brand-500' : ''}`} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Create Post */}
            {socialTab === 'feed' && (
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 mb-6">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0 overflow-hidden">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userStats.name)}&background=0D8ABC&color=fff`}
                      alt="User"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreatePost()}
                      placeholder="Share your progress..."
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || isPosting}
                      className="bg-brand-500 text-white p-2 rounded-xl disabled:opacity-50 hover:bg-brand-600 transition-colors"
                    >
                      {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {socialTab === 'leaderboard' && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wide">Health Leaderboard</h3>
                </div>
                {lbLoading && <LoadingState />}
                {lbError && <ErrorState message={lbError} onRetry={refetchLb} />}
                {!lbLoading && !lbError && (
                  <div className="space-y-4">
                    {(lbData?.leaderboard ?? []).map((entry: LeaderboardEntry) => (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-4 rounded-2xl border ${entry.isUser ? 'bg-brand-50 border-brand-100 dark:bg-brand-900/20 dark:border-brand-800/50' : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${entry.rank === 1 ? 'bg-amber-100 text-amber-600' : entry.rank === 2 ? 'bg-zinc-200 text-zinc-600' : entry.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}>
                            #{entry.rank}
                          </div>
                          <div className="font-bold text-zinc-900 dark:text-white">{entry.isUser ? 'You' : entry.name}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-black text-brand-600 dark:text-brand-400">{entry.score}</div>
                          <div className="text-xs">
                            {entry.trend === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : entry.trend === 'down' ? <TrendingUp className="w-3 h-3 text-red-400 rotate-180" /> : <span className="text-zinc-400">—</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile */}
            {socialTab === 'profile' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {profileLoading && <LoadingState />}
                {profileError && <ErrorState message={profileError} onRetry={refetchProfile} />}
                {!profileLoading && !profileError && profileData && (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={profileData.avatarUrl}
                        alt={profileData.name}
                        className="w-16 h-16 rounded-full border-2 border-brand-100"
                      />
                      <div>
                        <h2 className="text-lg font-black text-zinc-900 dark:text-white">{profileData.name}</h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{profileData.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-center">
                      <div>
                        <div className="text-xl font-black text-zinc-900 dark:text-white">{profileData.postsCount}</div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Posts</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-zinc-900 dark:text-white">
                          {profileData.followersCount >= 1000
                            ? `${(profileData.followersCount / 1000).toFixed(1)}k`
                            : profileData.followersCount}
                        </div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Followers</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-zinc-900 dark:text-white">
                          {profileData.likesReceived >= 1000
                            ? `${(profileData.likesReceived / 1000).toFixed(1)}k`
                            : profileData.likesReceived}
                        </div>
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Likes</div>
                      </div>
                    </div>
                  </div>
                )}
                {myPosts.length === 0 ? (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No posts yet</h3>
                    <p className="text-xs text-zinc-500">Share your health journey with the community!</p>
                  </div>
                ) : (
                  <div className="space-y-4">{myPosts.map(renderPost)}</div>
                )}
              </div>
            )}

            {/* Feed / Events / Groups */}
            {(socialTab === 'feed' || socialTab === 'events' || socialTab === 'groups') && (
              <>
                {postsLoading && <LoadingState />}
                {postsError && <ErrorState message={postsError} onRetry={refetchPosts} />}
                {!postsLoading && !postsError && (postsData?.posts ?? []).map(renderPost)}
                {!postsLoading && !postsError && (postsData?.posts ?? []).length === 0 && (
                  <div className="text-center py-12 text-zinc-400 text-sm">No content yet.</div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SHOP TAB ── */}
        {activeTab === 'shop' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900 dark:bg-zinc-950 rounded-2xl p-5 mb-6 text-white relative overflow-hidden border border-zinc-800">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-400 mb-1">Moriesly AI Shop</div>
                <h2 className="text-xl font-bold mb-2">Curated for {userStats.name}</h2>
                <p className="text-xs text-zinc-400 max-w-[80%]">
                  Based on your recent sugar spikes and macro gaps, we've selected these essentials.
                </p>
              </div>
            </div>

            {shopLoading && <LoadingState />}
            {shopError && <ErrorState message={shopError} onRetry={refetchShop} />}

            {!shopLoading && !shopError && (
              <div className="grid grid-cols-2 gap-4">
                {(shopData?.products ?? []).map((product: ShopProduct) => {
                  const isPurchased = purchasedIds.has(product.id);
                  const displayPrice =
                    typeof product.price === 'number'
                      ? `${product.currency ?? '$'}${product.price.toFixed(2)}`
                      : String(product.price);

                  return (
                    <div key={product.id} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm border border-zinc-100 dark:border-zinc-800 group">
                      <div className="h-32 overflow-hidden relative bg-zinc-100">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-zinc-900">
                          {product.brand}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.tags.map((tag) => (
                            <span key={tag} className="text-[9px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1 leading-tight">{product.name}</h3>
                        <div className="flex items-start gap-1.5 mb-3">
                          <div className="w-3 h-3 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mt-0.5 shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                          </div>
                          <p className="text-[10px] text-zinc-500 italic leading-tight">{product.reason}</p>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-sm font-black text-zinc-900 dark:text-white">{displayPrice}</span>
                          <button
                            onClick={() => !isPurchased && handleBuy(product.id)}
                            disabled={isPurchased}
                            className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isPurchased ? 'bg-emerald-500 text-white' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-brand-600'}`}
                          >
                            {isPurchased ? <span className="text-[10px] font-bold uppercase px-1">Owned</span> : <ShoppingBag className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!shopLoading && !shopError && (shopData?.products ?? []).length === 0 && (
              <div className="text-center py-12 text-zinc-400 text-sm">No products available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreScreen;
