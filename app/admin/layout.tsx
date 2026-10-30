import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar, AdminMobileHeader } from "@/components/admin/admin-sidebar";
import { isAuthorizedAdmin } from "@/lib/admin/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/mingle/login");

  const isAdmin = await isAuthorizedAdmin(user);
  if (!isAdmin) {
    redirect("/");
  }

  const email = user.email || "Admin";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-muted/30">
      {/* Mobile Top Header */}
      <AdminMobileHeader userEmail={email} />

      {/* Desktop Sidebar */}
      <AdminSidebar userEmail={email} />

      {/* Admin Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto pb-16 sm:pb-8">{children}</div>
      </main>
    </div>
  );
}
