import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    
    if (!username) {
      return NextResponse.json({ success: false, error: "Username parameter is required" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, website, created_at")
      .eq("username", username)
      .single();

    if (error) throw error;
    if (!profile) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
