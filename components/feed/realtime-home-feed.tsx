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
    <div className="space-y-4">
      {/* ── Mobile Greeting Hero (Harmonized with Mingle coral-rose logo) ── */}
      <div className="md:hidden relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-xl shadow-rose-500/25">
        {/* Decorative ambient blobs */}
        <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-4 w-24 h-24 rounded-full bg-white/15 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="h-5 w-5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <MapPin className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-white/95 tracking-wide uppercase">Sorsogon</span>
          </div>
          <h2 className="text-xl font-bold leading-tight mb-0.5">
            {getGreeting()}, {currentUserProfile?.display_name?.split(" ")[0] || currentUserProfile?.username || "Explorer"} 👋
          </h2>
          <p className="text-xs text-white/85 leading-relaxed">
            What's happening around you today?
          </p>

          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-white/25 shadow-2xs shrink-0">
              <TreePine className="h-3 w-3" /> Eco Parks
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-white/25 shadow-2xs shrink-0">
              🌊 Beaches
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-white/25 shadow-2xs shrink-0">
              ☕ Cafes
            </span>
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
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-card/85 dark:bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-2xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFilter("all")}
            className={`h-7.5 px-3.5 text-xs rounded-full font-semibold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeFilter === "all"
                ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Latest</span>
          </button>

          <button
            onClick={() => setActiveFilter("media")}
            className={`h-7.5 px-3.5 text-xs rounded-full font-semibold transition-all inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeFilter === "media"
                ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Photos</span>
          </button>

          {availableLocations.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`h-7.5 px-3 text-xs rounded-full font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  locationFilter
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{locationFilter || "Filter Area"}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 max-h-56 overflow-y-auto">
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
          className="h-8.5 w-8.5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-card/85 dark:bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-2xs hover:bg-muted/80 transition-all shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
          title="Refresh feed"
          aria-label="Refresh feed"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
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
