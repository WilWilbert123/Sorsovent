import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication failed" } },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: true, data: { session: null, user: null } },
        { status: 200 }
      );
    }

    // Return only non-sensitive user metadata (never expose raw access_token or refresh_token)
    const safeUser = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      created_at: user.created_at,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          user: safeUser,
          session: { user: safeUser },
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
