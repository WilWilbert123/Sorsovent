import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Send global announcements or targeted alerts to platform users.
          </p>
        </div>
        <Button>
          <Bell className="mr-2 h-4 w-4" /> New Broadcast
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Broadcast History</CardTitle>
          <CardDescription>Previously sent global announcements.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Bell className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>No broadcast history found.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
