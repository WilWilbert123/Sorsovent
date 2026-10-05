import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Update your public profile, bio, and avatar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Information</CardTitle>
          <CardDescription>This is how you appear to others on Sorsovent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <UserCircle className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Profile editing form will be rendered here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
