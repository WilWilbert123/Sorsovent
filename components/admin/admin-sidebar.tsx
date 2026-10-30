"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
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
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const adminNavLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  {
    href: "/admin/events",
    label: "Events",
    icon: CalendarDays,
    sublinks: [
      { href: "/admin/events", label: "All Events" },
      { href: "/admin/events/pending", label: "Pending Queue" },
      { href: "/admin/events/reported", label: "Reported Events" },
    ],
  },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      await logout();
    } catch {
      window.location.href = "/";
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-card border-r h-screen sticky top-0 shadow-sm z-30">
      {/* Brand & Badge */}
      <div className="px-4 lg:px-5 py-4 border-b bg-card">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/minglelogo.png" alt="Mingle" className="h-8 w-auto object-contain shrink-0" />
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
          const isExact = pathname === link.href;
          const isParentOfCurrent =
            link.href !== "/admin/dashboard" && pathname.startsWith(link.href);
          const hasSublinks = Boolean(link.sublinks && link.sublinks.length > 0);

          return (
            <div key={link.href} className="space-y-0.5">
              <Link
                href={link.href}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isExact || (!hasSublinks && isParentOfCurrent)
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : isParentOfCurrent
                    ? "bg-muted/80 text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 lg:gap-3 min-w-0">
                  <link.icon
                    className={`h-4 w-4 shrink-0 ${
                      isExact || (!hasSublinks && isParentOfCurrent)
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="truncate">{link.label}</span>
                </div>
                {hasSublinks && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      isParentOfCurrent ? "rotate-0 text-foreground" : "-rotate-90 opacity-40"
                    }`}
                  />
                )}
              </Link>

              {/* Sublinks (e.g. All Events, Pending Queue, Reported Events) */}
              {hasSublinks && isParentOfCurrent && link.sublinks && (
                <div className="ml-4 pl-3 my-1 space-y-0.5 border-l-2 border-primary/30">
                  {link.sublinks.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          isSubActive
                            ? "bg-primary/10 text-primary font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            isSubActive ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground/40"
                          }`}
                        />
                        <span className="truncate">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing Out..." : "Sign Out"}
        </Button>
      </div>
    </aside>
  );
}

export function AdminMobileHeader({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      await logout();
    } catch {
      window.location.href = "/";
    }
  };

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
              <img src="/minglelogo.png" alt="Mingle" className="h-7 w-auto object-contain shrink-0" />
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
                const isExact = pathname === link.href;
                const isParentOfCurrent =
                  link.href !== "/admin/dashboard" && pathname.startsWith(link.href);
                const hasSublinks = Boolean(link.sublinks && link.sublinks.length > 0);

                return (
                  <div key={link.href} className="space-y-0.5">
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isExact || (!hasSublinks && isParentOfCurrent)
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : isParentOfCurrent
                          ? "bg-muted/80 text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <link.icon className="h-4 w-4 shrink-0" />
                        <span>{link.label}</span>
                      </div>
                      {hasSublinks && (
                        <ChevronDown
                          className={`h-3 w-3 ${isParentOfCurrent ? "rotate-0" : "-rotate-90 opacity-50"}`}
                        />
                      )}
                    </Link>

                    {/* Mobile Drawer Sublinks */}
                    {hasSublinks && isParentOfCurrent && link.sublinks && (
                      <div className="ml-4 pl-3 my-1 space-y-0.5 border-l-2 border-primary/30">
                        {link.sublinks.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setOpen(false)}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                isSubActive
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "text-muted-foreground hover:bg-muted/60"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isSubActive ? "bg-primary" : "bg-muted-foreground/40"
                                }`}
                              />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full justify-start gap-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing Out..." : "Sign Out"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1.5">
          <img src="/minglelogo.png" alt="Mingle" className="h-6 w-auto object-contain shrink-0" />
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
