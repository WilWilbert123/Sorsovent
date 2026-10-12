import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSystemSettings } from "@/lib/admin/settings";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Please sign in to submit a report" }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId, reason, details } = body;

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ success: false, error: "Missing required report fields" }, { status: 400 });
    }

    const adminSupabase = getServiceRoleSupabase();

    // Prepare insert payload based on target type
    const insertData: any = {
      reporter_id: user.id,
      reason: reason.trim(),
      details: details ? details.trim() : null,
      status: "pending",
    };

    if (targetType === "event") {
      insertData.reported_event_id = targetId;
    } else if (targetType === "user") {
      insertData.reported_user_id = targetId;
    } else if (targetType === "post") {
      insertData.reported_post_id = targetId;
    }

    const { data: newReport, error: insertError } = await adminSupabase
      .from("reports")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert report:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Check count of pending reports for this target
    let targetColumn = "reported_event_id";
    if (targetType === "user") targetColumn = "reported_user_id";
    if (targetType === "post") targetColumn = "reported_post_id";

    const { count: pendingCount } = await adminSupabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq(targetColumn, targetId)
      .eq("status", "pending");

    const settings = getSystemSettings();
    const threshold = settings.autoSuspendThreshold || 5;

    // Log to audit trail
    await adminSupabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "USER_SUBMITTED_REPORT",
      target_type: targetType,
      target_id: targetId,
      metadata: {
        reason,
        details,
        pendingReportsCount: pendingCount || 1,
        threshold,
        isUrgent: (pendingCount || 1) >= threshold,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Report submitted successfully. Our moderation team has been notified.",
      data: newReport,
    });
  } catch (err: any) {
    console.error("Report API error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
