import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminRemovedContentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/sorsovent/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Removed Content</h1>
        <p className="text-muted-foreground mt-2">
          Archive of posts, events, and comments that were taken down by moderators.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Graveyard</CardTitle>
          <CardDescription>Records are kept for 90 days before permanent deletion.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Trash2 className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Archive is empty.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
