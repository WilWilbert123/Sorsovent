import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSystemSettingsFromSupabase, saveSystemSettings } from "@/lib/admin/settings";
import { isAuthorizedAdmin } from "@/lib/admin/auth";

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
    const isAdmin = await isAuthorizedAdmin(user);

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

        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "DELETE_EVENT",
          target_type: "event",
          target_id: eventId,
          metadata: { title, actor_email: user.email },
        });

        return NextResponse.json({ success: true, message: `Event "${title || eventId}" deleted.` });
      }

      // 2. Update event status or visibility (safe schema column handler)
      case "update_event_status": {
        const { eventId, status, is_public, title } = payload;
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (status !== undefined) updateData.status = status;
        if (is_public !== undefined) {
          updateData.visibility = is_public ? "public" : "private";
        }

        let { error } = await adminSupabase.from("events").update(updateData).eq("id", eventId);
        if (error && (error.message.includes("visibility") || error.message.includes("column"))) {
          const fallbackData: Record<string, any> = { updated_at: new Date().toISOString() };
          if (status !== undefined) fallbackData.status = status;
          if (is_public !== undefined) fallbackData.is_public = is_public;
          const res = await adminSupabase.from("events").update(fallbackData).eq("id", eventId);
          error = res.error;
        }
        if (error) throw error;

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
        const updatedSettings = { ...currentSettings, is_banned: Boolean(isBanned) };

        const { error } = await adminSupabase
          .from("profiles")
          .update({ privacy_settings: updatedSettings, updated_at: new Date().toISOString() })
          .eq("id", targetUserId);
        if (error) throw error;

        // Also enforce ban at Supabase Auth identity level when service role key is present
        try {
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            await adminSupabase.auth.admin.updateUserById(targetUserId, {
              ban_duration: isBanned ? "876000h" : "none",
            });
          }
        } catch (authBanErr) {
          console.warn("Supabase Auth ban_duration update note:", authBanErr);
        }

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

      // 6. Clear audit logs safely
      case "clear_audit_logs": {
        const { error } = await adminSupabase
          .from("audit_logs")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000")
          .neq("action", "SYSTEM_SETTINGS_UPDATE");

        if (error) throw error;

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

      // 7. Clear a specific safe table to reclaim database storage space
      case "clear_table": {
        const { tableName } = payload;
        const SAFE_TABLES = ["audit_logs", "notifications", "reports", "comment_likes"];

        if (!SAFE_TABLES.includes(tableName)) {
          return NextResponse.json(
            { success: false, error: `Table "${tableName}" is protected and cannot be cleared.` },
            { status: 400 }
          );
        }

        // Delete all rows in the safe table
        const { error } = await adminSupabase
          .from(tableName)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        if (error) throw error;

        await adminSupabase.from("audit_logs").insert({
          actor_id: user.id,
          action: "CLEAR_TABLE",
          target_type: "database",
          target_id: tableName,
          metadata: {
            tableName,
            actor_email: user.email,
            cleared_at: new Date().toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          message: `Table "${tableName}" cleared successfully. Storage space reclaimed.`,
        });
      }

      // 8. Save system settings
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
  } catch (err: unknown) {
    console.error("Admin action error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isAuthorizedAdmin(user))) {
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

    // Live Supabase Database Tables Space & Row Count Monitor
    if (type === "database_tables") {
      const TABLE_DEFS = [
        { name: "events", label: "Events", category: "Core Content", safeToClear: false, desc: "Gatherings & activities (Protected)" },
        { name: "event_attendees", label: "Event RSVPs", category: "Core Content", safeToClear: false, desc: "Attendee confirmations (Protected)" },
        { name: "event_messages", label: "Event Chat", category: "Core Content", safeToClear: false, desc: "Group chat history for events (Protected)" },
        { name: "posts", label: "Feed Posts", category: "Core Content", safeToClear: false, desc: "Community timeline posts (Protected)" },
        { name: "post_media", label: "Post Media", category: "Core Content", safeToClear: false, desc: "Photos & video asset links (Protected)" },
        { name: "comments", label: "Comments", category: "Core Content", safeToClear: false, desc: "Post replies & comments (Protected)" },
        { name: "likes", label: "Post Likes", category: "Social Engagement", safeToClear: false, desc: "Post reactions (Protected)" },
        { name: "comment_likes", label: "Comment Likes", category: "Social Engagement", safeToClear: true, desc: "Heart reactions on comments (Safe to clear)" },
        { name: "follows", label: "User Follows", category: "Social Engagement", safeToClear: false, desc: "Social graph connections (Protected)" },
        { name: "profiles", label: "User Profiles", category: "User Accounts", safeToClear: false, desc: "User accounts & credentials (Strictly Protected)" },
        { name: "user_roles", label: "User Roles", category: "Security", safeToClear: false, desc: "Admin permissions & access control (Strictly Protected)" },
        { name: "notifications", label: "Notifications", category: "Activity & Logs", safeToClear: true, desc: "In-app alerts & push logs (Safe to clear)" },
        { name: "audit_logs", label: "Audit Logs", category: "Activity & Logs", safeToClear: true, desc: "Historical admin actions trail (Safe to clear)" },
        { name: "reports", label: "Moderation Reports", category: "Moderation", safeToClear: true, desc: "Reported content & resolutions (Safe to clear)" },
        { name: "places", label: "Sorsogon Places", category: "Directory", safeToClear: false, desc: "Tourist landmarks & venues (Protected)" },
        { name: "system_settings", label: "System Settings", category: "Configuration", safeToClear: false, desc: "Global toggles & announcements (Protected)" },
      ];

      const tablesData = await Promise.all(
        TABLE_DEFS.map(async (def) => {
          try {
            const { count, error } = await adminSupabase
              .from(def.name)
              .select("*", { count: "exact", head: true });

            const rowCount = error ? 0 : (count ?? 0);
            // Table disk estimate: base table overhead ~32KB + avg 500 bytes per row + index overhead
            const estimatedBytes = rowCount > 0 ? 32768 + rowCount * 512 : 16384;

            return {
              ...def,
              rowCount,
              estimatedBytes,
              exists: !error,
            };
          } catch {
            return {
              ...def,
              rowCount: 0,
              estimatedBytes: 16384,
              exists: false,
            };
          }
        })
      );

      return NextResponse.json({ success: true, data: tablesData });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err: unknown) {
    console.error("Admin GET error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
