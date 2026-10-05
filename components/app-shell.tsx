"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
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
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        mobile && "w-full text-base py-3"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", mobile && "h-6 w-6")} />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children, user, profile }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User";
  const username = profile?.username || "";
  const avatarUrl = profile?.avatar_url;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card sticky top-0 h-screen p-4">
        <div className="flex items-center gap-2 px-3 py-2 mb-6">
          <MapPin className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl tracking-tight">SORSOVENT</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navLinks.map((link) => (
            <NavLink key={link.href} {...link} />
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
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <div className="flex items-center gap-3 mb-8">
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
                <NavLink key={link.href} {...link} mobile />
              ))}
            </nav>
            <Link href="/events/create" onClick={() => setMobileOpen(false)}>
              <Button className="w-full gap-2 mb-4">
                <PlusCircle className="h-4 w-4" />
                Create Event
              </Button>
            </Link>
            <div className="space-y-1 border-t pt-4">
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

      {/* Main Content */}
      <main className="flex-1 md:overflow-y-auto">
        <div className="pt-14 md:pt-0">{children}</div>
      </main>
    </div>
  );
}
