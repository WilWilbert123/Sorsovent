import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Palette } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AppearanceSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appearance Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize the look and feel of Sorsovent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Switch between Light, Dark, or System themes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Palette className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Theme selector component will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
