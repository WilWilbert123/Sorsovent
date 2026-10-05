import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Edit3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function EditPostPage({ params }: { params: { postId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: post } = await supabase
    .from("posts")
    .select("id, content, author_id")
    .eq("id", params.postId)
    .single();

  if (!post) notFound();

  if (post.author_id !== user.id) {
    redirect("/feed"); // Or show unauthorized
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
        <p className="text-muted-foreground mt-2">
          Make changes to your post.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Content</CardTitle>
          <CardDescription>Update your message.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground border rounded-md border-dashed">
            <Edit3 className="h-10 w-10 mx-auto mb-4 opacity-50" />
            <p>Post editor form will be rendered here.</p>
            <Button className="mt-4" variant="outline">Cancel Editing</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
