import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Control how and when you want to receive alerts from Sorsovent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email & Push Preferences</CardTitle>
          <CardDescription>Manage your communication channels.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <BellRing className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Notification toggles will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
