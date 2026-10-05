import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPostAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Post & Content Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Analyze community content generation, media attachments, and text length trends.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts Created</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,492</div>
            <p className="text-xs text-muted-foreground">+24% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[400px] flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <BarChart className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p>Post velocity and media upload breakdown charts will be rendered here.</p>
        </div>
      </Card>
    </div>
  );
}
