import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingRootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, is_onboarded")
    .eq("id", user.id)
    .single();

  if (profile?.is_onboarded) {
    redirect("/home");
  }

  // Determine where to send them based on what's missing
  if (!profile?.username) {
    redirect("/onboarding/username");
  } else if (!profile?.full_name) {
    redirect("/onboarding/profile");
  } else {
    redirect("/onboarding/interests");
  }
}
