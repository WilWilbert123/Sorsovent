import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SUPER_ADMIN_EMAIL } from "@/lib/admin/auth";
import { getSafeRedirectPath } from "@/lib/security/sanitize";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") || "/home";
  const next = getSafeRedirectPath(rawNext, "/home");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, is_onboarded")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          const rawMeta = user.user_metadata || {};
          const fallbackUsername =
            rawMeta.user_name ||
            rawMeta.name?.toLowerCase().replace(/\s+/g, "") ||
            user.email?.split("@")[0] ||
            `user_${user.id.substring(0, 8)}`;

          await supabase.from("profiles").upsert(
            {
              id: user.id,
              username: fallbackUsername,
              full_name: rawMeta.full_name || rawMeta.name || null,
              display_name: rawMeta.full_name || rawMeta.name || null,
              avatar_url: rawMeta.avatar_url || rawMeta.picture || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        } else if (existingProfile.is_onboarded && next === "/onboarding") {
          return NextResponse.redirect(new URL("/home", requestUrl.origin));
        }
      }

      const isSuperAdmin =
        DEFAULT_SUPER_ADMIN_EMAIL !== "" &&
        user?.email?.toLowerCase().trim() === DEFAULT_SUPER_ADMIN_EMAIL;
      if (isSuperAdmin && (!next || next === "/home" || next === "/onboarding")) {
        return NextResponse.redirect(
          new URL("/admin/dashboard", requestUrl.origin)
        );
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=Invalid verification code", requestUrl.origin)
  );
}
