import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, LayoutDashboard, Users, CalendarDays, AlertTriangle, Settings, LogOut, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  // Check admin role
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = userRole?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "MODERATOR";

  if (!isAdmin) redirect("/");

  const adminNavLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/events", label: "Events", icon: CalendarDays },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/reports", label: "Reports", icon: AlertTriangle },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 bg-card border-r flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-2 px-4 py-4 border-b">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <p className="font-bold text-sm">SORSOVENT</p>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {adminNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t">
          <form action="/api/auth/signout" method="post">
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Admin Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
