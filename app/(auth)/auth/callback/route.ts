import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isSuperAdmin = user?.email?.toLowerCase() === "johnwilbertgamis2022@gmail.com";
      if (isSuperAdmin && (!next || next === "/home" || next === "/onboarding")) {
        return NextResponse.redirect(new URL("/admin/dashboard", requestUrl.origin));
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL("/auth/login?error=Invalid verification code", requestUrl.origin));
}
