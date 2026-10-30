import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient, isAuthorizedAdmin } from "@/lib/admin/auth";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdminOrSuper = await isAuthorizedAdmin(user);
    if (!isAdminOrSuper) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const adminSupabase = getServiceRoleClient();

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
      admins: users.filter(
        (u: any) =>
          u.user_roles?.role === "ADMIN" || u.user_roles?.role === "SUPER_ADMIN"
      ).length,
      moderators: users.filter((u: any) => u.user_roles?.role === "MODERATOR")
        .length,
      suspended: users.filter((u: any) => Boolean(u.privacy_settings?.is_banned))
        .length,
    };

    return NextResponse.json({
      success: true,
      data: users,
      stats,
    });
  } catch (error: any) {
    console.error("Admin users GET API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
