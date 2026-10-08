import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminUserAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor registration velocity, geographic distribution, and user lifecycle metrics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5,329</div>
            <p className="text-xs text-muted-foreground">+18% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Signups (7d)</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">+2% from previous 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[400px] flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p>Registration cohorts and user demographic charts will be rendered here.</p>
        </div>
      </Card>
    </div>
  );
}
