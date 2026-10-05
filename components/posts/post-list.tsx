import { MessageSquare } from "lucide-react";

interface PostListProps {
  posts?: any[];
}

export function PostList({ posts = [] }: PostListProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 border rounded-xl border-dashed bg-card">
        <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-20" />
        <p className="text-muted-foreground">No posts found in this feed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mapping out feed posts typically goes here */}
      <div className="text-center py-4 text-sm text-muted-foreground">
        End of feed.
      </div>
    </div>
  );
}
