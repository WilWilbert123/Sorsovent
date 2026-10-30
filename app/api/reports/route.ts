import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSystemSettingsFromSupabase } from "@/lib/admin/settings";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

const reportSchema = z.object({
  targetType: z.enum(["event", "user", "post"]),
  targetId: z.string().uuid("Invalid target ID"),
  reason: z.string().min(2).max(200),
  details: z.string().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to submit a report" },
        { status: 401 }
      );
    }

    const rate = checkRateLimit(`report_submit:${user.id}`, 8, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many reports submitted. Please wait ${rate.retryAfterSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || "Missing required report fields",
        },
        { status: 400 }
      );
    }

    const { targetType, targetId, reason, details } = parsed.data;

    if (targetType === "user" && targetId === user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot report your own account." },
        { status: 400 }
      );
    }

    const adminSupabase = getServiceRoleSupabase();

    let targetColumn = "reported_event_id";
    if (targetType === "user") targetColumn = "reported_user_id";
    if (targetType === "post") targetColumn = "reported_post_id";

    // Prevent duplicate pending reports from the same user for the same target
    const { data: existingReport } = await adminSupabase
      .from("reports")
      .select("id")
      .eq("reporter_id", user.id)
      .eq(targetColumn, targetId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json({
        success: true,
        message: "You have already reported this item. Our moderation team is reviewing it.",
        data: existingReport,
      });
    }

    const insertData: Record<string, any> = {
      reporter_id: user.id,
      reason: reason.trim(),
      details: details ? details.trim() : null,
      status: "pending",
      [targetColumn]: targetId,
    };

    const { data: newReport, error: insertError } = await adminSupabase
      .from("reports")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert report:", insertError);
      return NextResponse.json(
        { success: false, error: "Could not submit report" },
        { status: 500 }
      );
    }

    const { count: pendingCount } = await adminSupabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq(targetColumn, targetId)
      .eq("status", "pending");

    const settings = await getSystemSettingsFromSupabase();
    const threshold = settings.autoSuspendThreshold || 5;

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
      message:
        "Report submitted successfully. Our moderation team has been notified.",
      data: newReport,
    });
  } catch (err: unknown) {
    console.error("Report API error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
