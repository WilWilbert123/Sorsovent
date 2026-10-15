import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

export async function POST() {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
    } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = getServiceRoleSupabase();
    const nowIso = new Date().toISOString();

    const { error } = await adminClient
      .from("profiles")
      .update({ last_seen_at: nowIso })
      .eq("id", user.id);

    if (error) {
      // If column doesn't exist yet before migration, fail gracefully without erroring
      console.warn("Heartbeat update warning:", error.message);
      return NextResponse.json({ ok: false, message: error.message });
    }

    return NextResponse.json({ ok: true, timestamp: nowIso });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
