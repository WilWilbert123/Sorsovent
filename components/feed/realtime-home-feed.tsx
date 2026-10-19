"use client";

import { useState, useEffect, useTransition } from "react";
import { CreatePostCard } from "@/components/feed/create-post-card";
import { FeedPost, FeedPostData } from "@/components/feed/feed-post";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  MapPin,
  Clock,
  Filter,
  TreePine,
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
    display_name?: string | null;
    avatar_url: string | null;
  } | null;
  currentUserRole?: string;
}

export function RealtimeHomeFeed({
  initialPosts,
  currentUserId,
  currentUserProfile,
  currentUserRole = "USER",
}: RealtimeHomeFeedProps) {
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
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
          // Check if already in state
          setPosts((prev) => {
            if (prev.some((p) => p.id === insertedPostId)) return prev;
            // Fetch the fully populated post from API
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
        const res = await fetch("/api/posts?limit=5");
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
  }, []);

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
        const res = await fetch("/api/posts?limit=30");
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
    <div className="space-y-4 pb-16 sm:pb-8">
      {/* ── Modern Premium Hero Header ── */}
      <div className="md:hidden relative overflow-hidden rounded-3xl p-5 border border-border/60 dark:border-white/10 shadow-lg bg-gradient-to-br from-slate-900 via-rose-950 to-orange-950 text-white">
        {/* Ambient radial lighting meshes */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,94,58,0.35),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,51,102,0.25),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 space-y-3">
          {/* Top Live Status Bar */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white/95 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>Sorsogon Community</span>
            </div>

            <span className="text-[11px] font-semibold text-white/60 tracking-wider uppercase">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>

          {/* Greeting & Headline */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
              {getGreeting()}, <span className="bg-gradient-to-r from-orange-400 via-rose-300 to-pink-300 bg-clip-text text-transparent">{currentUserProfile?.display_name?.split(" ")[0] || currentUserProfile?.username || "Explorer"}</span> 👋
            </h2>
            <p className="text-xs text-white/75 leading-relaxed mt-0.5">
              Connect with locals and discover what's happening around you.
            </p>
          </div>

          {/* Interactive Quick Discovery Tags */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar">
            <a
              href="/places"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-semibold border border-white/20 text-white shadow-2xs transition-all shrink-0"
            >
              <TreePine className="h-3.5 w-3.5 text-emerald-300" />
              <span>Eco Parks</span>
            </a>
            <a
              href="/places?category=beaches"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-semibold border border-white/20 text-white shadow-2xs transition-all shrink-0"
            >
              <span>🌊</span>
              <span>Beaches</span>
            </a>
            <a
              href="/places?category=cafes"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-semibold border border-white/20 text-white shadow-2xs transition-all shrink-0"
            >
              <span>☕</span>
              <span>Cafes</span>
            </a>
            <a
              href="/events"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-3 py-1.5 text-xs font-semibold border border-white/20 text-white shadow-2xs transition-all shrink-0"
            >
              <span>🎉</span>
              <span>Events</span>
            </a>
          </div>
        </div>
      </div>

      {/* Create Post Composer */}
      <CreatePostCard
        profile={currentUserProfile}
        userId={currentUserId}
        onPostCreated={handleOptimisticPostCreated}
      />

      {/* Feed Filters & Controls */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-border/70 dark:border-white/10 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFilter("all")}
            className={`h-8 px-3.5 text-xs rounded-xl font-bold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeFilter === "all"
                ? "bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Latest</span>
          </button>

          <button
            onClick={() => setActiveFilter("media")}
            className={`h-8 px-3.5 text-xs rounded-xl font-bold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeFilter === "media"
                ? "bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Photos</span>
          </button>

          {availableLocations.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`h-8 px-3 text-xs rounded-xl font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  locationFilter
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{locationFilter || "Filter Area"}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 max-h-60 overflow-y-auto rounded-2xl">
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
        </div>

        <button
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
            onClick={refreshFeed}
            className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-1.5 animate-bounce"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {newPostNotice} new {newPostNotice === 1 ? "post" : "posts"} available • Click to view
          </button>
        </div>
      )}

      {/* Feed Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/80 bg-card/40 space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              {locationFilter || activeFilter !== "all"
                ? "No posts found for this filter"
                : "No posts yet"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {locationFilter || activeFilter !== "all"
                ? "Try clearing filters to see all community updates."
                : "Be the first to share an update, festival news, or community photo in Sorsogon!"}
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
        <div className="space-y-4">
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
