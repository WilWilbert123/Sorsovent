import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminUserReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-destructive">User Reports</h1>
        <p className="text-muted-foreground mt-2">
          Review reports against specific user accounts for harassment or spam.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Moderation Queue</CardTitle>
          <CardDescription>Account-level reports requiring investigation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Users className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>No user reports pending review.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
