"use client";

import {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FEED_PAGE_SIZE = 10;

export interface FeaturedSorsogonPlace {
  id: string;
  name: string;
  municipality: string;
  category: string;
  tagline: string;
  image: string;
  query: string;
}

export const FEATURED_SORSOGON_PLACES: FeaturedSorsogonPlace[] = [
  {
    id: "subic-pink-beach",
    name: "Subic Pink Sand Beach",
    municipality: "Matnog, Sorsogon",
    category: "Coastal Destination",
    tagline: "Crushed red coral sands and crystal-clear island lagoon waters.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format&fit=crop&q=80",
    query: "Subic Beach",
  },
  {
    id: "bulusan-lake",
    name: "Bulusan Volcano Natural Park",
    municipality: "Bulusan, Sorsogon",
    category: "Eco Sanctuary",
    tagline: "Emerald crater lake surrounded by lush rainforest trails and kayaking.",
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&auto=format&fit=crop&q=80",
    query: "Bulusan Lake",
  },
  {
    id: "gubat-surfing",
    name: "Rizal Surfing Coast",
    municipality: "Gubat, Sorsogon",
    category: "Surf & Coast",
    tagline: "Pacific swell breaks, beachfront cafes, and laid-back coastal community.",
    image:
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=900&auto=format&fit=crop&q=80",
    query: "Gubat Surfing",
  },
  {
    id: "rompeolas-baywalk",
    name: "Rompeolas Baywalk & Pier",
    municipality: "Sorsogon City",
    category: "City Waterfront",
    tagline: "Golden sunset promenade, sea breeze dining, and evening acoustic sessions.",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&auto=format&fit=crop&q=80",
    query: "Rompeolas",
  },
  {
    id: "barcelona-ruins",
    name: "Barcelona Heritage Park & Church",
    municipality: "Barcelona, Sorsogon",
    category: "Historic Landmark",
    tagline: "19th-century coral stone architecture facing the Pacific shoreline.",
    image:
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&auto=format&fit=crop&q=80",
    query: "Barcelona",
  },
  {
    id: "donsol-sanctuary",
    name: "Donsol Whale Shark Coast",
    municipality: "Donsol, Sorsogon",
    category: "Marine Sanctuary",
    tagline: "World-renowned marine conservation bay and firefly river cruises.",
    image:
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=900&auto=format&fit=crop&q=80",
    query: "Donsol",
  },
];

interface RealtimeHomeFeedProps {
  initialPosts: FeedPostData[];
  initialHasMore?: boolean;
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
  initialHasMore = false,
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

  const getFriendlyName = () => {
    const raw =
      currentUserProfile?.display_name?.trim() ||
      currentUserProfile?.full_name?.trim() ||
      currentUserProfile?.username?.trim() ||
      "Explorer";
    const firstWord = raw.split(/\s+/)[0] || raw;
    if (firstWord.length <= 2 && raw.length > 2) {
      return raw.length <= 16
        ? raw
        : currentUserProfile?.username || raw.slice(0, 14);
    }
    return firstWord;
  };

  const [posts, setPosts] = useState<FeedPostData[]>(initialPosts);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "media">("all");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newPostNotice, setNewPostNotice] = useState<number>(0);

  // Track which posts the user had ALREADY seen in previous sessions (Facebook-style Unseen First ordering)
  const [initialSeenIds, setInitialSeenIds] = useState<Set<string>>(new Set());
  const sessionSeenIdsRef = useRef<Set<string>>(new Set());
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `mingle_seen_posts_${currentUserId}`;

  // Load previously seen post IDs on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const set = new Set(parsed);
          setInitialSeenIds(set);
          sessionSeenIdsRef.current = new Set(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  // Helper to mark a post as seen when the user views it in the viewport
  const markPostSeen = useCallback(
    (postId: string) => {
      if (sessionSeenIdsRef.current.has(postId)) return;
      sessionSeenIdsRef.current.add(postId);
      try {
        // Keep last 200 seen post IDs in localStorage
        const arr = Array.from(sessionSeenIdsRef.current).slice(-200);
        localStorage.setItem(storageKey, JSON.stringify(arr));
      } catch {
        // ignore storage quota errors
      }
    },
    [storageKey]
  );

  // Synchronize initial posts if changed from server
  useEffect(() => {
    setPosts(initialPosts);
    setHasMore(initialHasMore);
  }, [initialPosts, initialHasMore]);

  const fetchLatestPostsQuietly = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts?limit=${FEED_PAGE_SIZE}&offset=0`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPosts((prev) => {
          const existingIds = new Set(json.data.map((p: FeedPostData) => p.id));
          const olderLoaded = prev.filter((p) => !existingIds.has(p.id));
          return [...json.data, ...olderLoaded];
        });
        if (typeof json.hasMore === "boolean" && posts.length <= FEED_PAGE_SIZE) {
          setHasMore(json.hasMore);
        }
      }
    } catch {
      // ignore transient network errors
    }
  }, [posts.length]);

  // Load next 10 posts (Infinite Scroll / Pagination)
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/posts?limit=${FEED_PAGE_SIZE}&offset=${posts.length}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPosts((prev) => {
          const existing = new Set(prev.map((p) => p.id));
          const uniqueNew = json.data.filter(
            (p: FeedPostData) => !existing.has(p.id)
          );
          return [...prev, ...uniqueNew];
        });
        setHasMore(Boolean(json.hasMore));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more posts error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, posts.length]);

  // IntersectionObserver for automatic infinite scroll when reaching the bottom sentinel
  useEffect(() => {
    const el = loadMoreTriggerRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && hasMore) {
          loadMorePosts();
        }
      },
      { rootMargin: "240px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMorePosts]);

  // Auto-sync on mount & visibility change so Home feed is always fresh
  useEffect(() => {
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
        const res = await fetch("/api/posts?limit=5&offset=0", {
          cache: "no-store",
        });
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

  const handleLikeToggled = (
    postId: string,
    liked: boolean,
    likeCount: number
  ) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, liked, like_count: likeCount } : p
      )
    );
  };

  const refreshFeed = async () => {
    startTransition(async () => {
      try {
        // Snapshot the current seen posts so newly refreshed posts sort to the top
        setInitialSeenIds(new Set(sessionSeenIdsRef.current));
        const res = await fetch(`/api/posts?limit=${FEED_PAGE_SIZE}&offset=0`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && json.data) {
          setPosts(json.data);
          setHasMore(Boolean(json.hasMore));
          setNewPostNotice(0);
        }
      } catch (err) {
        console.error("Refresh feed error:", err);
      }
    });
  };

  // Filter posts + Facebook-style "Unseen First, Seen Below" ordering
  const { unseenPosts, seenPosts, totalFilteredCount } = useMemo(() => {
    const filtered = posts.filter((post) => {
      if (activeFilter === "media") {
        const hasMedia =
          (post.media_urls && post.media_urls.length > 0) ||
          (post.post_media && post.post_media.length > 0);
        if (!hasMedia) return false;
      }

      if (locationFilter) {
        if (
          !post.location_name
            ?.toLowerCase()
            .includes(locationFilter.toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    });

    const unseen: FeedPostData[] = [];
    const seen: FeedPostData[] = [];

    filtered.forEach((p) => {
      if (initialSeenIds.has(p.id)) {
        seen.push(p);
      } else {
        unseen.push(p);
      }
    });

    return {
      unseenPosts: unseen,
      seenPosts: seen,
      totalFilteredCount: filtered.length,
    };
  }, [posts, activeFilter, locationFilter, initialSeenIds]);

  const availableLocations = Array.from(
    new Set(posts.map((p) => p.location_name).filter(Boolean) as string[])
  );

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-16 sm:pb-8">
      {/* ── Clean Community Header (Mobile & Tablet — Zero Emojis) ── */}
      <div className="lg:hidden relative overflow-hidden rounded-2xl sm:rounded-3xl px-4 py-3.5 border border-border/60 dark:border-white/10 shadow-sm bg-gradient-to-br from-slate-900 via-rose-950 to-orange-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,94,58,0.32),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,51,102,0.22),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          {/* Row 1: Greeting + Map Link */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/80 mb-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span>Sorsogon Community</span>
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
                </span>
              </h1>
            </div>

            <Link
              href="/explore"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/20 text-xs font-semibold text-white transition-all"
            >
              <Compass className="h-3.5 w-3.5 text-orange-300" />
              <span>Explore Map</span>
            </Link>
          </div>

          {/* Row 2: Quick Navigation Pills (No Emojis) */}
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
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold border border-white/15 text-white/95 shrink-0 transition-all"
            >
              <CalendarDays className="h-3 w-3 text-rose-300" />
              <span>Upcoming Events</span>
            </Link>
            <Link
              href="/explore?q=Beach"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold border border-white/15 text-white/95 shrink-0 transition-all"
            >
              <MapPin className="h-3 w-3 text-sky-300" />
              <span>Coastal Spots</span>
            </Link>
            <Link
              href="/explore?q=Nature"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold border border-white/15 text-white/95 shrink-0 transition-all"
            >
              <Navigation className="h-3 w-3 text-emerald-300" />
              <span>Eco Parks</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Featured Places in Sorsogon (Editorial Spotlight Carousel — Zero Emojis) ── */}
      <section className="rounded-2xl sm:rounded-3xl border border-border/80 dark:border-white/10 bg-card/95 dark:bg-card/80 p-3 sm:p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Featured Places in Sorsogon
                </h2>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                  Spotlight
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Discover local landmarks, beaches, and nature sanctuaries
              </p>
            </div>
          </div>

          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
          >
            <span>Map View</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Horizontal Photo Cards */}
        <div className="flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-0.5">
          {FEATURED_SORSOGON_PLACES.map((place) => (
            <Link
              key={place.id}
              href={`/explore?q=${encodeURIComponent(place.query)}`}
              className="group relative w-[220px] sm:w-[240px] h-[132px] sm:h-[142px] shrink-0 snap-start rounded-2xl overflow-hidden border border-border/70 bg-slate-900 shadow-2xs"
            >
              <img
                src={place.image}
                alt={place.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

              {/* Top Category Badge */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-white/95 border border-white/15">
                  {place.category}
                </span>
                <span className="h-6 w-6 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center border border-white/15 group-hover:bg-primary transition-colors">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>

              {/* Bottom Place Title & Municipality */}
              <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                <p className="text-[10px] font-semibold text-white/80 flex items-center gap-1 truncate">
                  <MapPin className="h-2.5 w-2.5 text-rose-400 shrink-0" />
                  <span className="truncate">{place.municipality}</span>
                </p>
                <h3 className="text-xs sm:text-sm font-bold leading-tight truncate mt-0.5">
                  {place.name}
                </h3>
                <p className="text-[10px] text-white/75 line-clamp-1 mt-0.5">
                  {place.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Create Post Composer */}
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
            <span>Feed</span>
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
                <span className="max-w-[96px] truncate">
                  {locationFilter || "Area"}
                </span>
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
          <RefreshCw
            className={`h-3.5 w-3.5 ${isPending ? "animate-spin text-primary" : ""}`}
          />
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

      {/* Feed Posts List (Unseen Posts First + Caught Up Divider + Earlier Seen Posts) */}
      {totalFilteredCount === 0 ? (
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
                : "Be the first to share an update, hangout, or photo in Sorsogon."}
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
        <div className="space-y-3.5 sm:space-y-4">
          {/* 1. Unseen / New Posts First */}
          {unseenPosts.map((post, idx) => (
            <div key={post.id} className="space-y-3.5 sm:space-y-4">
              <ObservedFeedPostItem
                post={post}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onPostDeleted={handlePostDeleted}
                onLikeToggled={handleLikeToggled}
                onSeen={markPostSeen}
              />

              {/* In-Feed Destination Advertisement Card after the 3rd post */}
              {idx === 2 && (
                <InFeedDestinationSpotlight
                  place={FEATURED_SORSOGON_PLACES[1]}
                />
              )}
            </div>
          ))}

          {/* 2. "You're All Caught Up" Divider when transitioning from New to Earlier Seen Posts */}
          {seenPosts.length > 0 && (
            <div className="flex items-center gap-3 py-2 px-2">
              <div className="h-px flex-1 bg-border/80" />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border/70 text-[11px] font-semibold text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>
                  {unseenPosts.length > 0
                    ? "You're caught up on new posts • Earlier Posts"
                    : "Caught up • Viewing recent community posts"}
                </span>
              </div>
              <div className="h-px flex-1 bg-border/80" />
            </div>
          )}

          {/* 3. Earlier (Previously Seen) Posts */}
          {seenPosts.map((post, idx) => (
            <div key={post.id} className="space-y-3.5 sm:space-y-4">
              <ObservedFeedPostItem
                post={post}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onPostDeleted={handlePostDeleted}
                onLikeToggled={handleLikeToggled}
                onSeen={markPostSeen}
              />

              {/* If unseenPosts had fewer than 3 items, show the In-Feed Destination Spotlight here */}
              {unseenPosts.length < 3 && idx === 2 && (
                <InFeedDestinationSpotlight
                  place={FEATURED_SORSOGON_PLACES[2]}
                />
              )}
            </div>
          ))}

          {/* 4. Infinite Scroll Sentinel / Load More 10 Posts */}
          <div ref={loadMoreTriggerRef} className="pt-2 flex flex-col items-center">
            {hasMore ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMorePosts}
                disabled={isLoadingMore}
                className="rounded-full h-9 px-5 text-xs font-semibold gap-2 border-border/80 bg-card hover:bg-accent cursor-pointer"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Loading more posts...</span>
                  </>
                ) : (
                  <span>Load More Posts</span>
                )}
              </Button>
            ) : (
              posts.length >= FEED_PAGE_SIZE && (
                <p className="text-[11px] text-muted-foreground py-2">
                  You have reached the end of the community feed.
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Wraps a FeedPost with an IntersectionObserver so once the user views a post
 * for 1.2 seconds, it is marked as "seen" in localStorage (Facebook-style).
 */
function ObservedFeedPostItem({
  post,
  currentUserId,
  currentUserRole,
  onPostDeleted,
  onLikeToggled,
  onSeen,
}: {
  post: FeedPostData;
  currentUserId: string;
  currentUserRole: string;
  onPostDeleted: (postId: string) => void;
  onLikeToggled: (postId: string, liked: boolean, likeCount: number) => void;
  onSeen: (postId: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          timer = setTimeout(() => {
            onSeen(post.id);
          }, 1200);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.45 }
    );

    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [post.id, onSeen]);

  return (
    <div ref={ref}>
      <FeedPost
        post={post}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onPostDeleted={onPostDeleted}
        onLikeToggled={onLikeToggled}
      />
    </div>
  );
}

/**
 * Clean, editorial in-feed Sorsogon Destination Spotlight card (Zero Emojis).
 */
function InFeedDestinationSpotlight({
  place,
}: {
  place: FeaturedSorsogonPlace;
}) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card overflow-hidden shadow-2xs">
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-border/50 bg-muted/25">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Compass className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground truncate">
            Featured Destination in Sorsogon
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
          Suggested Place
        </span>
      </div>

      <Link
        href={`/explore?q=${encodeURIComponent(place.query)}`}
        className="group block relative aspect-[21/9] w-full overflow-hidden bg-slate-900"
      >
        <img
          src={place.image}
          alt={place.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/85">
              <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
              <span>{place.municipality}</span>
              <span>•</span>
              <span>{place.category}</span>
            </span>
            <h3 className="text-sm sm:text-base font-extrabold leading-tight truncate mt-0.5">
              {place.name}
            </h3>
            <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
              {place.tagline}
            </p>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
            <span>View on Map</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}
