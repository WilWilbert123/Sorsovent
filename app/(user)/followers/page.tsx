import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function FollowersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: followers } = await supabase
    .from("follows")
    .select(`
      follower_id,
      profiles!follows_follower_id_fkey (
        username,
        full_name,
        avatar_url,
        bio
      )
    `)
    .eq("following_id", user.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Followers</h1>
      
      {!followers || followers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No followers yet</h2>
          <p className="text-muted-foreground mb-6">
            Share posts and attend events to connect with more people.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {followers.map((f: any) => {
            const profile = f.profiles;
            if (!profile) return null;
            return (
              <div key={f.follower_id} className="flex items-center justify-between p-4 border rounded-xl bg-card">
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
                {/* Check if you follow them back could be added here */}
                <Button variant="outline" size="sm">View Profile</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
