import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import {
  MapPin,
  CalendarDays,
  Users,
  Edit,
  Star,
  Ticket,
  Settings,
  Sparkles,
  PlusCircle,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Heart,
  FileText,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FeedPost, FeedPostData } from "@/components/feed/feed-post";
import { CommentData } from "@/components/feed/post-comments";
import { FollowButton } from "@/components/profile/follow-button";
import { MessageButton } from "@/components/profile/message-button";
import { ProfileShareButton } from "@/components/profile/profile-share-button";
import { ProfileAvatarUploader } from "@/components/profile/profile-avatar-uploader";
import { ProfileCoverUploader } from "@/components/profile/profile-cover-uploader";
import {
  ProfileBackButton,
  CopyUsernamePill,
} from "@/components/profile/profile-header-actions";
import { safeFormatDate, formatEventDate } from "@/lib/utils";
import Link from "next/link";

import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  TikTokIcon,
  LinkedInIcon,
  Globe,
} from "@/components/profile/social-icons";
import { UserPresenceIndicator } from "@/components/presence/user-presence-indicator";

export const dynamic = "force-dynamic";

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createAdminClient(url, key);
}

interface ProfilePageProps {
  params: Promise<{ username: string }> | { username: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = await params;
  const username = decodeURIComponent(resolvedParams?.username || "");

  if (!username) notFound();

  const supabase = await createClient();
  const adminSupabase = getServiceRoleSupabase();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Fetch profile by username
  const { data: profile, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error || !profile) notFound();

  const isOwnProfile = currentUser?.id === profile.id;

  // Check if following
  let isFollowing = false;
  if (currentUser && !isOwnProfile) {
    const { data } = await adminSupabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!data;
  }

  // Fetch stats, role, full posts (with media, likes, comments), hosted events, and joined events in parallel
  const [
    { count: postCount },
    { count: followerCount },
    { count: followingCount },
    roleRes,
    postsRes,
    { data: hostedEvents },
    { data: joinedRows },
  ] = await Promise.all([
    adminSupabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", profile.id),
    adminSupabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    adminSupabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    adminSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .maybeSingle(),
    adminSupabase
      .from("posts")
      .select(`
        id,
        author_id,
        content,
        location_name,
        created_at,
        updated_at,
        profiles!posts_author_id_fkey (
          id,
          username,
          full_name,
          display_name,
          avatar_url
        ),
        likes (
          user_id
        ),
        comments (
          id,
          author_id,
          parent_id,
          content,
          is_hidden,
          created_at,
          updated_at,
          profiles!comments_author_id_fkey (
            id,
            username,
            full_name,
            display_name,
            avatar_url
          ),
          comment_likes (
            user_id
          )
        ),
        post_media (
          media_url,
          media_type,
          display_order
        )
      `)
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    adminSupabase
      .from("events")
      .select("*, event_attendees(count)")
      .or(`creator_id.eq.${profile.id},organizer_id.eq.${profile.id}`)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("event_attendees")
      .select("events(*, event_attendees(count))")
      .eq("user_id", profile.id)
      .in("status", ["attending", "going", "interested"]),
  ]);

  const userRole = roleRes.data?.role || "USER";
  const rawPosts = postsRes.data || [];

  const formattedPosts: FeedPostData[] = rawPosts.map((post: any) => {
    const likesList = post.likes || [];
    const rawComments = post.comments || [];
    const mediaList = post.post_media || [];

    const commentsList: CommentData[] = rawComments.map((comm: any) => {
      const cLikes = comm.comment_likes || [];
      return {
        id: comm.id,
        post_id: post.id,
        author_id: comm.author_id,
        parent_id: comm.parent_id || null,
        content: comm.content,
        is_hidden: Boolean(comm.is_hidden),
        created_at: comm.created_at,
        updated_at: comm.updated_at,
        profiles: comm.profiles,
        like_count: cLikes.length,
        liked: currentUser
          ? cLikes.some((l: any) => l.user_id === currentUser.id)
          : false,
      };
    });

    return {
      id: post.id,
      author_id: post.author_id,
      content: post.content,
      location_name: post.location_name,
      created_at: post.created_at,
      updated_at: post.updated_at,
      profiles: post.profiles || {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name || profile.display_name || profile.username,
        display_name: profile.display_name || profile.full_name || profile.username,
        avatar_url: profile.avatar_url,
      },
      author_role: userRole,
      likes: likesList,
      like_count: likesList.length,
      liked: currentUser
        ? likesList.some((l: any) => l.user_id === currentUser.id)
        : false,
      comments: commentsList,
      comment_count: commentsList.length,
      post_media: mediaList,
      media_urls: mediaList.map((m: any) => m.media_url),
    };
  });

  const userHostedEvents = (hostedEvents || []).map((e: any) => ({
    ...e,
    attendee_count: e.event_attendees?.[0]?.count ?? 0,
  }));

  const joinedEvents = (joinedRows || [])
    .map((r: any) => {
      if (!r.events) return null;
      return {
        ...r.events,
        attendee_count: r.events.event_attendees?.[0]?.count ?? 0,
      };
    })
    .filter(Boolean);

  const displayName =
    profile.full_name || profile.display_name || profile.username;
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const joinedDate = safeFormatDate(profile.created_at, "MMMM yyyy");

  // Social links
  const socialLinks = [
    {
      name: "Website",
      url: profile.website,
      icon: Globe,
      color: "hover:text-primary text-muted-foreground",
    },
    {
      name: "Facebook",
      url: profile.facebook_url,
      icon: FacebookIcon,
      color: "hover:text-blue-600 text-blue-500",
    },
    {
      name: "Instagram",
      url: profile.instagram_url,
      icon: InstagramIcon,
      color: "hover:text-pink-600 text-pink-500",
    },
    {
      name: "Twitter",
      url: profile.twitter_url,
      icon: TwitterIcon,
      color: "hover:text-foreground text-foreground/80",
    },
    {
      name: "TikTok",
      url: profile.tiktok_url,
      icon: TikTokIcon,
      color: "hover:text-foreground text-foreground/90",
    },
    {
      name: "LinkedIn",
      url: profile.linkedin_url,
      icon: LinkedInIcon,
      color: "hover:text-blue-700 text-blue-600",
    },
  ].filter((link) => link.url);

  const totalPostsNumber = postCount ?? formattedPosts.length;
  const isOnline = profile.last_seen_at
    ? Date.now() - new Date(profile.last_seen_at).getTime() < 5 * 60 * 1000
    : false;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 pt-2.5 sm:pt-5 pb-20 sm:pb-10 space-y-4">
      {/* ── Modern Editorial Profile Card ── */}
      <div className="rounded-3xl border border-border/80 dark:border-white/10 bg-card/95 dark:bg-card/85 shadow-sm overflow-hidden">
        {/* 1. Scenic Cover Banner with Cover Uploader */}
        <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-slate-950">
          <ProfileCoverUploader
            userId={profile.id}
            coverUrl={profile.cover_url}
            displayName={displayName}
            isOwnProfile={Boolean(isOwnProfile)}
          />

          {/* Top Bar Over Cover: Back Button, Role Badge + Share Profile Button */}
          <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              <ProfileBackButton />
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white/95">
                {userRole === "ADMIN" || userRole === "SUPER_ADMIN" ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    <span>Community Admin</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-orange-300" />
                    <span>Sorsogon Member</span>
                  </>
                )}
              </div>
            </div>

            <ProfileShareButton
              username={profile.username}
              displayName={displayName}
            />
          </div>
        </div>

        {/* 2. Profile Body */}
        <div className="px-4 sm:px-6 pb-5">
          {/* Overlapping Avatar + Right-Aligned Action Buttons */}
          <div className="flex items-end justify-between gap-3 -mt-11 sm:-mt-13 mb-3.5 relative z-10">
            <ProfileAvatarUploader
              userId={profile.id}
              avatarUrl={profile.avatar_url}
              displayName={displayName}
              initials={initials}
              isOwnProfile={Boolean(isOwnProfile)}
              isOnline={isOnline}
              avatarClassName="h-22 w-22 sm:h-26 sm:w-26 ring-4 ring-card shadow-lg bg-card"
            />

            {/* Action Buttons (Aligned cleanly to the right of Avatar on both Mobile & Desktop) */}
            <div className="flex items-center gap-2 pb-1">
              {isOwnProfile ? (
                <>
                  <Link href="/settings">
                    <Button
                      variant="default"
                      size="sm"
                      className="h-9 px-4 rounded-full font-bold text-xs gap-1.5 bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white border-0 shadow-xs hover:opacity-95 cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit Profile</span>
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full border-border/80 bg-muted/40 hover:bg-muted cursor-pointer"
                      title="Account Settings"
                      aria-label="Account Settings"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </Link>
                </>
              ) : currentUser ? (
                <>
                  <FollowButton
                    targetUserId={profile.id}
                    currentUserId={currentUser.id}
                    isFollowing={isFollowing}
                  />
                  <MessageButton targetUserId={profile.id} />
                </>
              ) : null}
            </div>
          </div>

          {/* 3. Name, Handle & Live Presence */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                {displayName}
              </h1>
              {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Verified Admin
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <CopyUsernamePill username={profile.username} />
              <span className="text-xs text-muted-foreground/40">•</span>
              <UserPresenceIndicator
                lastSeenAt={profile.last_seen_at}
                showText
                size="sm"
              />
            </div>
          </div>

          {/* 4. Bio or Helpful Setup Prompt for Own Profile */}
          {profile.bio ? (
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {profile.bio}
            </p>
          ) : isOwnProfile ? (
            <Link
              href="/settings"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5 text-primary" />
              <span>Add a short bio &amp; hometown to personalize your profile</span>
            </Link>
          ) : null}

          {/* 5. Metadata Chips (Location, Relationship Status, Joined Date) */}
          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            {profile.location ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-medium text-foreground/90">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span>{profile.location}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/50 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-rose-500/80 shrink-0" />
                <span>Sorsogon, Philippines</span>
              </span>
            )}

            {profile.relationship_status && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-medium text-foreground/90">
                <Heart className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                <span>{profile.relationship_status}</span>
              </span>
            )}

            {joinedDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 border border-border/50 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Joined {joinedDate}</span>
              </span>
            )}
          </div>

          {/* 6. Social Media Links */}
          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3.5">
              {socialLinks.map((link) => {
                const IconComp = link.icon;
                return (
                  <a
                    key={link.name}
                    href={
                      link.url.startsWith("http")
                        ? link.url
                        : `https://${link.url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/60 border border-border/60 text-xs font-semibold text-foreground transition-all hover:bg-secondary ${link.color}`}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{link.name}</span>
                  </a>
                );
              })}
            </div>
          )}

          {/* 7. Bento 4-Column Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mt-5 p-2 rounded-2xl bg-muted/45 dark:bg-muted/25 border border-border/60">
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-card/70 dark:bg-card/40 border border-border/40">
              <span className="text-base sm:text-lg font-extrabold text-foreground leading-none">
                {totalPostsNumber}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground mt-1">
                Posts
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-card/70 dark:bg-card/40 border border-border/40">
              <span className="text-base sm:text-lg font-extrabold text-foreground leading-none">
                {userHostedEvents.length}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground mt-1">
                Hosted
              </span>
            </div>

            <Link
              href={isOwnProfile ? "/followers" : "#"}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-card/70 dark:bg-card/40 border border-border/40 transition-colors ${
                isOwnProfile ? "hover:bg-muted/80 cursor-pointer" : ""
              }`}
            >
              <span className="text-base sm:text-lg font-extrabold text-foreground leading-none">
                {followerCount || 0}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground mt-1">
                Followers
              </span>
            </Link>

            <Link
              href={isOwnProfile ? "/following" : "#"}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-card/70 dark:bg-card/40 border border-border/40 transition-colors ${
                isOwnProfile ? "hover:bg-muted/80 cursor-pointer" : ""
              }`}
            >
              <span className="text-base sm:text-lg font-extrabold text-foreground leading-none">
                {followingCount || 0}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground mt-1">
                Following
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Segmented Activity Tabs: Posts | Hosted | Joined ── */}
      <Tabs defaultValue="posts" className="space-y-3.5">
        <TabsList className="w-full h-11 p-1 rounded-2xl bg-card/95 dark:bg-card/85 border border-border/80 dark:border-white/10 grid grid-cols-3 shadow-2xs">
          <TabsTrigger
            value="posts"
            className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5E3A] data-[state=active]:via-[#FF3366] data-[state=active]:to-[#E11D48] data-[state=active]:text-white transition-all cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Posts ({formattedPosts.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="hosted"
            className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5E3A] data-[state=active]:via-[#FF3366] data-[state=active]:to-[#E11D48] data-[state=active]:text-white transition-all cursor-pointer"
          >
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>Hosted ({userHostedEvents.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="joined"
            className="rounded-xl gap-1.5 text-xs sm:text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#FF5E3A] data-[state=active]:via-[#FF3366] data-[state=active]:to-[#E11D48] data-[state=active]:text-white transition-all cursor-pointer"
          >
            <Ticket className="h-3.5 w-3.5 text-emerald-400" />
            <span>Joined ({joinedEvents.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: POSTS */}
        <TabsContent value="posts" className="mt-0">
          {formattedPosts.length > 0 ? (
            <div className="space-y-3.5">
              {formattedPosts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  currentUserId={currentUser?.id || ""}
                  currentUserRole={userRole}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-border/80 bg-card/60 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FileText className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm sm:text-base text-foreground">
                  No posts shared yet
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {isOwnProfile
                    ? "Share updates, photos, or local recommendations with the Sorsogon community."
                    : `${displayName} hasn't published any community posts yet.`}
                </p>
              </div>
              {isOwnProfile && (
                <Link href="/home" className="inline-block pt-1">
                  <Button
                    size="sm"
                    className="rounded-full h-8 px-4 text-xs font-bold gap-1.5 bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white border-0"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Create a Post</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: HOSTED EVENTS */}
        <TabsContent value="hosted" className="mt-0">
          {userHostedEvents.length > 0 ? (
            <div className="space-y-3">
              {userHostedEvents.map((event) => (
                <ProfileEventCard
                  key={event.id}
                  event={event}
                  badge="Host"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-border/80 bg-card/60 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Star className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm sm:text-base text-foreground">
                  No hosted events yet
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {isOwnProfile
                    ? "Organize a meetup, sports game, or community gathering in Sorsogon."
                    : `${displayName} hasn't hosted any events yet.`}
                </p>
              </div>
              {isOwnProfile && (
                <Link href="/events/create" className="inline-block pt-1">
                  <Button
                    size="sm"
                    className="rounded-full h-8 px-4 text-xs font-bold gap-1.5 bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white border-0"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Host an Event</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: JOINED EVENTS */}
        <TabsContent value="joined" className="mt-0">
          {joinedEvents.length > 0 ? (
            <div className="space-y-3">
              {joinedEvents.map((event) => (
                <ProfileEventCard
                  key={event.id}
                  event={event}
                  badge="Going"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-border/80 bg-card/60 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm sm:text-base text-foreground">
                  No joined events yet
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {isOwnProfile
                    ? "Discover upcoming gatherings and activities happening around Sorsogon."
                    : `${displayName} hasn't joined any upcoming events yet.`}
                </p>
              </div>
              {isOwnProfile && (
                <Link href="/explore" className="inline-block pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full h-8 px-4 text-xs font-bold gap-1.5"
                  >
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    <span>Explore Events</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileEventCard({ event, badge }: { event: any; badge: string }) {
  const monthStr = formatEventDate(
    event.event_date,
    event.start_time,
    event.created_at,
    "MMM"
  );
  const dayStr = formatEventDate(
    event.event_date,
    event.start_time,
    event.created_at,
    "d"
  );
  const fullDateStr = formatEventDate(
    event.event_date,
    event.start_time,
    event.created_at,
    "EEE, MMM d, yyyy"
  );
  const hasValidDate = monthStr && monthStr !== "Date to be announced";
  const coverImage = event.image_url || event.cover_image;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/80 dark:border-white/10 bg-card/95 hover:border-primary/40 hover:shadow-sm transition-all">
        {/* Left Thumbnail or Date Tile */}
        {coverImage ? (
          <div className="relative h-16 w-16 sm:h-18 sm:w-20 rounded-xl overflow-hidden shrink-0 bg-slate-900 border border-border/60">
            <img
              src={coverImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {hasValidDate && dayStr && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold uppercase leading-none">
                {monthStr} {dayStr}
              </div>
            )}
          </div>
        ) : (
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex flex-col items-center justify-center shrink-0 text-primary border border-primary/20">
            {hasValidDate && dayStr ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {monthStr}
                </span>
                <span className="text-base font-black leading-none text-foreground mt-0.5">
                  {dayStr}
                </span>
              </>
            ) : (
              <CalendarDays className="h-5 w-5 text-primary" />
            )}
          </div>
        )}

        {/* Middle Event Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {event.category && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
                {event.category}
              </span>
            )}
            <Badge
              variant={badge === "Host" ? "default" : "secondary"}
              className={`text-[10px] px-2 py-0 rounded-full font-semibold ${
                badge === "Host"
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
              }`}
            >
              {badge}
            </Badge>
          </div>

          <h4 className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
            {event.title}
          </h4>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
              <CalendarDays className="h-3 w-3 text-primary shrink-0" />
              <span>{fullDateStr}</span>
            </span>

            {event.location_name && (
              <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                <span className="truncate">{event.location_name}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3 text-emerald-500 shrink-0" />
              <span>{event.attendee_count || 0} attending</span>
            </span>
          </div>
        </div>

        {/* Right Arrow */}
        <div className="h-8 w-8 rounded-full bg-muted/60 group-hover:bg-primary group-hover:text-white flex items-center justify-center text-muted-foreground transition-colors shrink-0">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
