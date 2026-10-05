import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function FollowingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: following } = await supabase
    .from("follows")
    .select(`
      following_id,
      profiles!follows_following_id_fkey (
        username,
        full_name,
        avatar_url,
        bio
      )
    `)
    .eq("follower_id", user.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Following</h1>
      
      {!following || following.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">You aren't following anyone yet</h2>
          <p className="text-muted-foreground mb-6">
            Find people you know and see their updates in your feed.
          </p>
          <Link href="/explore">
            <Button>Find People to Follow</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {following.map((f: any) => {
            const profile = f.profiles;
            if (!profile) return null;
            return (
              <div key={f.following_id} className="flex items-center justify-between p-4 border rounded-xl bg-card">
                <Link href={`/profile/${profile.username}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{(profile.full_name || profile.username)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{profile.full_name || profile.username}</p>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  </div>
                </Link>
                <Button variant="outline" size="sm">Following</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
