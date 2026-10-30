import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import crypto from "crypto";

const ALLOWED_FOLDERS = new Set(["posts", "events", "avatars", "covers", "mingle"]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = checkRateLimit(`cld_sign:${user.id}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many upload signature requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawFolder = typeof body?.folder === "string" ? body.folder.trim() : "posts";
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "posts";

    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const timestamp = Math.round(Date.now() / 1000);

    if (!apiSecret) {
      return NextResponse.json({
        timestamp,
        signature: null,
        folder,
      });
    }

    // Standard Cloudinary parameter signing: sorted `key=value` pairs + apiSecret
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    return NextResponse.json({
      timestamp,
      signature,
      folder,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
