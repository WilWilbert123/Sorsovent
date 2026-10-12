import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AdminUsersManager } from "@/components/admin/admin-users-manager";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminSupabase = getServiceRoleSupabase();

  // Fetch all profiles with their assigned user_roles using service role
  const { data: rawUsers } = await adminSupabase
    .from("profiles")
    .select(`
      id,
      username,
      display_name,
      full_name,
      avatar_url,
      created_at,
      privacy_settings,
      user_roles (
        role
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  // Normalize user roles into a consistent structure
  const users = (rawUsers || []).map((u: any) => {
    let role = "USER";
    if (Array.isArray(u.user_roles)) {
      role = u.user_roles[0]?.role || "USER";
    } else if (u.user_roles && typeof u.user_roles === "object") {
      role = u.user_roles.role || "USER";
    }

    return {
      id: u.id,
      username: u.username,
      display_name: u.display_name || u.full_name || u.username,
      full_name: u.full_name || u.display_name || u.username,
      avatar_url: u.avatar_url,
      created_at: u.created_at,
      privacy_settings: u.privacy_settings,
      user_roles: { role },
    };
  });

  return (
    <AdminUsersManager
      initialUsers={users}
      currentAdminEmail={user?.email || "johnwilbertgamis2022@gmail.com"}
    />
  );
}
