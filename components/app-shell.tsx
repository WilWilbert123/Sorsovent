"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Compass,
  MapPin,
  CalendarDays,
  Bell,
  MessageSquare,
  PlusCircle,
  Menu,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronDown,
  Shield,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";
import { listenToForegroundPush } from "@/lib/firebase/client";
import { toast } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  user: User;
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
}

const navLinks = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

function NavLink({
  href,
  label,
  icon: Icon,
  mobile = false,
  badgeCount,
  pending = false,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  mobile?: boolean;
  badgeCount?: number;
  pending?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={() => {
        if (!isActive && onNavigate) {
          onNavigate(href);
        }
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 relative select-none",
        isActive
          ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-xs font-semibold"
          : pending
          ? "bg-[#FF3366]/15 text-[#FF3366] ring-2 ring-[#FF3366]/30 animate-pulse font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        mobile && "w-full text-base py-3"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 transition-transform", mobile && "h-5 w-5", pending && "animate-spin")} />
      <span>{label}</span>
      {badgeCount && badgeCount > 0 ? (
        <span
          className={cn(
            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            isActive ? "bg-white text-[#FF3366]" : "bg-[#FF3366] text-white"
          )}
        >
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children, user, profile }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Reset pending state whenever pathname transitions
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    let channel: any = null;

    const fetchUnread = () => {
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .then(({ count }) => {
          setUnreadNotifs(count || 0);
        });
    };

    const subscribeToChannel = () => {
      if (channel) return;
      channel = supabase
        .channel(`app-shell-notifs:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async (payload: any) => {
            fetchUnread();

            // Display interactive real-time toast alert when receiving a new notification
            if (payload.eventType === "INSERT" && payload.new) {
              const newNotif = payload.new;
              try {
                const { data: actor } = await supabase
                  .from("profiles")
                  .select("display_name, full_name, username")
                  .eq("id", newNotif.actor_id)
                  .maybeSingle();

                const actorName =
                  actor?.display_name || actor?.full_name || actor?.username || "Someone";

                let title = "New Notification 🔔";
                let description = `${actorName} interacted with your account.`;
                const targetUrl = newNotif.post_id
                  ? `/home#post-${newNotif.post_id}`
                  : newNotif.event_id
                  ? `/events/${newNotif.event_id}`
                  : "/notifications";

                if (newNotif.type === "like") {
                  title = "Post Reaction ❤️";
                  description = `${actorName} liked your post.`;
                } else if (newNotif.type === "comment") {
                  title = "New Comment 💬";
                  description = `${actorName} commented on your post.`;
                } else if (newNotif.type === "reply") {
                  title = "New Reply 💬";
                  description = `${actorName} replied to your comment.`;
                } else if (newNotif.type === "comment_like") {
                  title = "Comment Liked ❤️";
                  description = `${actorName} liked your comment.`;
                } else if (newNotif.type === "event_join") {
                  title = "New Event Guest 🎉";
                  description = `${actorName} joined your event.`;
                }

                toast.info(`🔔 ${title}`, {
                  description,
                  action: {
                    label: "View",
                    onClick: () => {
                      router.push(targetUrl);
                    },
                  },
                });
              } catch (err) {
                console.error("Error formatting realtime notification toast:", err);
              }
            }
          }
        )
        .subscribe();
    };

    const unsubscribeFromChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    // Initial fetch and subscribe
    fetchUnread();
    if (typeof document !== "undefined" && !document.hidden) {
      subscribeToChannel();
    }

    // Save WebSocket connection slots: disconnect when user is away, reconnect when tab is active
    const handleVisibility = () => {
      if (document.hidden) {
        unsubscribeFromChannel();
      } else {
        fetchUnread();
        subscribeToChannel();
      }
    };

    // Listen to Firebase foreground push messages when browser tab is active
    let unsubForegroundPush: (() => void) | null = null;
    listenToForegroundPush((payload) => {
      const title = payload.notification?.title || "New notification on Mingle";
      const body = payload.notification?.body || "You have a new update.";
      const url = payload.data?.url || "/notifications";

      toast.info(`🔔 ${title}`, {
        description: body,
        position: "top-center",
        duration: 5000,
        action: {
          label: "View",
          onClick: () => router.push(url),
        },
      });
    }).then((unsub) => {
      unsubForegroundPush = unsub;
    });

    return () => {
      unsubscribeFromChannel();
      document.removeEventListener("visibilitychange", handleVisibility);
      if (unsubForegroundPush) {
        unsubForegroundPush();
      }
    };
  }, [user.id, router]);

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const username = profile?.username || "";
  const avatarUrl = profile?.avatar_url;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isSuperAdmin = user.email?.toLowerCase() === "johnwilbertgamis2022@gmail.com";

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-background mobile-feed-bg md:bg-background">
      {/* 60-Second Presence Heartbeat (0 persistent WebSockets) */}
      <PresenceHeartbeat userId={user.id} />

      {/* Instant Navigation Top Progress Indicator */}
      {pendingHref && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-[9999] bg-primary/20 overflow-hidden pointer-events-none">
          <div className="h-full bg-primary animate-pulse w-full origin-left" />
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card sticky top-0 h-screen p-4">
        <div className="flex items-center justify-between px-3 py-2 mb-4">
          <div className="flex items-center gap-2.5">
            <img src="/minglelogo.png" alt="Mingle" className="h-7 w-auto object-contain" />
            <span className="font-bold text-xl tracking-tight">MINGLE</span>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        {isSuperAdmin && (
          <Link href="/admin/dashboard" prefetch={true} className="mb-4 block">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all group shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shrink-0">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">Admin Portal</p>
                  <p className="text-[10px] text-primary font-mono truncate">Super Admin Active</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </Link>
        )}

        <nav className="flex-1 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              {...link}
              badgeCount={link.href === "/notifications" ? unreadNotifs : undefined}
              pending={pendingHref === link.href}
              onNavigate={setPendingHref}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <Link href="/events/create" prefetch={true}>
            <Button className="w-full gap-2 bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white border-0 hover:opacity-95 shadow-md shadow-[#FF3366]/20 font-semibold">
              <PlusCircle className="h-4 w-4" />
              Create Event
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-3 w-full rounded-xl px-3 py-2 hover:bg-accent transition-colors text-left cursor-pointer"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{username}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {isSuperAdmin && (
                <>
                  <DropdownMenuItem
                    className="text-primary font-semibold cursor-pointer"
                    onClick={() => router.push("/admin/dashboard")}
                  >
                    <Shield className="mr-2 h-4 w-4 text-primary" />
                    Admin Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem onClick={() => router.push(`/profile/${username}`)}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <Link href="/home" className="flex items-center gap-2 select-none">
          <img src="/minglelogo.png" alt="Mingle" className="h-7 w-auto object-contain drop-shadow-xs" />
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] bg-clip-text text-transparent">MINGLE</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/messages"
            prefetch={true}
            onClick={() => { if (!pathname.startsWith("/messages")) setPendingHref("/messages"); }}
            className={cn(
              "relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
              pathname.startsWith("/messages") && "text-[#FF3366] bg-[#FF3366]/10"
            )}
            aria-label="Direct Messages"
          >
            <MessageSquare className="h-5 w-5" />
          </Link>
          <ThemeToggle variant="icon" />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="p-0.5 rounded-full ring-2 ring-[#FF3366]/40 hover:ring-[#FF3366] transition-all cursor-pointer ml-0.5"
              aria-label="Account & Menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-[320px] p-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* User Profile Card */}
                <Link
                  href={`/profile/${username}`}
                  prefetch={true}
                  onClick={() => {
                    setPendingHref(`/profile/${username}`);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50 hover:bg-muted border border-border/50 transition-colors group"
                >
                  <Avatar className="h-12 w-12 ring-2 ring-[#FF3366]/30 group-hover:ring-[#FF3366] transition-all">
                    <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{username}</p>
                    <span className="text-[11px] font-medium text-[#FF3366] mt-0.5 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      View profile <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>

                {/* Secondary Hub Navigation (Non-redundant with bottom bar) */}
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                    Hub & Community
                  </p>

                  <Link
                    href="/events"
                    prefetch={true}
                    onClick={() => {
                      setPendingHref("/events");
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname.startsWith("/events") && !pathname.startsWith("/events/create")
                        ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white font-semibold shadow-xs"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <CalendarDays className="h-5 w-5 shrink-0" />
                    <span>Events & Meetups</span>
                  </Link>

                  <Link
                    href="/messages"
                    prefetch={true}
                    onClick={() => {
                      setPendingHref("/messages");
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname.startsWith("/messages")
                        ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white font-semibold shadow-xs"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <MessageSquare className="h-5 w-5 shrink-0" />
                    <span>Messages</span>
                  </Link>
                </div>

                {isSuperAdmin && (
                  <Link
                    href="/admin/dashboard"
                    prefetch={true}
                    onClick={() => {
                      setPendingHref("/admin/dashboard");
                      setMobileOpen(false);
                    }}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#FF3366]/10 border border-[#FF3366]/25 hover:bg-[#FF3366]/15 transition-all">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shrink-0">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">Admin Dashboard</p>
                          <p className="text-[10px] text-[#FF3366] font-mono truncate">Super Admin Portal</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                )}

                {/* Host Event Action */}
                <Link
                  href="/events/create"
                  prefetch={true}
                  onClick={() => {
                    setPendingHref("/events/create");
                    setMobileOpen(false);
                  }}
                  className="block pt-1"
                >
                  <Button className="w-full gap-2 bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white font-semibold shadow-md shadow-[#FF3366]/25 border-0 hover:opacity-95">
                    <PlusCircle className="h-4 w-4" />
                    Host an Event
                  </Button>
                </Link>
              </div>

              {/* Drawer Footer: Settings & Sign Out */}
              <div className="space-y-1 border-t border-border/60 pt-4 mt-auto">
                <Link
                  href="/settings"
                  prefetch={true}
                  onClick={() => {
                    setPendingHref("/settings");
                    setMobileOpen(false);
                  }}
                >
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-sm font-medium">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings & Privacy
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden md:overflow-y-auto relative z-10">
        <div className="pt-14 pb-20 md:pt-0 md:pb-6 w-full max-w-full overflow-x-hidden">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-2xl border-t border-border/50 dark:border-white/10 flex items-end justify-around shadow-[0_-2px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_24px_rgba(0,0,0,0.4)] bg-background/90"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)", paddingTop: "8px" }}
      >
        {/* Home */}
        <Link
          href="/home"
          prefetch={true}
          onClick={() => { if (pathname !== "/home") setPendingHref("/home"); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 relative transition-transform active:scale-90"
        >
          <div className={cn(
            "h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-200",
            (pathname === "/home" || pendingHref === "/home") ? "bg-[#FF3366]/12 dark:bg-[#FF5E3A]/15 nav-active-glow" : ""
          )}>
            <Home className={cn("h-5 w-5 transition-colors", (pathname === "/home" || pendingHref === "/home") ? "text-[#FF3366] dark:text-[#FF5E3A]" : "text-muted-foreground")} />
          </div>
          <span className={cn("text-[10px] tracking-tight transition-colors", (pathname === "/home" || pendingHref === "/home") ? "text-[#FF3366] dark:text-[#FF5E3A] font-bold" : "text-muted-foreground font-medium")}>
            Home
          </span>
          {pathname === "/home" && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] nav-active-dot" />}
        </Link>

        {/* Explore */}
        <Link
          href="/explore"
          prefetch={true}
          onClick={() => { if (!pathname.startsWith("/explore")) setPendingHref("/explore"); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 relative transition-transform active:scale-90"
        >
          <div className={cn(
            "h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-200",
            (pathname.startsWith("/explore") || pendingHref === "/explore") ? "bg-[#FF3366]/12 dark:bg-[#FF5E3A]/15 nav-active-glow" : ""
          )}>
            <Compass className={cn("h-5 w-5 transition-colors", (pathname.startsWith("/explore") || pendingHref === "/explore") ? "text-[#FF3366] dark:text-[#FF5E3A]" : "text-muted-foreground")} />
          </div>
          <span className={cn("text-[10px] tracking-tight transition-colors", (pathname.startsWith("/explore") || pendingHref === "/explore") ? "text-[#FF3366] dark:text-[#FF5E3A] font-bold" : "text-muted-foreground font-medium")}>
            Explore
          </span>
          {pathname.startsWith("/explore") && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] nav-active-dot" />}
        </Link>

        {/* Center Create FAB */}
        <Link
          href="/events/create"
          prefetch={true}
          onClick={() => { if (pathname !== "/events/create") setPendingHref("/events/create"); }}
          className="flex flex-col items-center gap-0.5 px-2 py-1 -mt-4 relative transition-transform active:scale-90"
        >
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white flex items-center justify-center shadow-lg shadow-[#FF3366]/35 ring-4 ring-background">
            <PlusCircle className="h-5 w-5" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">Create</span>
        </Link>

        {/* Map */}
        <Link
          href="/map"
          prefetch={true}
          onClick={() => { if (!pathname.startsWith("/map")) setPendingHref("/map"); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 relative transition-transform active:scale-90"
        >
          <div className={cn(
            "h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-200",
            (pathname.startsWith("/map") || pendingHref === "/map") ? "bg-[#FF3366]/12 dark:bg-[#FF5E3A]/15 nav-active-glow" : ""
          )}>
            <MapPin className={cn("h-5 w-5 transition-colors", (pathname.startsWith("/map") || pendingHref === "/map") ? "text-[#FF3366] dark:text-[#FF5E3A]" : "text-muted-foreground")} />
          </div>
          <span className={cn("text-[10px] tracking-tight transition-colors", (pathname.startsWith("/map") || pendingHref === "/map") ? "text-[#FF3366] dark:text-[#FF5E3A] font-bold" : "text-muted-foreground font-medium")}>
            Map
          </span>
          {pathname.startsWith("/map") && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] nav-active-dot" />}
        </Link>

        {/* Alerts */}
        <Link
          href="/notifications"
          prefetch={true}
          onClick={() => { if (!pathname.startsWith("/notifications")) setPendingHref("/notifications"); }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 relative transition-transform active:scale-90"
        >
          <div className={cn(
            "h-8 w-8 flex items-center justify-center rounded-xl transition-all duration-200 relative",
            (pathname.startsWith("/notifications") || pendingHref === "/notifications") ? "bg-[#FF3366]/12 dark:bg-[#FF5E3A]/15 nav-active-glow" : ""
          )}>
            <Bell className={cn("h-5 w-5 transition-colors", (pathname.startsWith("/notifications") || pendingHref === "/notifications") ? "text-[#FF3366] dark:text-[#FF5E3A]" : "text-muted-foreground")} />
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[#FF3366] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </span>
            )}
          </div>
          <span className={cn("text-[10px] tracking-tight transition-colors", (pathname.startsWith("/notifications") || pendingHref === "/notifications") ? "text-[#FF3366] dark:text-[#FF5E3A] font-bold" : "text-muted-foreground font-medium")}>
            Alerts
          </span>
          {pathname.startsWith("/notifications") && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] nav-active-dot" />}
        </Link>
      </nav>
    </div>
  );
}
