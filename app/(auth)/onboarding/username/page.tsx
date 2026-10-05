"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function UsernamePage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError("Username must be 3-30 characters and can only contain letters, numbers, and underscores.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Check if username is taken
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (existingUser && existingUser.id !== user.id) {
        setError("This username is already taken. Please choose another one.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        setError("Failed to set username: " + updateError.message);
        return;
      }

      toast.success("Username set successfully!");
      router.push("/onboarding/profile");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Choose a Username</h1>
          <p className="text-muted-foreground text-sm">
            This is how people will identify you on Sorsovent.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="e.g. sorsogon_local"
              required
              disabled={isPending}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
