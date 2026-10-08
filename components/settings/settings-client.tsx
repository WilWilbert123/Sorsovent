"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logout } from "@/app/actions/auth";

interface SettingsPageClientProps {
  profile: any;
  userId: string;
}

export function SettingsPageClient({ profile, userId }: SettingsPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const fullName = formData.get("fullName") as string;
    const username = formData.get("username") as string;
    const bio = formData.get("bio") as string;
    const location = formData.get("location") as string;
    const website = formData.get("website") as string;

    startTransition(async () => {
      const supabase = createClient();
      let { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          display_name: fullName,
          username,
          bio,
          location,
          website,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error && error.message.includes("full_name")) {
        const { error: fallbackError } = await supabase
          .from("profiles")
          .update({
            display_name: fullName,
            username,
            bio,
            location,
            website,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        error = fallbackError;
      }

      if (error) {
        toast.error("Failed to update profile: " + error.message);
      } else {
        toast.success("Profile updated!");
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Avatar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile Photo</CardTitle>
                <CardDescription>Update your profile picture</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{displayName}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      defaultValue={profile?.full_name || ""}
                      placeholder="Your full name"
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      defaultValue={profile?.username || ""}
                      placeholder="yourusername"
                      disabled={isPending}
                      pattern="^[a-zA-Z0-9_]{3,30}$"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={profile?.bio || ""}
                    placeholder="Tell others a little about yourself..."
                    rows={3}
                    disabled={isPending}
                    maxLength={160}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      defaultValue={profile?.location || ""}
                      placeholder="Sorsogon City"
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      defaultValue={profile?.website || ""}
                      placeholder="https://yourwebsite.com"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="gap-2" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </form>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={profile?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-destructive mb-2">Danger Zone</p>
                <Button
                  variant="destructive"
                  onClick={() => logout()}
                  className="gap-2"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Privacy</CardTitle>
              <CardDescription>Manage your privacy settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Privacy controls coming soon. Your location data is never shared publicly.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
