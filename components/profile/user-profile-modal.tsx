"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Calendar,
  Ticket,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  TikTokIcon,
  LinkedInIcon,
  Globe,
} from "@/components/profile/social-icons";
import Link from "next/link";

interface UserProfileModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileModal({
  userId,
  open,
  onOpenChange,
}: UserProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [hostedCount, setHostedCount] = useState(0);
  const [joinedCount, setJoinedCount] = useState(0);

  useEffect(() => {
    if (!open || !userId) return;

    let isMounted = true;
    setLoading(true);

    async function fetchUserData() {
      const supabase = createClient();

      // Fetch profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Fetch hosted events count
      const { count: hCount } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId);

      // Fetch joined events count
      const { count: jCount } = await supabase
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (isMounted) {
        setProfile(prof);
        setHostedCount(hCount || 0);
        setJoinedCount(jCount || 0);
        setLoading(false);
      }
    }

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [userId, open]);

  if (!open) return null;

  const displayName =
    profile?.display_name || profile?.full_name || profile?.username || "User";
  const username = profile?.username || "user";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{displayName}'s Profile Preview</DialogTitle>
        </DialogHeader>

        {/* Top Header Banner */}
        <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 relative" />

        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar floating */}
          <div className="-mt-12 mb-3 flex justify-between items-end">
            <Avatar className="w-20 h-20 border-4 border-card shadow-lg ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {displayName[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs">Loading profile...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name & Handle */}
              <div>
                <h3 className="text-lg font-bold text-foreground leading-snug">
                  {displayName}
                </h3>
                <p className="text-xs text-muted-foreground">@{username}</p>
                {profile?.bio && (
                  <p className="text-xs text-foreground/80 mt-2 line-clamp-3 leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Stats Badges */}
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl border border-border/50 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>Hosted</span>
                  </div>
                  <span className="text-base font-bold text-foreground">{hostedCount}</span>
                </div>
                <div className="flex flex-col items-center border-l border-border/50">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                    <Ticket className="h-3.5 w-3.5 text-primary" />
                    <span>Joined</span>
                  </div>
                  <span className="text-base font-bold text-foreground">{joinedCount}</span>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="flex flex-wrap gap-2 pt-1">
                {profile?.facebook_url && (
                  <a
                    href={profile.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 transition-colors"
                    title="Facebook"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                )}
                {profile?.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors"
                    title="Twitter / X"
                  >
                    <TwitterIcon className="h-4 w-4" />
                  </a>
                )}
                {profile?.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 transition-colors"
                    title="Instagram"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </a>
                )}
                {profile?.linkedin_url && (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-blue-700/10 hover:bg-blue-700/20 text-blue-700 transition-colors"
                    title="LinkedIn"
                  >
                    <LinkedInIcon className="h-4 w-4" />
                  </a>
                )}
                {profile?.tiktok_url && (
                  <a
                    href={profile.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors"
                    title="TikTok"
                  >
                    <TikTokIcon className="h-4 w-4" />
                  </a>
                )}
                {profile?.website && (
                  <a
                    href={
                      profile.website.startsWith("http")
                        ? profile.website
                        : `https://${profile.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    title="Website"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* View Full Profile Action */}
              <div className="pt-2">
                <Link
                  href={`/profile/${username}`}
                  onClick={() => onOpenChange(false)}
                  className="w-full block"
                >
                  <Button className="w-full gap-2 rounded-xl font-semibold shadow-sm">
                    <User className="h-4 w-4" />
                    <span>View Full Profile</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-70" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
