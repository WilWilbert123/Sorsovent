import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy Settings</h1>
        <p className="text-muted-foreground mt-2">
          Control who can see your activity and interact with your profile.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visibility Rules</CardTitle>
          <CardDescription>Manage your public footprint.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <EyeOff className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Privacy toggle switches will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
