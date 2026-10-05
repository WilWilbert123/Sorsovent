import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MessageSquare, ShieldAlert, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminPostDetailsPage({ params }: { params: { postId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Post Moderation</h1>
          <p className="text-muted-foreground mt-2">
            Review content for ID: {params.postId}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-destructive border-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Post
          </Button>
          <Button variant="outline">
            <ShieldAlert className="mr-2 h-4 w-4" /> Issue Warning
          </Button>
        </div>
      </div>

      <Card className="min-h-[400px] flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-50" />
          <p>Post content review interface will be implemented here.</p>
        </div>
      </Card>
    </div>
  );
}
