import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control push notification preferences and manage live alerts.
        </p>
      </div>

      <NotificationSettingsForm />
    </div>
  );
}
