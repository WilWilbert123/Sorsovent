import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export const DEFAULT_SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim() ||
  process.env.ADMIN_EMAIL?.toLowerCase().trim() ||
  "";

export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

/**
 * Verifies whether a Supabase user is an authorized Administrator or Moderator.
 * Checks both the configured Super Admin environment variable and `public.user_roles`.
 */
export async function isAuthorizedAdmin(
  user: User | null,
  options?: { allowModerator?: boolean }
): Promise<boolean> {
  if (!user) return false;

  const isOwnerEmail =
    DEFAULT_SUPER_ADMIN_EMAIL !== "" &&
    user.email?.toLowerCase().trim() === DEFAULT_SUPER_ADMIN_EMAIL;

  if (isOwnerEmail) return true;

  const supabaseAdmin = getServiceRoleClient();
  const { data: roleRecord } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = roleRecord?.role;
  const allowModerator = options?.allowModerator ?? true;

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return true;
  }

  if (allowModerator && role === "MODERATOR") {
    return true;
  }

  return false;
}
