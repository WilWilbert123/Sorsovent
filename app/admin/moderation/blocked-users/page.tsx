import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Ban } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminBlockedUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Blocked Users</h1>
        <p className="text-muted-foreground mt-2">
          Manage accounts that have been suspended or permanently banned from the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suspended Accounts Directory</CardTitle>
          <CardDescription>Accounts restricted from logging in or interacting.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Ban className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>No blocked users found.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
