import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST to sign out." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
