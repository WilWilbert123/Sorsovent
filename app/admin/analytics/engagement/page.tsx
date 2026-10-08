import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminEngagementAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  // In a real application, verify admin role here
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Engagement Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track user engagement, interactions, and retention across the platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <p className="text-xs text-muted-foreground">+5.2% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[400px] flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p>Detailed engagement charts will be rendered here.</p>
        </div>
      </Card>
    </div>
  );
}
