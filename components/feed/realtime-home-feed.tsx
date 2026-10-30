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
import { NetworkStatusBanner } from "@/components/layout/network-status-banner";
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
  Loader2,
  Navigation,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const FEED_PAGE_SIZE = 10;
const OFFLINE_MEDIA_CACHE_NAME = "mingle-featured-media-v1";

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

interface UserProfileSummary {
  id: string;
  username: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url: string | null;
}

interface UpcomingEventSummary {
  id: string;
  title: string;
  location_name?: string | null;
  start_time?: string | null;
  category?: string | null;
}

interface RealtimeHomeFeedProps {
  initialPosts: FeedPostData[];
  initialHasMore?: boolean;
  currentUserId: string;
  currentUserProfile: UserProfileSummary | null;
  currentUserRole?: string;
  upcomingEvents?: UpcomingEventSummary[];
}

export function RealtimeHomeFeed({
  initialPosts,
  initialHasMore = false,
  currentUserId,
  currentUserProfile,
  currentUserRole = "USER",
  upcomingEvents = [],
}: RealtimeHomeFeedProps) {
  const computeGreeting = useCallback(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const [greeting, setGreeting] = useState<string>(() => computeGreeting());
  const [formattedDate, setFormattedDate] = useState<string>(() =>
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  );

  // Keep greeting & date accurate in the user's local device timezone
  useEffect(() => {
    const updateClock = () => {
      setGreeting(computeGreeting());
      setFormattedDate(
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 60_000);
    return () => clearInterval(timer);
  }, [computeGreeting]);

  const [cachedProfile, setCachedProfile] = useState<UserProfileSummary | null>(
    currentUserProfile
  );
  const [cachedEvents, setCachedEvents] =
    useState<UpcomingEventSummary[]>(upcomingEvents);
  const [featuredPlacesReady, setFeaturedPlacesReady] = useState<boolean>(false);
  const [pendingOfflineQueueCount, setPendingOfflineQueueCount] =
    useState<number>(0);

  const effectiveProfile = currentUserProfile || cachedProfile;

  const getFriendlyName = () => {
    const raw =
      effectiveProfile?.full_name?.trim() ||
      effectiveProfile?.display_name?.trim() ||
      effectiveProfile?.username?.trim() ||
      "Explorer";
    return raw;
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
  const offlineCacheKey = `mingle_offline_feed_cache_v1_${currentUserId}`;
  const offlineQueueKey = `mingle_offline_post_queue_${currentUserId}`;

  // Smooth skeleton initialization + Offline Cache Restore & Pre-Caching
  useEffect(() => {
    const skeletonTimer = setTimeout(() => {
      setFeaturedPlacesReady(true);
    }, 180);

    try {
      // 1. Load seen post IDs
      const rawSeen = localStorage.getItem(storageKey);
      if (rawSeen) {
        const parsed: string[] = JSON.parse(rawSeen);
        if (Array.isArray(parsed)) {
          setInitialSeenIds(new Set(parsed));
          sessionSeenIdsRef.current = new Set(parsed);
        }
      }

      // 2. Check pending offline post queue count
      const rawQueue = localStorage.getItem(offlineQueueKey);
      if (rawQueue) {
        const parsedQueue = JSON.parse(rawQueue);
        if (Array.isArray(parsedQueue)) {
          setPendingOfflineQueueCount(parsedQueue.length);
        }
      }

      // 3. Restore offline cache if initial server data is empty or device is offline
      const rawCache = localStorage.getItem(offlineCacheKey);
      if (rawCache) {
        const parsedCache = JSON.parse(rawCache);
        if (
          (!initialPosts || initialPosts.length === 0) &&
          Array.isArray(parsedCache.posts) &&
          parsedCache.posts.length > 0
        ) {
          setPosts(parsedCache.posts);
        }
        if (!currentUserProfile && parsedCache.profile) {
          setCachedProfile(parsedCache.profile);
        }
        if (
          (!upcomingEvents || upcomingEvents.length === 0) &&
          Array.isArray(parsedCache.upcomingEvents)
        ) {
          setCachedEvents(parsedCache.upcomingEvents);
        }
      }

      // 4. Persist Featured Places metadata for offline access
      localStorage.setItem(
        "mingle_cached_featured_places_v1",
        JSON.stringify(FEATURED_SORSOGON_PLACES)
      );
    } catch {
      // ignore storage errors
    }

    // 5. Pre-cache Featured Sorsogon Places images in Browser CacheStorage so they display offline
    if (typeof window !== "undefined" && "caches" in window && navigator.onLine) {
      caches
        .open(OFFLINE_MEDIA_CACHE_NAME)
        .then((cache) => {
          FEATURED_SORSOGON_PLACES.forEach((place) => {
            cache.match(place.image).then((matched) => {
              if (!matched) {
                fetch(place.image, { mode: "no-cors" })
                  .then((res) => {
                    if (res) cache.put(place.image, res);
                  })
                  .catch(() => {});
              }
            });
          });
        })
        .catch(() => {});
    }

    return () => clearTimeout(skeletonTimer);
  }, [
    storageKey,
    offlineCacheKey,
    offlineQueueKey,
    initialPosts,
    currentUserProfile,
    upcomingEvents,
  ]);

  // Persist current posts, user profile, and upcoming events to localStorage whenever updated
  useEffect(() => {
    try {
      if (posts.length > 0 || effectiveProfile) {
        const payload = {
          posts: posts.slice(0, 40),
          profile: effectiveProfile,
          upcomingEvents: cachedEvents,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(offlineCacheKey, JSON.stringify(payload));
        localStorage.setItem(
          "mingle_offline_last_saved_at",
          payload.savedAt
        );
      }
    } catch {
      // ignore storage quota errors
    }
  }, [posts, effectiveProfile, cachedEvents, offlineCacheKey]);

  // Helper to mark a post as seen when the user views it in the viewport
  const markPostSeen = useCallback(
    (postId: string) => {
      if (sessionSeenIdsRef.current.has(postId)) return;
      sessionSeenIdsRef.current.add(postId);
      try {
        const arr = Array.from(sessionSeenIdsRef.current).slice(-200);
        localStorage.setItem(storageKey, JSON.stringify(arr));
      } catch {
        // ignore storage quota errors
      }
    },
    [storageKey]
  );

  // Synchronize initial posts if changed from server (when non-empty)
  useEffect(() => {
    if (initialPosts && initialPosts.length > 0) {
      setPosts(initialPosts);
      setHasMore(initialHasMore);
    }
  }, [initialPosts, initialHasMore]);

  useEffect(() => {
    if (currentUserProfile) setCachedProfile(currentUserProfile);
  }, [currentUserProfile]);

  useEffect(() => {
    if (upcomingEvents && upcomingEvents.length > 0) {
      setCachedEvents(upcomingEvents);
    }
  }, [upcomingEvents]);

  const fetchLatestPostsQuietly = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) return;
    try {
      const res = await fetch(`/api/posts?limit=${FEED_PAGE_SIZE}&offset=0`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPosts((prev) => {
          const existingIds = new Set(json.data.map((p: FeedPostData) => p.id));
          const olderLoaded = prev.filter(
            (p) => !existingIds.has(p.id) && !String(p.id).startsWith("offline_")
          );
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

  // Flush any offline-queued posts when internet reconnects
  const syncOfflineQueueAndRefresh = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;

    try {
      const rawQueue = localStorage.getItem(offlineQueueKey);
      if (rawQueue) {
        const queue = JSON.parse(rawQueue);
        if (Array.isArray(queue) && queue.length > 0) {
          const remaining: any[] = [];
          for (const item of queue) {
            try {
              const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: item.content,
                  location_name: item.location_name,
                  media_urls: item.media_urls || [],
                }),
              });
              const json = await res.json();
              if (!res.ok || !json.success) {
                remaining.push(item);
              }
            } catch {
              remaining.push(item);
            }
          }

          if (remaining.length === 0) {
            localStorage.removeItem(offlineQueueKey);
            setPendingOfflineQueueCount(0);
            toast.success("Offline posts synced and published!");
          } else {
            localStorage.setItem(offlineQueueKey, JSON.stringify(remaining));
            setPendingOfflineQueueCount(remaining.length);
          }
        }
      }
    } catch {
      // ignore queue errors
    }

    await fetchLatestPostsQuietly();
  }, [offlineQueueKey, fetchLatestPostsQuietly]);

  // Load next 10 posts (Infinite Scroll / Pagination)
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    if (typeof window !== "undefined" && !navigator.onLine) {
      window.dispatchEvent(new CustomEvent("mingle:check-connection"));
      toast.info("You're offline — showing saved posts on this device.");
      return;
    }

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
    } catch {
      window.dispatchEvent(new CustomEvent("mingle:check-connection"));
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
        if (
          entries[0]?.isIntersecting &&
          !isLoadingMore &&
          hasMore &&
          (typeof navigator === "undefined" || navigator.onLine)
        ) {
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

  const handleOptimisticPostCreated = (newPost: FeedPostData & { is_offline_queued?: boolean }) => {
    setPosts((prev) => {
      if (prev.some((p) => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
    if (newPost.is_offline_queued) {
      setPendingOfflineQueueCount((c) => c + 1);
      window.dispatchEvent(new CustomEvent("mingle:check-connection"));
    }
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
    if (typeof window !== "undefined" && !navigator.onLine) {
      window.dispatchEvent(new CustomEvent("mingle:check-connection"));
      try {
        const rawCache = localStorage.getItem(offlineCacheKey);
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (Array.isArray(parsed.posts) && parsed.posts.length > 0) {
            setPosts(parsed.posts);
          }
        }
      } catch {
        // ignore
      }
      toast.info("Offline mode — showing saved community feed.");
      return;
    }

    startTransition(async () => {
      try {
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
      } catch {
        window.dispatchEvent(new CustomEvent("mingle:check-connection"));
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

  const friendlyName = getFriendlyName();

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-16 sm:pb-8">
      {/* ── Small, Dismissible Offline / Connecting Banner ── */}
      <NetworkStatusBanner
        onReconnect={syncOfflineQueueAndRefresh}
        pendingOfflineCount={pendingOfflineQueueCount}
      />

      {/* ── Clean Community Header (Unobstructed Full-Width Greeting + Name) ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl px-4 py-3.5 sm:px-5 sm:py-4 border border-border/60 dark:border-white/10 shadow-sm bg-gradient-to-br from-slate-900 via-rose-950 to-orange-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,94,58,0.32),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,51,102,0.22),transparent_50%)] pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          {/* Top Bar Row: Community Badge + Date on Left, Explore Map Button on Top Right */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-white/90 min-w-0">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="truncate">Sorsogon Community</span>
              <span className="text-white/40">•</span>
              <span className="text-white/75 shrink-0">{formattedDate}</span>
            </div>

            <Link
              href="/explore"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/20 text-xs font-semibold text-white transition-all"
            >
              <Compass className="h-3.5 w-3.5 text-orange-300" />
              <span>Explore Map</span>
            </Link>
          </div>

          {/* Dedicated Full-Width Greeting & User Name Row (Never Blocked by Explore Map Button) */}
          <div className="w-full pt-0.5">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-snug break-words">
              <span>{greeting}, </span>
              <span className="bg-gradient-to-r from-orange-300 via-rose-200 to-pink-200 bg-clip-text text-transparent">
                {friendlyName}
              </span>
            </h1>
            <p className="text-xs text-white/75 mt-0.5 leading-relaxed">
              Connect with locals, discover events, and explore places across Sorsogon.
            </p>
          </div>

          {/* Quick Navigation Pills (Zero Emojis) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {cachedEvents.slice(0, 2).map((ev) => (
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

      {/* ── Featured Places in Sorsogon (Smooth Skeleton Loading + Offline Cached Carousel) ── */}
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

        {/* Horizontal Photo Cards with Smooth Skeleton State */}
        <div className="flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-0.5">
          {!featuredPlacesReady
            ? Array.from({ length: 4 }).map((_, i) => (
                <FeaturedPlaceCardSkeleton key={i} />
              ))
            : FEATURED_SORSOGON_PLACES.map((place) => (
                <FeaturedPlaceCard key={place.id} place={place} />
              ))}
        </div>
      </section>

      {/* Create Post Composer */}
      <CreatePostCard
        profile={effectiveProfile}
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

      {/* Feed Posts List (Unseen Posts First + Earlier Seen Posts) */}
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

          {/* 2. Earlier (Previously Seen) Posts */}
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

          {/* 3. Infinite Scroll Sentinel / Load More 10 Posts */}
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
 * Skeleton placeholder card for Featured Places carousel
 */
export function FeaturedPlaceCardSkeleton() {
  return (
    <div className="relative w-[220px] sm:w-[240px] h-[132px] sm:h-[142px] shrink-0 snap-start rounded-2xl overflow-hidden border border-border/70 bg-muted/60 dark:bg-slate-900/70 p-2.5 flex flex-col justify-between animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded-full bg-muted-foreground/20" />
        <div className="h-6 w-6 rounded-full bg-muted-foreground/20" />
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-20 rounded-md bg-muted-foreground/20" />
        <div className="h-3.5 w-36 rounded-md bg-muted-foreground/30" />
        <div className="h-2.5 w-44 rounded-md bg-muted-foreground/15" />
      </div>
    </div>
  );
}

/**
 * Smooth Featured Place Card with built-in image skeleton shimmer and offline fallback
 */
function FeaturedPlaceCard({ place }: { place: FeaturedSorsogonPlace }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, []);

  return (
    <Link
      href={`/explore?q=${encodeURIComponent(place.query)}`}
      className="group relative w-[220px] sm:w-[240px] h-[132px] sm:h-[142px] shrink-0 snap-start rounded-2xl overflow-hidden border border-border/70 bg-slate-900 shadow-2xs"
    >
      {/* Skeleton Shimmer Overlay until image finishes loading */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 z-10 bg-slate-900/90 p-2.5 flex flex-col justify-between animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-full bg-white/15" />
            <div className="h-6 w-6 rounded-full bg-white/15" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 rounded-md bg-white/15" />
            <div className="h-3.5 w-36 rounded-md bg-white/25" />
            <div className="h-2.5 w-44 rounded-md bg-white/10" />
          </div>
        </div>
      )}

      {/* Offline / Fallback Gradient when image cannot be fetched */}
      {imageError ? (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-rose-950 to-orange-950" />
      ) : (
        <img
          ref={imgRef}
          src={place.image}
          alt={place.name}
          loading="eager"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

      {/* Top Category Badge */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-20">
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-white/95 border border-white/15">
          {place.category}
        </span>
        <span className="h-6 w-6 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center border border-white/15 group-hover:bg-primary transition-colors">
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>

      {/* Bottom Place Title & Municipality */}
      <div className="absolute bottom-2 left-2.5 right-2.5 text-white z-20">
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
  post: FeedPostData & { is_offline_queued?: boolean };
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
    <div ref={ref} className="space-y-1.5">
      {(post.is_offline_queued || String(post.id).startsWith("offline_")) && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] font-medium text-amber-600 dark:text-amber-300">
          <WifiOff className="h-3 w-3 shrink-0" />
          <span>Saved offline • Will publish automatically when connected</span>
        </div>
      )}
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
 * Clean, editorial in-feed Sorsogon Destination Spotlight card with smooth skeleton loading (Zero Emojis).
 */
function InFeedDestinationSpotlight({
  place,
}: {
  place: FeaturedSorsogonPlace;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, []);

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
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 z-10 bg-slate-900/90 p-3.5 flex flex-col justify-end animate-pulse">
            <div className="space-y-2">
              <div className="h-3 w-32 rounded-md bg-white/15" />
              <div className="h-4 w-48 rounded-md bg-white/25" />
              <div className="h-3 w-64 rounded-md bg-white/10" />
            </div>
          </div>
        )}

        {imageError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-rose-950 to-orange-950" />
        ) : (
          <img
            ref={imgRef}
            src={place.image}
            alt={place.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-3 text-white z-20">
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
