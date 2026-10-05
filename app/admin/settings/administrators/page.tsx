import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shield, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminAdministratorsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administrator Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage who has access to the admin dashboard and their permission levels.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Administrator
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Administrators</CardTitle>
          <CardDescription>Users with SUPER_ADMIN or ADMIN roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Shield className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Administrator management interface will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
