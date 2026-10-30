import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafeRedirectPath } from "@/lib/security/sanitize";
import { DEFAULT_SUPER_ADMIN_EMAIL } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(
    requestUrl.searchParams.get("next"),
    "/onboarding"
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Ensure profile row exists in case db trigger was skipped or delayed
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, is_onboarded, username")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          const rawMeta = user.user_metadata || {};
          const fallbackUsername = (
            rawMeta.username ||
            user.email?.split("@")[0] ||
            "user"
          )
            .replace(/[^a-zA-Z0-9_]/g, "_")
            .slice(0, 20);

          await supabase.from("profiles").upsert(
            {
              id: user.id,
              username: `${fallbackUsername}_${Math.random().toString(36).substring(2, 6)}`,
              display_name:
                rawMeta.full_name ||
                rawMeta.name ||
                user.email?.split("@")[0] ||
                "User",
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
        user?.email?.toLowerCase() === DEFAULT_SUPER_ADMIN_EMAIL;
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
