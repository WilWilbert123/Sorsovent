import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";

export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Keep your account secure by updating your password.
        </p>
      </div>

      <SecuritySettingsForm />
    </div>
  );
}
