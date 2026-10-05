import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ success: true, data: { session: null } }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: { session } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
