import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = checkRateLimit(`upload_del:${user.id}`, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many delete requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const publicId =
      typeof body?.public_id === "string" ? body.public_id.trim() : "";

    if (!publicId || publicId.length > 256 || !/^[a-zA-Z0-9_\-/]+$/.test(publicId)) {
      return NextResponse.json({ error: "Invalid public_id" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
