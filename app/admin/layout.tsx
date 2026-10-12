import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar, AdminMobileHeader } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  const isOwnerEmail = user.email?.toLowerCase() === "johnwilbertgamis2022@gmail.com";
  if (!isOwnerEmail) {
    redirect("/");
  }

  // Check admin role
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = userRole?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "MODERATOR";

  if (!isAdmin) redirect("/");

  const email = user.email || "johnwilbertgamis2022@gmail.com";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-muted/30">
      {/* Mobile Top Header */}
      <AdminMobileHeader userEmail={email} />

      {/* Desktop Sidebar */}
      <AdminSidebar userEmail={email} />

      {/* Admin Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
