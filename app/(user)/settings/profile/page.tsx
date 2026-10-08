import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your display name, username, bio, avatar picture, and social media links.
        </p>
      </div>

      <ProfileSettingsForm profile={profile} />
    </div>
  );
}
