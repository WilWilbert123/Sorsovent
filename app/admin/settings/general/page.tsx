import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminGeneralSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure global platform variables and features.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Configuration</CardTitle>
          <CardDescription>Manage global feature flags and limits.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Settings className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>General settings form will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
