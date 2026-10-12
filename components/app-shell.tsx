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
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  mobile?: boolean;
  badgeCount?: number;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all relative",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        mobile && "w-full text-base py-3"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", mobile && "h-6 w-6")} />
      <span>{label}</span>
      {badgeCount && badgeCount > 0 ? (
        <span
          className={cn(
            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            isActive ? "bg-white text-primary" : "bg-rose-500 text-white"
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
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Initial unread count fetch
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => {
        setUnreadNotifs(count || 0);
      });

    // Realtime listener for notification changes
    const channel = supabase
      .channel(`app-shell-notifs:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false)
            .then(({ count }) => {
              setUnreadNotifs(count || 0);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

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
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card sticky top-0 h-screen p-4">
        <div className="flex items-center justify-between px-3 py-2 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">SORSOVENT</span>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        {isSuperAdmin && (
          <Link href="/admin/dashboard" className="mb-4 block">
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
            />
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <Link href="/events/create">
            <Button className="w-full gap-2">
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">SORSOVENT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle variant="icon" />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-sm text-muted-foreground">@{username}</p>
                </div>
              </div>
              <nav className="space-y-1 mb-6">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.href}
                    {...link}
                    mobile
                    badgeCount={link.href === "/notifications" ? unreadNotifs : undefined}
                  />
                ))}
              </nav>
              {isSuperAdmin && (
                <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full gap-2 mb-3 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20" variant="outline">
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}

              <Link href="/events/create" onClick={() => setMobileOpen(false)}>
                <Button className="w-full gap-2 mb-4">
                  <PlusCircle className="h-4 w-4" />
                  Create Event
                </Button>
              </Link>
              <div className="space-y-1 border-t pt-4">
                <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
                  <span>Theme</span>
                  <ThemeToggle variant="dropdown" />
                </div>
                <Link href={`/profile/${username}`} onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <UserIcon className="h-5 w-5" />
                    Profile
                  </Button>
                </Link>
                <Link href="/settings" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <Settings className="h-5 w-5" />
                    Settings
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:overflow-y-auto">
        <div className="pt-14 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
