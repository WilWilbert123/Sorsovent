"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { profileOnboardingSchema } from "@/lib/validation/auth";

export default function ProfileOnboardingPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const bio = formData.get("bio") as string;

    const validation = profileOnboardingSchema.safeParse({ fullName, bio });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          full_name: fullName, 
          bio: bio || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError) {
        setError("Failed to update profile: " + updateError.message);
        return;
      }

      toast.success("Profile details saved!");
      router.push("/onboarding/interests");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Complete your profile</h1>
          <p className="text-muted-foreground text-sm">
            Add a bit more info so people know who you are.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="e.g. Juan Dela Cruz"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Input
              id="bio"
              name="bio"
              placeholder="Tell us a bit about yourself"
              disabled={isPending}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Finish Setup
          </Button>
        </form>
      </div>
    </div>
  );
}
