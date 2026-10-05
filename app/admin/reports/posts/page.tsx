import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPostReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-destructive">Post Reports</h1>
        <p className="text-muted-foreground mt-2">
          Review community posts flagged for violating guidelines.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Moderation Queue</CardTitle>
          <CardDescription>Consolidated view of all post-related tickets.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <FileText className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>No post reports pending review.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
