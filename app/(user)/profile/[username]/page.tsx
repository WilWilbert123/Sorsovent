import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MapPin, CalendarDays, Users, Link2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FeedPost } from "@/components/feed/feed-post";
import { FollowButton } from "@/components/profile/follow-button";
import { format } from "date-fns";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Fetch profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !profile) notFound();

  const isOwnProfile = currentUser?.id === profile.id;

  // Check if following
  let isFollowing = false;
  if (currentUser && !isOwnProfile) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", profile.id)
      .single();
    isFollowing = !!data;
  }

  // Fetch stats
  const [{ count: postCount }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);

  // Fetch posts
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id, content, media_urls, location_name, location_lat, location_lng,
      created_at, like_count, comment_count,
      profiles!posts_author_id_fkey (
        id, username, full_name, avatar_url
      )
    `)
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const displayName = profile.full_name || profile.username;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinedDate = profile.created_at
    ? format(new Date(profile.created_at), "MMMM yyyy")
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex gap-2">
            {isOwnProfile ? (
            <a href="/settings/profile">
              <Button variant="outline" size="sm">Edit Profile</Button>
            </a>
            ) : currentUser ? (
              <FollowButton
                targetUserId={profile.id}
                currentUserId={currentUser.id}
                isFollowing={isFollowing}
              />
            ) : null}
          </div>
        </div>

        <h1 className="text-xl font-bold">{displayName}</h1>
        <p className="text-muted-foreground text-sm">@{profile.username}</p>

        {profile.bio && (
          <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p>
        )}

        <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {profile.location}
            </span>
          )}
          {joinedDate && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Joined {joinedDate}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="text-center">
            <p className="font-bold">{postCount || 0}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70">
            <p className="font-bold">{followerCount || 0}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70">
            <p className="font-bold">{followingCount || 0}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Posts */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <FeedPost key={post.id} post={post as any} currentUserId={currentUser?.id || ""} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>No posts yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events">
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No events yet.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
