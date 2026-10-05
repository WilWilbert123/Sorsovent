import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSecuritySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage platform security, API access, and authentication requirements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Configuration</CardTitle>
          <CardDescription>Advanced security policies for the Sorsovent platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Lock className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Security settings form will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
