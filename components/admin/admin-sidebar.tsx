"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  LayoutDashboard,
  Users,
  CalendarDays,
  AlertTriangle,
  Settings,
  LogOut,
  BarChart3,
  FileText,
  ShieldCheck,
  ExternalLink,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const adminNavLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-card border-r h-screen sticky top-0 shadow-sm z-30">
      {/* Brand & Badge */}
      <div className="px-4 lg:px-5 py-4 border-b bg-card">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <MapPin className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs lg:text-sm tracking-wide">MINGLE</span>
                <Badge variant="default" className="text-[9px] px-1.5 py-0 uppercase bg-primary text-primary-foreground font-mono">
                  Admin
                </Badge>
              </div>
              <p className="text-[10px] lg:text-[11px] text-muted-foreground truncate">Super Admin Portal</p>
            </div>
          </div>
          <ThemeToggle variant="icon" />
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 text-[10px] lg:text-[11px] text-muted-foreground border">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="truncate">{userEmail}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 lg:p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
          Management
        </div>

        {adminNavLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin/dashboard" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 lg:gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <link.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}

        <div className="pt-3 px-3 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
          Quick Links
        </div>
        <Link
          href="/events"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <span>View Public Site</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
        <Link
          href="/home"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <span>User Home Feed</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
      </nav>

      {/* Footer / Sign Out */}
      <div className="p-3 border-t bg-card space-y-2">
        <form action="/api/auth/signout" method="post">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </aside>
  );
}

export function AdminMobileHeader({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden sticky top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-3.5 border-b bg-card/95 backdrop-blur-md shadow-xs">
      {/* Brand & Drawer trigger */}
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent text-foreground transition-colors cursor-pointer">
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4 flex flex-col h-full bg-card">
            <div className="flex items-center gap-2.5 pb-3 border-b mb-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-wide">MINGLE</span>
                  <Badge variant="default" className="text-[9px] px-1 py-0 uppercase bg-primary text-primary-foreground font-mono">
                    Admin
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">{userEmail}</p>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                Admin Navigation
              </div>
              {adminNavLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/admin/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <link.icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}

              <div className="pt-3 px-2 py-1 text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
                Portals
              </div>
              <Link
                href="/home"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted"
              >
                <span>User Home Feed</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Link>
              <Link
                href="/events"
                target="_blank"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-muted"
              >
                <span>Public Site</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Link>
            </nav>

            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-muted-foreground">Appearance</span>
                <ThemeToggle variant="dropdown" />
              </div>
              <form action="/api/auth/signout" method="post">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-extrabold text-sm tracking-tight">MINGLE</span>
          <Badge variant="default" className="text-[9px] px-1 py-0 uppercase bg-primary text-primary-foreground font-mono">
            Admin
          </Badge>
        </div>
      </div>

      {/* Theme Toggle on mobile header */}
      <div className="flex items-center gap-1">
        <ThemeToggle variant="icon" />
      </div>
    </div>
  );
}
