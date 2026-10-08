import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminModerationSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moderation Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure automated moderation rules, word filters, and reporting thresholds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automated Rules</CardTitle>
          <CardDescription>Adjust how the system handles flagged content.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <ShieldAlert className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Moderation configuration interface will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
