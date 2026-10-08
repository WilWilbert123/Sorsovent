"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { ImagePreview } from "@/components/media/image-preview";
import { Loader2, Globe, Share2, Camera, MessageCircle, Video, Briefcase } from "lucide-react";
import { toast } from "sonner";

interface ProfileSettingsFormProps {
  profile: any;
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url || "");
  const [fullName, setFullName] = useState<string>(profile.full_name || profile.display_name || "");
  const [username, setUsername] = useState<string>(profile.username || "");
  const [bio, setBio] = useState<string>(profile.bio || "");
  const [location, setLocation] = useState<string>(profile.location || "");

  // Social Links
  const [website, setWebsite] = useState<string>(profile.website || "");
  const [facebookUrl, setFacebookUrl] = useState<string>(profile.facebook_url || "");
  const [instagramUrl, setInstagramUrl] = useState<string>(profile.instagram_url || "");
  const [twitterUrl, setTwitterUrl] = useState<string>(profile.twitter_url || "");
  const [tiktokUrl, setTiktokUrl] = useState<string>(profile.tiktok_url || "");
  const [linkedinUrl, setLinkedinUrl] = useState<string>(profile.linkedin_url || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      const updateData: Record<string, any> = {
        full_name: fullName.trim(),
        display_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        avatar_url: avatarUrl || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        website: website.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        tiktok_url: tiktokUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", profile.id);

      // Fallback to basic profile fields if social columns do not exist in DB schema yet
      if (
        error &&
        (error.message.includes("facebook_url") ||
          error.message.includes("schema cache") ||
          error.message.includes("column"))
      ) {
        const basicData = {
          full_name: fullName.trim(),
          display_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          avatar_url: avatarUrl || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const fallbackRes = await supabase
          .from("profiles")
          .update(basicData)
          .eq("id", profile.id);

        error = fallbackRes.error;
      }

      if (error) {
        toast.error("Failed to update profile: " + error.message);
      } else {
        toast.success("Profile updated successfully!");
        router.push(`/profile/${username.trim().toLowerCase()}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      {/* Avatar Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Picture</CardTitle>
          <CardDescription>Upload a clear avatar so friends can recognize you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {avatarUrl ? (
            <div className="flex items-center gap-4">
              <ImagePreview
                url={avatarUrl}
                onRemove={() => setAvatarUrl("")}
                className="h-24 w-24 rounded-full overflow-hidden object-cover border-2 border-primary"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setAvatarUrl("")}>
                Change Picture
              </Button>
            </div>
          ) : (
            <CloudinaryUpload
              onUploadSuccess={(url) => setAvatarUrl(url)}
              folder="avatars"
            />
          )}
        </CardContent>
      </Card>

      {/* Basic Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Details</CardTitle>
          <CardDescription>Update your display name, handle, and location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name / Display Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Wilbert Gamis"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username Handle *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">@</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="wilbert"
                  className="pl-8"
                  required
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location / City</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sorsogon City, Philippines"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About / Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share a little bit about yourself, interests, or events you love attending..."
              rows={3}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social Media Links</CardTitle>
          <CardDescription>Add links to your social accounts so visitors can connect with you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Globe className="h-4 w-4 text-primary" /> Personal Website
              </Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Share2 className="h-4 w-4 text-blue-500" /> Facebook Profile
              </Label>
              <Input
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/username"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Camera className="h-4 w-4 text-pink-500" /> Instagram Profile
              </Label>
              <Input
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/username"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <MessageCircle className="h-4 w-4 text-sky-400" /> Twitter / X
              </Label>
              <Input
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://x.com/username"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Video className="h-4 w-4 text-purple-400" /> TikTok Profile
              </Label>
              <Input
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/@username"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs font-semibold">
                <Briefcase className="h-4 w-4 text-blue-400" /> LinkedIn
              </Label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile Changes
        </Button>
      </div>
    </form>
  );
}
