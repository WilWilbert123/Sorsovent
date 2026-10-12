import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSystemSettings, getSystemSettingsFromSupabase, saveSystemSettings } from "@/lib/admin/settings";

const SUPER_ADMIN_EMAIL = "johnwilbertgamis2022@gmail.com";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const adminSupabase = getServiceRoleSupabase();
    const isSuperAdminEmail = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // Check user role in database
    const { data: callerRole } = await adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperAdmin = isSuperAdminEmail || callerRole?.role === "SUPER_ADMIN";
    const isAdmin = isSuperAdmin || callerRole?.role === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Administrative privileges required." }, { status: 403 });
    }

    const body = await request.json();
    const { action, payload } = body;

    switch (action) {
      // 1. Delete an event
      case "delete_event": {
        const { eventId, title } = payload;
        const { error } = await adminSupabase.from("events").delete().eq("id", eventId);
        if (error) throw error;

        // Log action
        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "DELETE_EVENT",
          target_type: "event",
          target_id: eventId,
          metadata: { title, actor_email: user.email },
        });

        return NextResponse.json({ success: true, message: `Event "${title || eventId}" deleted.` });
      }

      // 2. Update event status or visibility
      case "update_event_status": {
        const { eventId, status, is_public, title } = payload;
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (status !== undefined) updateData.status = status;
        if (is_public !== undefined) updateData.is_public = is_public;

        const { error } = await adminSupabase.from("events").update(updateData).eq("id", eventId);
        if (error) throw error;

        // Log action
        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "UPDATE_EVENT_STATUS",
          target_type: "event",
          target_id: eventId,
          metadata: { title, newStatus: status, is_public, actor_email: user.email },
        });

        return NextResponse.json({ success: true, message: "Event status updated." });
      }

      // 3. Update user role
      case "update_user_role": {
        const { targetUserId, newRole, targetUsername } = payload;
        // Do not allow demoting super admin
        if (targetUserId === user.id && newRole !== "SUPER_ADMIN") {
          return NextResponse.json({ success: false, error: "Cannot change Super Admin role." }, { status: 400 });
        }

        const { error } = await adminSupabase.from("user_roles").upsert(
          { user_id: targetUserId, role: newRole, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
        if (error) throw error;

        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "UPDATE_USER_ROLE",
          target_type: "user",
          target_id: targetUserId,
          metadata: { targetUsername, newRole, actor_email: user.email },
        });

        return NextResponse.json({ success: true, message: `Role updated to ${newRole}.` });
      }

      // 4. Toggle user ban/unban
      case "toggle_user_ban": {
        const { targetUserId, isBanned, targetUsername } = payload;
        if (targetUserId === user.id) {
          return NextResponse.json({ success: false, error: "Cannot ban Super Admin." }, { status: 400 });
        }

        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("privacy_settings")
          .eq("id", targetUserId)
          .single();

        const currentSettings = profile?.privacy_settings || {};
        const updatedSettings = { ...currentSettings, is_banned: isBanned };

        const { error } = await adminSupabase
          .from("profiles")
          .update({ privacy_settings: updatedSettings, updated_at: new Date().toISOString() })
          .eq("id", targetUserId);
        if (error) throw error;

        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: isBanned ? "BAN_USER" : "UNBAN_USER",
          target_type: "user",
          target_id: targetUserId,
          metadata: { targetUsername, isBanned, actor_email: user.email },
        });

        return NextResponse.json({
          success: true,
          message: isBanned ? `User @${targetUsername} has been suspended.` : `User @${targetUsername} has been restored.`,
        });
      }

      // 5. Resolve or dismiss report
      case "resolve_report": {
        const { reportId, status: reportStatus, reason } = payload;
        const { error } = await adminSupabase
          .from("reports")
          .update({ status: reportStatus, updated_at: new Date().toISOString() })
          .eq("id", reportId);
        if (error) throw error;

        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: `REPORT_${reportStatus?.toUpperCase()}`,
          target_type: "report",
          target_id: reportId,
          metadata: { reason, status: reportStatus, actor_email: user.email },
        });

        return NextResponse.json({ success: true, message: `Report marked as ${reportStatus}.` });
      }

      // 6. Clear audit logs safely (only affects audit_logs table, nothing else)
      case "clear_audit_logs": {
        const { error } = await adminSupabase
          .from("audit_logs")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
          .neq("action", "SYSTEM_SETTINGS_UPDATE"); // Protect system settings from being erased

        if (error) throw error;

        // Insert fresh single log that logs were cleared
        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "AUDIT_LOGS_PURGED",
          target_type: "system",
          metadata: {
            actor_email: user.email,
            cleared_at: new Date().toISOString(),
            note: "Audit logs table cleared safely without affecting core application data.",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Audit logs successfully cleared! All events, users, and posts remain completely intact.",
        });
      }

      // 7. Save system settings
      case "save_settings": {
        const updated = await saveSystemSettings(payload, user.id);

        return NextResponse.json({
          success: true,
          message: "Platform settings saved and applied to Supabase successfully!",
          data: updated,
        });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Admin action error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const adminSupabase = getServiceRoleSupabase();

    if (type === "audit_logs") {
      const { data: logs, error } = await adminSupabase
        .from("audit_logs")
        .select(`
          id, action, target_type, target_id, metadata, created_at,
          profiles!audit_logs_actor_id_fkey (username, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        // Fallback without join if foreign key not resolved
        const { data: fallbackLogs } = await adminSupabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        return NextResponse.json({ success: true, data: fallbackLogs || [] });
      }

      return NextResponse.json({ success: true, data: logs || [] });
    }

    if (type === "settings") {
      const settings = await getSystemSettingsFromSupabase();
      return NextResponse.json({ success: true, data: settings });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
