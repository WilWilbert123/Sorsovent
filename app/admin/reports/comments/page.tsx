import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminCommentReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-destructive">Comment Reports</h1>
        <p className="text-muted-foreground mt-2">
          Review abusive or spam comments reported by the community.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comment Moderation Queue</CardTitle>
          <CardDescription>Flagged replies and comments on posts or events.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>No comment reports pending review.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
