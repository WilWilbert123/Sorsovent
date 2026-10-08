import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Flag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminReportedEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-destructive">Reported Events</h1>
        <p className="text-muted-foreground mt-2">
          Events flagged by community members for violating terms of service or community guidelines.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
          <CardDescription>High-priority items requiring immediate administrative action.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Flag className="h-10 w-10 mx-auto mb-4 opacity-50 text-destructive" />
            <p className="text-lg font-medium">All clear</p>
            <p className="text-sm">There are no reported events currently in the queue.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
