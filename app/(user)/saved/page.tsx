import { Bookmark, CalendarDays, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SavedRootPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Saved Items</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/saved/events" className="block group">
          <div className="border rounded-2xl p-6 bg-card hover:border-primary transition-colors h-full flex flex-col">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Saved Events</h2>
            <p className="text-muted-foreground flex-1">
              Events you've bookmarked to check out later.
            </p>
            <div className="mt-4 pt-4 border-t flex items-center text-sm font-medium text-primary">
              View saved events →
            </div>
          </div>
        </Link>
        
        <Link href="/saved/posts" className="block group">
          <div className="border rounded-2xl p-6 bg-card hover:border-primary transition-colors h-full flex flex-col">
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Saved Posts</h2>
            <p className="text-muted-foreground flex-1">
              Community posts, recommendations, and discussions you've saved.
            </p>
            <div className="mt-4 pt-4 border-t flex items-center text-sm font-medium text-primary">
              View saved posts →
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
