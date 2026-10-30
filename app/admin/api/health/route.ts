import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthorizedAdmin } from "@/lib/admin/auth";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: "unauthorized", error: "Authentication required" },
        { status: 401 }
      );
    }

    const isAdmin = await isAuthorizedAdmin(user);
    if (!isAdmin) {
      return NextResponse.json(
        { status: "forbidden", error: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    // Quick query to check DB connection
    const { error } = await supabase.from("user_roles").select("id").limit(1);

    if (error) throw error;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Admin health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Service health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
