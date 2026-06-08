import React, { useCallback, useEffect, useState, useRef } from "react";
import { UserProfile, LedgerState, HistoryItem } from "../types";
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
  Send,
  ImagePlus,
  MoreVertical,
  Trash2,
  X,
  Reply,
  ArrowLeft,
  CopyCheck,
} from "lucide-react";

import * as api from "../services/api";
import type {
  NewsArticle,
  SocialPost,
  SocialComment,
  ShopProduct,
  LeaderboardEntry,
} from "../services/api";

import GroupChatPanel from "./GroupChatPanel";
import CreateGroupChatPanel from "./CreateGroupChatPanel";

interface ExploreScreenProps {
  userStats: UserProfile;
  ledger: LedgerState;
  history: HistoryItem[];
  onSetBackHandler?: (handler: (() => boolean) | null) => void;
}

type SocialCommentWithReply = SocialComment & {
  replyToCommentId?: string | null;
  replyToUserId?: string | null;
  replyToName?: string | null;
};

type ReplyTarget = {
  postId: string;
  /**
   * Root/top-level comment id. Replies are grouped under this id so the thread
   * stays flat and readable, even when replying to another reply.
   */
  rootCommentId: string;
  /**
   * Exact comment that the user clicked Reply on. Backend should use this to
   * resolve replyToName/replyToUserId securely.
   */
  targetCommentId: string;
  authorName: string;
};

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

const TOP_COMMENT_LIMIT = 2;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function getInitial(name?: string | null) {
  return name?.charAt(0)?.toUpperCase() ?? "U";
}

function sortTopComments(comments: SocialCommentWithReply[]) {
  return [...comments].sort((a, b) => b.likes - a.likes);
}

function sortNewestComments(comments: SocialCommentWithReply[]) {
  return [...comments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function normalizeMentionName(name?: string | null) {
  return name?.trim().replace(/^@+/, "") ?? "";
}

function getRootCommentId(
  comment: SocialCommentWithReply,
  byId: Map<string, SocialCommentWithReply>,
) {
  if (!comment.parentId) return comment.id;

  let rootId = comment.parentId;
  let guard = 0;

  while (guard < 20) {
    const parent = byId.get(rootId);
    if (!parent?.parentId) break;
    rootId = parent.parentId;
    guard += 1;
  }

  return rootId;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ExploreScreen: React.FC<ExploreScreenProps> = ({
  userStats,
  onSetBackHandler,
}) => {
  const [activeTab, setActiveTab] = useState<"news" | "social" | "shop">(
    "news",
  );

  const [socialTab, setSocialTab] = useState<
    "feed" | "events" | "groups" | "privateChats" | "profile" | "leaderboard"
  >("feed");

  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [rsvpPosts, setRsvpPosts] = useState<Set<string>>(new Set());
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<api.SocialPost | null>(null);
  const [commentPreviews, setCommentPreviews] = useState<
    Record<string, SocialCommentWithReply[]>
  >({});
  const [fullComments, setFullComments] = useState<
    Record<string, SocialCommentWithReply[]>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [commentImages, setCommentImages] = useState<
    Record<string, string | null>
  >({});
  const [replyingTo, setReplyingTo] = useState<{
    postId: string;
    rootCommentId: string;
    targetCommentId: string;
    authorName: string;
  } | null>(null);
  const [loadingComments, setLoadingComments] = useState<Set<string>>(
    new Set(),
  );
  const [submittingComments, setSubmittingComments] = useState<Set<string>>(
    new Set(),
  );
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentCountOverrides, setCommentCountOverrides] = useState<
    Record<string, number>
  >({});
  const [shareStatusPostId, setShareStatusPostId] = useState<string | null>(
    null,
  );
  const [activeActionPostId, setActiveActionPostId] = useState<string | null>(
    null,
  );
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activePostMenu, setActivePostMenu] = useState<string | null>(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | null>(
    null,
  );

  // Undo Toast State
  const [commentToast, setCommentToast] = useState<{
    postId: string;
    comment: SocialCommentWithReply;
    timeout: NodeJS.Timeout;
  } | null>(null);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!onSetBackHandler) return;

    if (selectedPost) {
      onSetBackHandler(() => {
        setSelectedPost(null);
        setReplyingTo(null);
        return true;
      });
    } else if (activeTab !== "news") {
      onSetBackHandler(() => {
        setActiveTab("news");
        return true;
      });
    } else {
      onSetBackHandler(null);
    }

    return () => {
      onSetBackHandler(null);
    };
  }, [activeTab, selectedPost, onSetBackHandler]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Hasilnya berupa string Base64
        setNewPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── News ─────────────────────────────────────────────────────────────────
  const {
    data: newsData,
    loading: newsLoading,
    error: newsError,
    refetch: refetchNews,
  } = useFetch(() => api.getNews({ limit: 20 }), []);

  // ── Social Feed ──────────────────────────────────────────────────────────
  const feedType = socialTab === "events" ? "event" : "all";

  const shouldFetchPosts =
    socialTab === "feed" || socialTab === "events" || socialTab === "profile";

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
    if ((!newPostContent.trim() && !newPostImage) || isPosting) return;

    setIsPosting(true);

    try {
      await api.createPost({
        content: newPostContent,
        type: "post",
        mediaUrl: newPostImage || undefined,
      });

      setNewPostContent("");
      setNewPostImage(null);
      refetchPosts();
    } catch (e: any) {
      console.error("Failed to create post:", e.message);
    } finally {
      setIsPosting(false);
    }
  }, [newPostContent, newPostImage, isPosting, refetchPosts]);

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
        console.error("Failed to like:", e.message);
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
        console.error("Failed to RSVP:", e.message);
      }
    },
    [refetchPosts],
  );

  const handleJoinGroup = useCallback(
    async (postId: string) => {
      try {
        const res = await joinGroup(postId);

        setJoinedGroups((prev) => {
          const next = new Set(prev);

          if (res.joined) next.add(postId);
          else next.delete(postId);

          return next;
        });

        refetchPosts();
      } catch (e: any) {
        console.error("Failed to join group:", e.message);
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
        console.error("Failed to purchase:", e.message);
      }
    },
    [refetchPurchases],
  );

  const getPostCommentCount = useCallback(
    (post: SocialPost) => commentCountOverrides[post.id] ?? post.comments ?? 0,
    [commentCountOverrides],
  );

  const loadCommentPreview = useCallback(async (postId: string) => {
    try {
      const res = await api.getPostComments(postId, {
        sort: "top",
        limit: TOP_COMMENT_LIMIT,
      });

      setCommentPreviews((prev) => ({
        ...prev,
        [postId]: sortTopComments(res.comments).slice(0, TOP_COMMENT_LIMIT),
      }));
    } catch (e: any) {
      console.error("Failed to load top comments:", e.message);
      setCommentPreviews((prev) => ({
        ...prev,
        [postId]: [],
      }));
    }
  }, []);

  useEffect(() => {
    const visiblePosts = postsData?.posts ?? [];

    visiblePosts.forEach((post) => {
      if (commentPreviews[post.id] !== undefined) return;
      void loadCommentPreview(post.id);
    });
  }, [postsData?.posts, commentPreviews, loadCommentPreview]);

  const loadFullComments = useCallback(async (postId: string) => {
    setLoadingComments((prev) => new Set(prev).add(postId));

    try {
      const res = await api.getPostComments(postId, {
        sort: "newest",
      });

      setFullComments((prev) => ({
        ...prev,
        [postId]: res.comments,
      }));

      setCommentCountOverrides((prev) => ({
        ...prev,
        [postId]: res.comments.length,
      }));
    } catch (e: any) {
      console.error("Failed to load comments:", e.message);
    } finally {
      setLoadingComments((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, []);

  const handleOpenComments = useCallback(
    async (post: SocialPost) => {
      setSelectedPost(post);
      await loadFullComments(post.id);
    },
    [loadFullComments],
  );

  const handleSharePost = useCallback(async (post: SocialPost) => {
    const postUrl = `${window.location.origin}${window.location.pathname}#post-${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.authorName}`,
          text: post.content,
          url: postUrl,
        });
      } else {
        await navigator.clipboard.writeText(postUrl);
        setShareStatusPostId(post.id);
        window.setTimeout(() => setShareStatusPostId(null), 1600);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Failed to share post:", e.message);
      }
    }
  }, []);

  const handleCommentImageChange = useCallback(
    async (postId: string, file?: File | null) => {
      if (!file) return;

      try {
        const dataUrl = await fileToDataUrl(file);
        setCommentImages((prev) => ({
          ...prev,
          [postId]: dataUrl,
        }));
      } catch (e: any) {
        console.error("Failed to attach comment image:", e.message);
      }
    },
    [],
  );

  const handleCreateComment = useCallback(
    async (postId: string) => {
      const content = commentDrafts[postId]?.trim() ?? "";
      const imageBase64 = commentImages[postId] ?? null;

      const parentId =
        replyingTo?.postId === postId ? replyingTo.rootCommentId : null;

      const replyToCommentId =
        replyingTo?.postId === postId ? replyingTo.targetCommentId : null;

      if ((!content && !imageBase64) || submittingComments.has(postId)) return;

      setSubmittingComments((prev) => new Set(prev).add(postId));

      try {
        const res = await api.createPostComment(postId, {
          content,
          parentId,
          replyToCommentId,
          imageBase64,
        });

        const commentWithReplyMeta: SocialComment = {
          ...res.comment,
          parentId: res.comment.parentId ?? parentId,
          replyToCommentId: res.comment.replyToCommentId ?? replyToCommentId,
          replyToName:
            res.comment.replyToName ?? replyingTo?.authorName ?? null,
        };

        setFullComments((prev) => ({
          ...prev,
          [postId]: sortNewestComments([
            commentWithReplyMeta,
            ...(prev[postId] ?? []),
          ]),
        }));

        setCommentPreviews((prev) => {
          const merged = [commentWithReplyMeta, ...(prev[postId] ?? [])];

          return {
            ...prev,
            [postId]: sortTopComments(merged).slice(0, TOP_COMMENT_LIMIT),
          };
        });

        setCommentCountOverrides((prev) => ({
          ...prev,
          [postId]:
            (prev[postId] ??
              selectedPost?.comments ??
              postsData?.posts?.find((post) => post.id === postId)?.comments ??
              0) + 1,
        }));

        setCommentDrafts((prev) => ({
          ...prev,
          [postId]: "",
        }));

        setCommentImages((prev) => ({
          ...prev,
          [postId]: null,
        }));

        setReplyingTo(null);
      } catch (e: any) {
        console.error("Failed to create comment:", e.message);
      } finally {
        setSubmittingComments((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      }
    },
    [
      commentDrafts,
      commentImages,
      postsData?.posts,
      replyingTo,
      selectedPost?.comments,
      submittingComments,
    ],
  );

  const patchCommentLike = useCallback(
    (postId: string, commentId: string, liked: boolean) => {
      const patch = (comments: SocialCommentWithReply[]) =>
        comments.map((comment) => {
          if (comment.id !== commentId) return comment;

          const wasLiked = comment.likedByMe ?? likedComments.has(commentId);
          const delta = liked === wasLiked ? 0 : liked ? 1 : -1;

          return {
            ...comment,
            likedByMe: liked,
            likes: Math.max(0, comment.likes + delta),
          };
        });

      setFullComments((prev) => ({
        ...prev,
        [postId]: patch(prev[postId] ?? []),
      }));

      setCommentPreviews((prev) => ({
        ...prev,
        [postId]: sortTopComments(patch(prev[postId] ?? [])).slice(
          0,
          TOP_COMMENT_LIMIT,
        ),
      }));

      setLikedComments((prev) => {
        const next = new Set(prev);
        if (liked) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
    },
    [likedComments],
  );

  const handleCommentLike = useCallback(
    async (postId: string, commentId: string) => {
      try {
        const res = await api.toggleCommentLike(commentId);
        patchCommentLike(postId, commentId, res.liked);
      } catch (e: any) {
        console.error("Failed to like comment:", e.message);
      }
    },
    [patchCommentLike],
  );

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteSocialPost(postToDelete);
      refetchPosts(); // Refresh feed
      refetchProfile(); // Refresh profile count
    } catch (e: any) {
      console.error("Gagal menghapus postingan:", e);
    } finally {
      setIsDeleting(false);
      setPostToDelete(null);
    }
  };

  const handleInitiateDeleteComment = (
    postId: string,
    comment: SocialCommentWithReply,
  ) => {
    setActiveCommentMenu(null); // Tutup menu

    // 1. Optimistic UI: Hapus langsung dari tampilan FE
    setFullComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? []).filter((c) => c.id !== comment.id),
    }));

    // Sesuaikan hitungan komentar di tampilan post
    setCommentCountOverrides((prev) => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] ?? 1) - 1),
    }));

    // 2. Set Timer untuk menunda aksi ke Backend (memberi waktu untuk Undo)
    const timeout = setTimeout(async () => {
      try {
        await api.deletePostComment(postId, comment.id);
      } catch (e: any) {
        console.error("Gagal menghapus komentar permanen:", e.message);
      }
      setCommentToast(null); // Hilangkan toast setelah dieksekusi
    }, 4000); // 4 detik waktu untuk undo

    // 3. Tampilkan Toast Undo
    setCommentToast({ postId, comment, timeout });
  };

  const handleUndoDeleteComment = () => {
    if (commentToast) {
      clearTimeout(commentToast.timeout); // Batalkan API Delete

      // Kembalikan komentar ke state UI
      setFullComments((prev) => {
        const restored = [
          ...(prev[commentToast.postId] ?? []),
          commentToast.comment,
        ];
        return {
          ...prev,
          [commentToast.postId]: sortNewestComments(restored),
        };
      });

      // Kembalikan hitungan
      setCommentCountOverrides((prev) => ({
        ...prev,
        [commentToast.postId]: (prev[commentToast.postId] ?? 0) + 1,
      }));

      setCommentToast(null); // Tutup toast
    }
  };

  const renderCommentComposer = (postId: string) => {
    const isSubmitting = submittingComments.has(postId);
    const draft = commentDrafts[postId] ?? "";
    const imagePreview = commentImages[postId];

    return (
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl p-4">
        {replyingTo?.postId === postId && (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-brand-300">
              <Reply size={14} />
              Replying to @{normalizeMentionName(replyingTo.authorName)}
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {imagePreview && (
          <div className="mb-3 relative w-28 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <img
              src={imagePreview}
              alt="Comment attachment preview"
              className="h-24 w-full object-cover"
            />
            <button
              onClick={() =>
                setCommentImages((prev) => ({
                  ...prev,
                  [postId]: null,
                }))
              }
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-black">
            {getInitial(userStats.name)}
          </div>

          <div className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2">
            <textarea
              value={draft}
              onChange={(event) =>
                setCommentDrafts((prev) => ({
                  ...prev,
                  [postId]: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  void handleCreateComment(postId);
                }
              }}
              placeholder="Write a comment..."
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
            />

            <div className="flex items-center justify-between pt-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-black text-zinc-500 hover:text-brand-500 dark:text-zinc-400">
                <ImagePlus size={16} />
                Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    void handleCommentImageChange(
                      postId,
                      event.target.files?.[0],
                    );
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              <button
                onClick={() => void handleCreateComment(postId)}
                disabled={isSubmitting || (!draft.trim() && !imagePreview)}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-brand-200"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <Send size={15} />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentItem = (
    comment: SocialCommentWithReply,
    postId: string,
    isReply = false,
    rootCommentId?: string,
  ) => {
    const liked = comment.likedByMe ?? likedComments.has(comment.id);
    const replyToName = normalizeMentionName(comment.replyToName);
    const targetRootCommentId = rootCommentId ?? comment.parentId ?? comment.id;
    const isMyComment = comment.authorName === userStats.name;

    // Handlers untuk Long Press
    const handlePointerDown = () => {
      if (!isMyComment) return;
      longPressTimer.current = setTimeout(() => {
        setActiveCommentMenu(comment.id);
      }, 500); // Tahan 500ms untuk memunculkan menu
    };

    const handlePointerUpOrLeave = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };

    return (
      <div
        key={comment.id}
        className={`flex gap-3 relative ${isReply ? "ml-10 mt-3" : ""}`}
      >
        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-500 flex items-center justify-center text-white text-xs font-black overflow-hidden">
          {comment.authorAvatar ? (
            <img
              src={comment.authorAvatar}
              alt={comment.authorName}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitial(comment.authorName)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 px-4 py-3 select-none transition-colors"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
            style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-black text-zinc-900 dark:text-white">
                {comment.authorName}
              </h4>
              <span className="text-[11px] font-bold text-zinc-400">
                {new Date(comment.createdAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>

            {comment.content && (
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {replyToName && (
                  <span className="mr-1 font-black text-brand-600 dark:text-brand-300">
                    @{replyToName}
                  </span>
                )}
                {comment.content}
              </p>
            )}

            {comment.imageUrl && (
              <img
                src={comment.imageUrl}
                alt="Comment attachment"
                className="mt-3 max-h-80 w-full rounded-2xl object-cover cursor-pointer transition-opacity hover:opacity-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenImage(comment.imageUrl!);
                }}
              />
            )}
          </div>

          {activeCommentMenu === comment.id && (
            <div className="mt-2 flex overflow-hidden rounded-xl border border-red-200 dark:border-red-900/30">
              <button
                onClick={() => handleInitiateDeleteComment(postId, comment)}
                className="flex-1 bg-red-50 dark:bg-red-950/30 py-2.5 text-xs font-black text-red-600 dark:text-red-400 flex items-center justify-center gap-2 transition-colors hover:bg-red-100 dark:hover:bg-red-900/50"
              >
                <Trash2 size={14} /> Hapus Komentar
              </button>
              <button
                onClick={() => setActiveCommentMenu(null)}
                className="bg-zinc-100 dark:bg-zinc-800 px-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="mt-2 flex items-center gap-4 px-2">
            <button
              onClick={() => void handleCommentLike(postId, comment.id)}
              className={`inline-flex items-center gap-1 text-xs font-black transition-colors ${
                liked
                  ? "text-rose-500"
                  : "text-zinc-500 hover:text-rose-500 dark:text-zinc-400"
              }`}
            >
              <Heart size={14} className={liked ? "fill-current" : ""} />
              {comment.likes}
            </button>

            <button
              onClick={() =>
                setReplyingTo({
                  postId,
                  rootCommentId: targetRootCommentId,
                  targetCommentId: comment.id,
                  authorName: comment.authorName,
                })
              }
              className="inline-flex items-center gap-1 text-xs font-black text-zinc-500 hover:text-brand-500 dark:text-zinc-400"
            >
              <Reply size={14} />
              Reply
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentPreview = (post: SocialPost) => {
    const comments = commentPreviews[post.id] ?? [];

    if (comments.length === 0) return null;

    return (
      <div className="mb-4 space-y-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Top comments
          </span>
          <button
            onClick={() => void handleOpenComments(post)}
            className="text-xs font-black text-brand-600 hover:text-brand-700 dark:text-brand-300"
          >
            View all
          </button>
        </div>

        {comments.map((comment) => (
          <button
            key={comment.id}
            onClick={() => void handleOpenComments(post)}
            className="block w-full text-left"
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-500 flex items-center justify-center text-white text-xs font-black overflow-hidden">
                {comment.authorAvatar ? (
                  <img
                    src={comment.authorAvatar}
                    alt={comment.authorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitial(comment.authorName)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="rounded-2xl bg-white dark:bg-zinc-900 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-900 dark:text-white">
                      {comment.authorName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                      <Heart size={11} className="fill-current" />
                      {comment.likes}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
                    {comment.replyToName && (
                      <span className="mr-1 font-black text-brand-600 dark:text-brand-300">
                        @{normalizeMentionName(comment.replyToName)}
                      </span>
                    )}
                    {comment.content || "Shared an image"}
                  </p>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderPost = (post: SocialPost, compact?: boolean) => (
    <article
      id={`post-${post.id}`}
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
              (post.authorName?.charAt(0)?.toUpperCase() ?? "U")
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-zinc-900 dark:text-white">
                {post.authorName}
              </h3>

              {post.type === "event" && (
                <span className="text-[10px] font-black uppercase bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-2 py-1 rounded-full">
                  Event
                </span>
              )}

              {post.type === "group" && (
                <span className="text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-2 py-1 rounded-full">
                  Group
                </span>
              )}

              {post.type === "video" && (
                <span className="text-[10px] font-black uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-1 rounded-full">
                  Video
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>

        {/* --- TOMBOL TITIK 3 UNTUK POSTINGAN SENDIRI --- */}
        {post.authorName === userStats.name && (
          <button
            onClick={() => setActivePostMenu(post.id)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition-colors"
          >
            <MoreVertical size={20} />
          </button>
        )}
      </div>

      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 mb-4 whitespace-pre-line">
        {post.content}
      </p>

      {/* Event Details */}
      {post.type === "event" && post.eventDate && (
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
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {rsvpPosts.has(post.id) ? "Going" : "RSVP"}
          </button>
        </div>
      )}

      {/* Group Details */}
      {post.type === "group" && (
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
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-purple-500 hover:bg-purple-600"
            }`}
          >
            {joinedGroups.has(post.id) ? "Joined" : "Join"}
          </button>
        </div>
      )}

      {/* Video Post */}
      {post.type === "video" && post.videoThumbnail && (
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
      {post.type !== "video" && post.mediaUrl && (
        <img
          src={post.mediaUrl}
          alt="Post media"
          className="w-full rounded-2xl mb-4 object-cover max-h-80 cursor-pointer transition-opacity hover:opacity-90"
          onClick={(e) => {
            e.stopPropagation();
            setFullscreenImage(post.mediaUrl!);
          }}
        />
      )}

      {/* Comment Preview Component */}
      {!compact && renderCommentPreview(post)}

      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <button
            onClick={() => handleLike(post.id)}
            className={`flex items-center gap-2 transition-colors group ${
              likedPosts.has(post.id)
                ? "text-rose-500"
                : "text-zinc-500 dark:text-zinc-400 hover:text-rose-500"
            }`}
          >
            <Heart
              size={18}
              className={likedPosts.has(post.id) ? "fill-current" : ""}
            />
            <span className="text-sm font-bold">{post.likes}</span>
          </button>

          <button
            onClick={() => void handleOpenComments(post)}
            className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-colors"
          >
            <MessageCircle size={18} />
            <span className="text-sm font-bold">
              {getPostCommentCount(post)}
            </span>
          </button>
        </div>

        <button
          onClick={() => void handleSharePost(post)}
          className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-colors"
        >
          {shareStatusPostId === post.id ? (
            <CopyCheck size={18} />
          ) : (
            <Share2 size={18} />
          )}
        </button>
      </div>
    </article>
  );

  return (
    <div className="space-y-6 pb-10 relative">
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
        {(["news", "social", "shop"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-black transition-all capitalize ${
              activeTab === tab
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {tab === "news" && <Newspaper size={16} />}
              {tab === "social" && <Users size={16} />}
              {tab === "shop" && <ShoppingBag size={16} />}

              {tab === "news" ? "News" : tab === "social" ? "Social" : "Shop"}
            </span>
          </button>
        ))}
      </div>

      {/* ── NEWS TAB ── */}
      {activeTab === "news" && (
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
                      {article.source} •{" "}
                      {new Date(article.date).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
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
      {activeTab === "social" && (
        <section className="space-y-5">
          {/* Sub Navigation */}
          <div className="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {(
                [
                  { id: "feed", label: "Home Feed", icon: LayoutList },
                  { id: "events", label: "Events", icon: Calendar },
                  { id: "groups", label: "Group Chat", icon: Users },
                  {
                    id: "privateChats",
                    label: "Add Group",
                    icon: MessageSquare,
                  },
                  { id: "profile", label: "Profile", icon: User },
                  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSocialTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                    socialTab === tab.id
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Create Post */}
          {/* Create Post Area */}
          {(socialTab === "feed" || socialTab === "events") && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 mb-6 shadow-sm">
              <div className="flex gap-3">
                {/* Avatar User */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white font-black shrink-0">
                  {userStats.name.charAt(0).toUpperCase()}
                </div>

                {/* Input Text & Image Preview */}
                <div className="flex-1">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What would you like to share today?"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                    rows={3}
                  />

                  {/* Image Preview Box */}
                  {newPostImage && (
                    <div className="relative mt-3">
                      <img
                        src={newPostImage}
                        alt="Preview"
                        className="w-full rounded-2xl max-h-64 object-cover border border-zinc-200 dark:border-zinc-800"
                      />
                      <button
                        onClick={() => setNewPostImage(null)}
                        className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
                        title="Remove Image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Toolbar Bawah */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      {/* Input file yang disembunyikan */}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 p-2 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors flex items-center gap-2"
                      >
                        <ImagePlus size={20} />
                        <span className="text-sm font-bold">Photo</span>
                      </button>
                    </div>

                    <button
                      onClick={handleCreatePost}
                      disabled={
                        (!newPostContent.trim() && !newPostImage) || isPosting
                      }
                      className="bg-brand-500 text-white text-sm font-black px-6 py-2.5 rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isPosting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Group Chat List + Room */}
          {socialTab === "groups" && (
            <GroupChatPanel
              userStats={userStats}
              refreshKey={groupRefreshKey}
            />
          )}

          {/* Add Group */}
          {socialTab === "privateChats" && (
            <CreateGroupChatPanel
              onCreated={() => {
                setGroupRefreshKey((value) => value + 1);
                setSocialTab("groups");
              }}
            />
          )}

          {/* Leaderboard */}
          {socialTab === "leaderboard" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-4">
                Health Leaderboard
              </h3>

              {lbLoading && <LoadingState />}

              {lbError && <ErrorState message={lbError} onRetry={refetchLb} />}

              {!lbLoading && !lbError && (
                <div className="space-y-3">
                  {(lbData?.leaderboard ?? []).map(
                    (entry: LeaderboardEntry) => (
                      <div
                        key={entry.userId}
                        className={`flex items-center justify-between p-4 rounded-2xl ${
                          entry.isUser
                            ? "bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900"
                            : "bg-zinc-50 dark:bg-zinc-950"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                              entry.rank <= 3
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            }`}
                          >
                            #{entry.rank}
                          </div>

                          <div>
                            <div className="font-black text-zinc-900 dark:text-white">
                              {entry.isUser ? "You" : entry.name}
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

                          {entry.trend === "up" ? (
                            <TrendingUp
                              size={18}
                              className="text-emerald-500"
                            />
                          ) : entry.trend === "down" ? (
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
          {socialTab === "profile" && (
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
                        (profileData.name?.charAt(0)?.toUpperCase() ?? "U")
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
                  <div className="space-y-4">
                    {myPosts.map((post) => renderPost(post))}
                  </div>
                ))}
            </div>
          )}

          {/* Feed / Events / Groups */}
          {(socialTab === "feed" || socialTab === "events") && (
            <div className="space-y-4">
              {postsLoading && <LoadingState />}

              {postsError && (
                <ErrorState message={postsError} onRetry={refetchPosts} />
              )}

              {!postsLoading &&
                !postsError &&
                (postsData?.posts ?? []).map((post) => renderPost(post))}

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
      {activeTab === "shop" && (
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

          {shopError && (
            <ErrorState message={shopError} onRetry={refetchShop} />
          )}

          {!shopLoading && !shopError && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(shopData?.products ?? []).map((product: ShopProduct) => {
                const isPurchased = purchasedIds.has(product.id);

                const displayPrice =
                  typeof product.price === "number"
                    ? `${product.currency ?? "$"}${product.price.toFixed(2)}`
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
                              ? "bg-emerald-500 text-white"
                              : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-brand-600 dark:hover:bg-brand-200"
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

      {/* FULLSCREEN IMAGE MODAL */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white p-2 bg-zinc-800/50 hover:bg-zinc-700/80 rounded-full transition-colors z-10"
            title="Close"
            type="button"
          >
            <X size={24} />
          </button>

          <div
            className="relative w-full h-full flex items-center justify-center overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage}
              alt="Fullscreen Preview"
              className="max-w-full max-h-full object-contain"
              style={{ touchAction: "pinch-zoom" }}
            />
          </div>
        </div>
      )}

      {/* FULL COMMENT PAGE/MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] bg-zinc-50 dark:bg-zinc-950">
          <div className="mx-auto flex h-full max-w-3xl flex-col">
            <div className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-xl px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setSelectedPost(null);
                    setReplyingTo(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm font-black text-zinc-700 dark:text-zinc-200"
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  onClick={() => void handleSharePost(selectedPost)}
                  className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-600 hover:text-brand-500 dark:text-zinc-300"
                >
                  {shareStatusPostId === selectedPost.id ? (
                    <CopyCheck size={18} />
                  ) : (
                    <Share2 size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <div className="mb-5">{renderPost(selectedPost, true)}</div>

              <div className="space-y-5 pb-5">
                {loadingComments.has(selectedPost.id) && <LoadingState />}

                {!loadingComments.has(selectedPost.id) &&
                  (fullComments[selectedPost.id] ?? []).length === 0 && (
                    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
                      <MessageCircle
                        size={28}
                        className="mx-auto mb-3 text-zinc-400"
                      />
                      <h3 className="font-black text-zinc-900 dark:text-white">
                        No comments yet
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Be the first to start the conversation.
                      </p>
                    </div>
                  )}

                {!loadingComments.has(selectedPost.id) &&
                  (() => {
                    const comments = fullComments[selectedPost.id] ?? [];
                    const commentsById = new Map(
                      comments.map((comment) => [comment.id, comment]),
                    );

                    const parentComments = sortNewestComments(
                      comments.filter((comment) => !comment.parentId),
                    );

                    const repliesByParent = comments.reduce<
                      Record<string, SocialCommentWithReply[]>
                    >((acc, comment) => {
                      if (!comment.parentId) return acc;

                      const rootId = getRootCommentId(comment, commentsById);
                      if (rootId === comment.id) return acc;

                      acc[rootId] = acc[rootId] ?? [];
                      acc[rootId].push(comment);
                      return acc;
                    }, {});

                    return parentComments.map((comment) => (
                      <div key={comment.id}>
                        {renderCommentItem(comment, selectedPost.id)}
                        {sortNewestComments(
                          repliesByParent[comment.id] ?? [],
                        ).map((reply) =>
                          renderCommentItem(
                            reply,
                            selectedPost.id,
                            true,
                            comment.id,
                          ),
                        )}
                      </div>
                    ));
                  })()}
              </div>
            </div>

            {renderCommentComposer(selectedPost.id)}
          </div>
        </div>
      )}

      {/* 1. BOTTOM SHEET MENU UNTUK POSTINGAN */}
      {activePostMenu && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                Opsi Postingan
              </h3>
              <button
                onClick={() => setActivePostMenu(null)}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={() => {
                  setPostToDelete(activePostMenu);
                  setActivePostMenu(null);
                }}
                className="w-full flex items-center gap-3 p-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-colors text-left font-bold"
              >
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl">
                  <Trash2 size={18} />
                </div>
                Hapus Postingan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIRMATION MODAL HAPUS POSTINGAN */}
      {postToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
              Hapus Postingan?
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Postingan ini akan dihapus secara permanen dari feed dan tidak
              dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPostToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "Ya, Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TOAST UNDO COMMENT DELETION */}
      {commentToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[105] flex items-center gap-4 bg-zinc-900 dark:bg-white px-5 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-5 fade-in">
          <span className="text-sm font-bold text-white dark:text-zinc-900">
            Deleted
          </span>
          <div className="w-px h-4 bg-zinc-700 dark:bg-zinc-200" />
          <button
            onClick={handleUndoDeleteComment}
            className="text-sm font-black text-brand-400 hover:text-brand-300 dark:text-brand-600 flex items-center gap-1.5"
          >
            <Reply size={14} className="scale-x-[-1]" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
};

export default ExploreScreen;
