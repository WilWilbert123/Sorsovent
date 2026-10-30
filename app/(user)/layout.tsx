import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { isAuthorizedAdmin } from "@/lib/admin/auth";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio")
    .eq("id", user.id)
    .single();

  const isAdmin = await isAuthorizedAdmin(user);

  return (
    <AppShell user={user} profile={profile} isAdmin={isAdmin}>
      {children}
    </AppShell>
  );
}
