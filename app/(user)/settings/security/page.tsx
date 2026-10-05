import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your password, 2FA, and active sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password & Authentication</CardTitle>
          <CardDescription>Keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <KeyRound className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Security configuration options will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
