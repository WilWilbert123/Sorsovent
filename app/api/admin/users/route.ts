import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const SUPER_ADMIN_EMAIL = "johnwilbertgamis2022@gmail.com";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getServiceRoleSupabase();

    // Verify admin role or super admin email
    const isSuperAdminEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
    const { data: userRole } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdminOrSuper =
      isSuperAdminEmail ||
      userRole?.role === "SUPER_ADMIN" ||
      userRole?.role === "ADMIN" ||
      userRole?.role === "MODERATOR";

    if (!isAdminOrSuper) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Fetch all profiles with their assigned user_roles
    const { data: rawUsers, error } = await adminSupabase
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin users:", error);
      throw error;
    }

    // Normalize roles
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

    const stats = {
      total: users.length,
      admins: users.filter((u: any) => u.user_roles?.role === "ADMIN" || u.user_roles?.role === "SUPER_ADMIN").length,
      moderators: users.filter((u: any) => u.user_roles?.role === "MODERATOR").length,
      suspended: users.filter((u: any) => Boolean(u.privacy_settings?.is_banned)).length,
    };

    return NextResponse.json({
      success: true,
      data: users,
      stats,
    });
  } catch (error: any) {
    console.error("Admin users GET API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
