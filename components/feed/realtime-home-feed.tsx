"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { CreatePostCard } from "@/components/feed/create-post-card";
import { FeedPost, FeedPostData } from "@/components/feed/feed-post";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  MapPin,
  Clock,
  Compass,
  CalendarDays,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RealtimeHomeFeedProps {
  initialPosts: FeedPostData[];
  currentUserId: string;
  currentUserProfile: {
    id: string;
    username: string | null;
    full_name?: string | null;
    display_name?: string | null;
    avatar_url: string | null;
  } | null;
  currentUserRole?: string;
  upcomingEvents?: Array<{
    id: string;
    title: string;
    location_name?: string | null;
    start_time?: string | null;
    category?: string | null;
  }>;
}

export function RealtimeHomeFeed({
  initialPosts,
  currentUserId,
  currentUserProfile,
  currentUserRole = "USER",
  upcomingEvents = [],
}: RealtimeHomeFeedProps) {
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // Smart friendly name formatter: avoids slicing names like "E e e do lo" into single letter "E"
  const getFriendlyName = () => {
    const raw =
      currentUserProfile?.display_name?.trim() ||
      currentUserProfile?.full_name?.trim() ||
      currentUserProfile?.username?.trim() ||
      "Explorer";
    const firstWord = raw.split(/\s+/)[0] || raw;
    if (firstWord.length <= 2 && raw.length > 2) {
      return raw.length <= 16 ? raw : currentUserProfile?.username || raw.slice(0, 14);
    }
    return firstWord;
  };

  const [posts, setPosts] = useState<FeedPostData[]>(initialPosts);
  const [activeFilter, setActiveFilter] = useState<"all" | "media">("all");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newPostNotice, setNewPostNotice] = useState<number>(0);

  // Synchronize initial posts if changed from server
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const fetchLatestPostsQuietly = useCallback(async () => {
    try {
      const res = await fetch("/api/posts?limit=30", { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPosts(json.data);
      }
    } catch {
      // ignore transient network errors
    }
  }, []);

  // Auto-sync on mount & visibility change so Home feed is always fresh
  useEffect(() => {
    fetchLatestPostsQuietly();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchLatestPostsQuietly();
      }
    };
    const onRealtimeNotif = () => {
      fetchLatestPostsQuietly();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mingle:realtime-notification", onRealtimeNotif);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mingle:realtime-notification", onRealtimeNotif);
    };
  }, [fetchLatestPostsQuietly]);

  // Supabase Realtime Channel
  useEffect(() => {
    const supabase = createClient();

    // 1. Listen for broadcast events from peer clients
    const broadcastChannel = supabase.channel("realtime:home-feed");

    broadcastChannel
      .on("broadcast", { event: "new_post" }, (payload) => {
        const newPost = payload.payload as FeedPostData;
        if (newPost && newPost.id) {
          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
          });
        }
      })
      .on("broadcast", { event: "delete_post" }, (payload) => {
        const { postId } = payload.payload;
        if (postId) {
          setPosts((prev) => prev.filter((p) => p.id !== postId));
        }
      })
      .on("broadcast", { event: "like_update" }, (payload) => {
        const { postId, likeCount, userId, action } = payload.payload || {};
        if (postId) {
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== postId) return p;
              const isMe = userId === currentUserId;
              return {
                ...p,
                like_count: likeCount,
                liked: isMe ? action === "like" : p.liked,
              };
            })
          );
        }
      })
      .subscribe();

    // 2. Listen for Postgres changes on posts table
    const dbChangesChannel = supabase
      .channel("public:posts:changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const insertedPostId = payload.new.id;
          setPosts((prev) => {
            if (prev.some((p) => p.id === insertedPostId)) return prev;
            fetchPostDetails(insertedPostId);
            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const deletedPostId = payload.old.id;
          if (deletedPostId) {
            setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
          }
        }
      )
      .subscribe();

    async function fetchPostDetails(postId: string) {
      try {
        const res = await fetch("/api/posts?limit=5", { cache: "no-store" });
        const json = await res.json();
        if (json.success && json.data) {
          const found = json.data.find((p: FeedPostData) => p.id === postId);
          if (found) {
            setPosts((prev) => {
              if (prev.some((p) => p.id === found.id)) return prev;
              return [found, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch inserted post details:", err);
      }
    }

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChangesChannel);
    };
  }, [currentUserId]);

  const handleOptimisticPostCreated = (newPost: FeedPostData) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleLikeToggled = (postId: string, liked: boolean, likeCount: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, liked, like_count: likeCount } : p))
    );
  };

  const refreshFeed = async () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/posts?limit=30", { cache: "no-store" });
        const json = await res.json();
        if (json.success && json.data) {
          setPosts(json.data);
          setNewPostNotice(0);
        }
      } catch (err) {
        console.error("Refresh feed error:", err);
      }
    });
  };

  // Filtered posts
  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "media") {
      const hasMedia =
        (post.media_urls && post.media_urls.length > 0) ||
        (post.post_media && post.post_media.length > 0);
      if (!hasMedia) return false;
    }

    if (locationFilter) {
      if (!post.location_name?.toLowerCase().includes(locationFilter.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const availableLocations = Array.from(
    new Set(posts.map((p) => p.location_name).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-3 sm:space-y-4 pb-16 sm:pb-8">
      {/* ── Sleek Compact Community Header (Mobile & Tablet) ── */}
      <div className="lg:hidden relative overflow-hidden rounded-2xl sm:rounded-3xl px-4 py-3.5 border border-border/60 dark:border-white/10 shadow-sm bg-gradient-to-br from-slate-900 via-rose-950 to-orange-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,94,58,0.32),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,51,102,0.22),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          {/* Row 1: Greeting + Live Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/80 mb-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span>Sorsogon Feed</span>
                <span className="text-white/40">•</span>
                <span className="text-white/65">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                {getGreeting()},{" "}
                <span className="bg-gradient-to-r from-orange-300 via-rose-200 to-pink-200 bg-clip-text text-transparent">
                  {getFriendlyName()}
                </span>{" "}
                👋
              </h1>
            </div>

            <Link
              href="/explore"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/20 text-xs font-semibold text-white transition-all"
            >
              <Compass className="h-3.5 w-3.5 text-orange-300" />
              <span>Map &amp; Spots</span>
            </Link>
          </div>

          {/* Row 2: Quick Happenings & Upcoming Events Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {upcomingEvents.slice(0, 2).map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="inline-flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold border border-emerald-400/30 text-emerald-100 shrink-0 transition-all"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="max-w-[140px] truncate">{ev.title}</span>
              </Link>
            ))}
            <Link
              href="/events"
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold border border-white/15 text-white/95 shrink-0 transition-all"
            >
              <CalendarDays className="h-3 w-3 text-rose-300" />
              <span>Events</span>
            </Link>
            <Link
              href="/explore?q=Food"
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold border border-white/15 text-white/95 shrink-0 transition-all"
            >
              <span>🍔</span>
              <span>Food &amp; Cafes</span>
            </Link>
            <Link
              href="/explore?q=Beach"
              className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold border border-white/15 text-white/95 shrink-0 transition-all"
            >
              <span>🌊</span>
              <span>Beaches</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Create Post Composer (Compact by default, expands when clicked) */}
      <CreatePostCard
        profile={currentUserProfile}
        userId={currentUserId}
        onPostCreated={handleOptimisticPostCreated}
      />

      {/* Feed Filters & Controls */}
      <div className="flex items-center justify-between gap-2 p-1 rounded-2xl bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-border/70 dark:border-white/10 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`h-8 px-3 text-xs rounded-xl font-bold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeFilter === "all"
                ? "bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Latest</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {posts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("media")}
            className={`h-8 px-3 text-xs rounded-xl font-bold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeFilter === "media"
                ? "bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Photos</span>
          </button>

          {availableLocations.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`h-8 px-2.5 text-xs rounded-xl font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  locationFilter
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[96px] truncate">{locationFilter || "Area"}</span>
                <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-52 max-h-60 overflow-y-auto rounded-2xl"
              >
                <DropdownMenuItem
                  onClick={() => setLocationFilter(null)}
                  className="text-xs font-semibold cursor-pointer"
                >
                  All Sorsogon
                </DropdownMenuItem>
                {availableLocations.map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => setLocationFilter(loc)}
                    className="text-xs cursor-pointer"
                  >
                    {loc}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {locationFilter && (
            <button
              type="button"
              onClick={() => setLocationFilter(null)}
              className="h-6 w-6 rounded-full bg-muted hover:bg-muted/80 inline-flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              title="Clear location filter"
              aria-label="Clear location filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={refreshFeed}
          disabled={isPending}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
          title="Refresh feed"
          aria-label="Refresh feed"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-primary" : ""}`} />
        </button>
      </div>

      {/* Floating Notice when new posts arrive */}
      {newPostNotice > 0 && (
        <div className="flex justify-center sticky top-16 z-20">
          <button
            type="button"
            onClick={refreshFeed}
            className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-1.5 animate-bounce"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {newPostNotice} new {newPostNotice === 1 ? "post" : "posts"} available • Tap to view
          </button>
        </div>
      )}

      {/* Feed Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-3">
          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-bold text-foreground">
              {locationFilter || activeFilter !== "all"
                ? "No posts match this filter"
                : "No community posts yet"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {locationFilter || activeFilter !== "all"
                ? "Try clearing filters to see all community updates."
                : "Be the first to share an update, hangout, or photo in Sorsogon!"}
            </p>
          </div>
          {(locationFilter || activeFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveFilter("all");
                setLocationFilter(null);
              }}
              className="text-xs rounded-full h-8"
            >
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredPosts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onPostDeleted={handlePostDeleted}
              onLikeToggled={handleLikeToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
