import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarDays, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminEventReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-destructive">Event Reports</h1>
        <p className="text-muted-foreground mt-2">
          Review events flagged for inappropriate content or safety concerns.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Moderation Queue</CardTitle>
          <CardDescription>Consolidated view of all event-related tickets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <CalendarDays className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>No event reports pending review.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
