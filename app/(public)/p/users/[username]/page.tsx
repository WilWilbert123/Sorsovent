import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default async function PublicUserProfilePage({ params }: { params: { username: string } }) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url, bio")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="border rounded-3xl p-8 bg-card shadow-sm text-center mb-8 relative overflow-hidden">
        {/* Background banner placeholder */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 to-primary/5"></div>
        
        <div className="relative z-10 pt-12">
          <Avatar className="h-32 w-32 mx-auto border-4 border-background shadow-md mb-6">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-3xl">{(profile.full_name || profile.username)[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <h1 className="text-3xl font-bold mb-1">{profile.full_name || profile.username}</h1>
          <p className="text-lg text-muted-foreground mb-6">@{profile.username}</p>
          
          {profile.bio && (
            <p className="max-w-lg mx-auto text-foreground/80 mb-8 leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-3xl p-8 text-center shadow-sm">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Private Profile Details</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Sign in to Sorsovent to view {profile.full_name || profile.username}'s posts, events, and to follow them.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={`/auth/login?next=/profile/${profile.username}`}>
            <Button size="lg" className="w-full sm:w-auto">Sign In</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">Create Account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
