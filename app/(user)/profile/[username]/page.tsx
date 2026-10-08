import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MapPin, CalendarDays, Users, Share2, Camera, MessageCircle, Video, Briefcase, MessageSquare, Edit, Star, Ticket } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FeedPost } from "@/components/feed/feed-post";
import { FollowButton } from "@/components/profile/follow-button";
import { safeFormatDate } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import Link from "next/link";

import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  TikTokIcon,
  LinkedInIcon,
  Globe,
} from "@/components/profile/social-icons";

interface ProfilePageProps {
  params: Promise<{ username: string }> | { username: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = await params;
  const username = resolvedParams?.username;

  if (!username) notFound();

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

  // Fetch stats & posts & events in parallel
  const [
    { count: postCount },
    { count: followerCount },
    { count: followingCount },
    { data: posts },
    { data: hostedEvents },
    { data: joinedRows },
  ] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", profile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
    supabase
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
      .limit(20),
    supabase
      .from("events")
      .select("*")
      .or(`creator_id.eq.${profile.id},organizer_id.eq.${profile.id}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_attendees")
      .select("events(*)")
      .eq("user_id", profile.id)
      .eq("status", "attending"),
  ]);

  const joinedEvents = (joinedRows || []).map((r: any) => r.events).filter(Boolean);

  const displayName = profile.full_name || profile.display_name || profile.username;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinedDate = safeFormatDate(profile.created_at, "MMMM yyyy");

  // Check social links with official SVG logos
  const socialLinks = [
    { name: "Website", url: profile.website, icon: Globe, color: "hover:text-primary text-muted-foreground" },
    { name: "Facebook", url: profile.facebook_url, icon: FacebookIcon, color: "hover:text-blue-600 text-blue-500" },
    { name: "Instagram", url: profile.instagram_url, icon: InstagramIcon, color: "hover:text-pink-600 text-pink-500" },
    { name: "Twitter", url: profile.twitter_url, icon: TwitterIcon, color: "hover:text-foreground text-foreground/80" },
    { name: "TikTok", url: profile.tiktok_url, icon: TikTokIcon, color: "hover:text-foreground text-foreground/90" },
    { name: "LinkedIn", url: profile.linkedin_url, icon: LinkedInIcon, color: "hover:text-blue-700 text-blue-600" },
  ].filter((link) => link.url);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Profile Header Card */}
      <div className="border rounded-2xl p-6 bg-card shadow-sm mb-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
          <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-sm">
            <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex flex-wrap items-center gap-2">
            {isOwnProfile ? (
              <Link href="/settings/profile">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="h-4 w-4" /> Edit Profile
                </Button>
              </Link>
            ) : currentUser ? (
              <>
                <FollowButton
                  targetUserId={profile.id}
                  currentUserId={currentUser.id}
                  isFollowing={isFollowing}
                />
                <Link href="/messages">
                  <Button variant="secondary" size="sm" className="gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Message
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-muted-foreground text-sm font-medium">@{profile.username}</p>

        {profile.bio && (
          <p className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{profile.bio}</p>
        )}

        <div className="flex flex-wrap gap-4 mt-4 text-xs sm:text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              {profile.location}
            </span>
          )}
          {joinedDate && (
            <span className="flex items-center gap-1.5 font-medium">
              <CalendarDays className="h-4 w-4 text-primary" />
              Joined {joinedDate}
            </span>
          )}
        </div>

        {/* Social Media Links */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {socialLinks.map((link) => {
              const IconComp = link.icon;
              return (
                <a
                  key={link.name}
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 text-xs font-semibold text-foreground transition-all hover:bg-secondary ${link.color}`}
                >
                  <IconComp className="h-3.5 w-3.5" />
                  {link.name}
                </a>
              );
            })}
          </div>
        )}

        {/* Stats Bar */}
        <div className="flex gap-8 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="font-bold text-lg">{postCount || 0}</p>
            <p className="text-xs text-muted-foreground font-medium">Posts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{(hostedEvents || []).length}</p>
            <p className="text-xs text-muted-foreground font-medium">Events Hosted</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{followerCount || 0}</p>
            <p className="text-xs text-muted-foreground font-medium">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{followingCount || 0}</p>
            <p className="text-xs text-muted-foreground font-medium">Following</p>
          </div>
        </div>
      </div>

      {/* Tabs for Posts, Hosted Events, Joined Events */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full mb-6 grid grid-cols-3">
          <TabsTrigger value="posts" className="gap-1.5 text-xs sm:text-sm font-semibold">
            Posts ({posts?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="hosted" className="gap-1.5 text-xs sm:text-sm font-semibold">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            Hosted ({(hostedEvents || []).length})
          </TabsTrigger>
          <TabsTrigger value="joined" className="gap-1.5 text-xs sm:text-sm font-semibold">
            <Ticket className="h-3.5 w-3.5 text-emerald-400" />
            Joined ({(joinedEvents || []).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <FeedPost key={post.id} post={post as any} currentUserId={currentUser?.id || ""} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border rounded-2xl bg-card">
              <p className="font-medium">No posts shared yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="hosted">
          {hostedEvents && hostedEvents.length > 0 ? (
            <div className="space-y-3">
              {hostedEvents.map((event) => (
                <ProfileEventCard key={event.id} event={event} badge="Organizer" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border rounded-2xl bg-card">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-30 text-amber-400" />
              <p className="font-medium">No hosted events yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="joined">
          {joinedEvents && joinedEvents.length > 0 ? (
            <div className="space-y-3">
              {joinedEvents.map((event) => (
                <ProfileEventCard key={event.id} event={event} badge="Attending" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border rounded-2xl bg-card">
              <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-400" />
              <p className="font-medium">No joined events yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileEventCard({ event, badge }: { event: any; badge: string }) {
  const emoji = getCategoryEmoji(event.category, event.title);
  const dateVal = event.start_time || event.event_date || event.created_at;
  const monthStr = safeFormatDate(dateVal, "MMM");
  const dayStr = safeFormatDate(dateVal, "d");

  return (
    <Link href={`/events/${event.id}`}>
      <div className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all group">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center shrink-0 text-primary border border-primary/20">
          {monthStr && dayStr ? (
            <>
              <span className="text-[10px] font-semibold uppercase">{monthStr}</span>
              <span className="text-base font-bold leading-none">{dayStr}</span>
            </>
          ) : (
            <span className="text-2xl">{emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{emoji}</span>
            <h4 className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors">
              {event.title}
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {event.location_name && (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{event.location_name}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.attendee_count || 0} attending
            </span>
          </div>
        </div>

        <Badge variant={badge === "Organizer" ? "default" : "secondary"} className="shrink-0 text-xs">
          {badge}
        </Badge>
      </div>
    </Link>
  );
}
