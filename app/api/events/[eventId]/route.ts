import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const SUPER_ADMIN_EMAIL = "johnwilbertgamis2022@gmail.com";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const eventId = resolvedParams?.eventId;

    if (!eventId) {
      return NextResponse.json({ success: false, error: "Missing event ID" }, { status: 400 });
    }

    const adminSupabase = getServiceRoleSupabase();

    // Check if event exists and get ownership using valid column creator_id
    const { data: event, error: fetchError } = await adminSupabase
      .from("events")
      .select("id, title, creator_id")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      console.error("Fetch event error on DELETE:", fetchError);
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const isCreator = user.id === event.creator_id;
    const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!isCreator && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Only the event creator or an administrator can delete this event." },
        { status: 403 }
      );
    }

    // Delete the event
    const { error: deleteError } = await adminSupabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      throw deleteError;
    }

    // Optional audit log
    try {
      await adminSupabase.from("audit_logs").insert({
        actor_id: user.id,
        action: "DELETE_EVENT",
        target_type: "event",
        target_id: eventId,
        metadata: { title: event.title, deleted_by: user.email },
      });
    } catch {
      // Ignore if audit_logs table is unavailable
    }

    return NextResponse.json({
      success: true,
      message: `Event "${event.title || eventId}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Delete event error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete event." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> | { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const eventId = resolvedParams?.eventId;

    if (!eventId) {
      return NextResponse.json({ success: false, error: "Missing event ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, is_public } = body;

    const adminSupabase = getServiceRoleSupabase();

    // Verify ownership using valid column creator_id
    const { data: event, error: fetchError } = await adminSupabase
      .from("events")
      .select("id, title, creator_id, status")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      console.error("Fetch event error on PATCH:", fetchError);
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const isCreator = user.id === event.creator_id;
    const isSuperAdmin = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (!isCreator && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Only the event creator or an administrator can update this event." },
        { status: 403 }
      );
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (is_public !== undefined) {
      updateData.is_public = is_public;
    }

    const { data: updatedEvent, error: updateError } = await adminSupabase
      .from("events")
      .update(updateData)
      .eq("id", eventId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message:
        status === "completed"
          ? "Event marked as completed / done!"
          : status === "published"
          ? "Event marked as active."
          : "Event status updated.",
    });
  } catch (error: any) {
    console.error("Update event error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update event." },
      { status: 500 }
    );
  }
}
