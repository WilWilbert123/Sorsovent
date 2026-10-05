import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          View all administrative actions and security events across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>Recent administrative activities and automated system actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px] flex items-center justify-center bg-muted/20 rounded-md border border-dashed">
            <div className="text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-4 opacity-50" />
              <p>Audit log viewer will be implemented here.</p>
              <p className="text-sm mt-2">Currently fetching data from secure logging cluster...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
