import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/format";
import { Compass, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PublicExplorePage() {
  const supabase = await createClient();
  
  // Fetch some popular public content for the explore page
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id, content, created_at, location_name, like_count,
      profiles!posts_author_id_fkey (username, full_name, avatar_url)
    `)
    .order("like_count", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Explore Sorsogon</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Discover trending posts, popular events, and beautiful places in your community.
        </p>
        
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search events, places, or people..." 
            className="w-full h-12 pl-10 pr-4 rounded-full border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            disabled
          />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" /> Trending Now
          </h2>
          
          {posts?.map((post: any) => (
            <div key={post.id} className="border rounded-2xl p-5 bg-card hover:border-primary/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium">
                  {post.profiles?.full_name || post.profiles?.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(post.created_at)}
                </div>
              </div>
              <p className="text-sm line-clamp-3 mb-3">{post.content}</p>
              {post.location_name && (
                <div className="flex items-center gap-1 text-xs text-primary bg-primary/5 w-fit px-2 py-1 rounded-md">
                  <MapPin className="h-3 w-3" />
                  {post.location_name}
                </div>
              )}
              <Link href={`/posts/${post.id}`} className="text-xs text-muted-foreground hover:underline mt-4 inline-block">
                View full post →
              </Link>
            </div>
          ))}
        </div>
        
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-lg mb-2">Join the Community</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Sign up to like, comment, save posts, and RSVP to events in Sorsogon.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/auth/register">
                <Button className="w-full">Create Account</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
            </div>
          </div>
          
          <div className="border rounded-2xl p-6 bg-card">
            <h3 className="font-bold mb-4">Quick Links</h3>
            <div className="flex flex-col gap-3 text-sm">
              <Link href="/events" className="text-muted-foreground hover:text-primary transition-colors">Upcoming Events</Link>
              <Link href="/places" className="text-muted-foreground hover:text-primary transition-colors">Local Places</Link>
              <Link href="/map" className="text-muted-foreground hover:text-primary transition-colors">Interactive Map</Link>
              <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Sorsovent</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
