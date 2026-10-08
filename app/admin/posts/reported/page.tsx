import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminReportedPostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-destructive">Reported Posts</h1>
        <p className="text-muted-foreground mt-2">
          Review community posts that have been flagged for rules violations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Moderation Queue</CardTitle>
          <CardDescription>Posts awaiting administrative review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>No reported posts at this time.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
