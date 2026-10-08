"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AVAILABLE_INTERESTS = [
  "Live Music", "Food & Dining", "Tech & Startups", 
  "Arts & Culture", "Sports & Fitness", "Networking",
  "Outdoors", "Education", "Nightlife", "Community Service"
];

export default function InterestsOnboardingPage() {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function toggleInterest(interest: string) {
    if (selected.includes(interest)) {
      setSelected(selected.filter(i => i !== interest));
    } else {
      setSelected([...selected, interest]);
    }
  }

  async function handleSkip() {
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }

      let { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          is_onboarded: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (updateError && updateError.message.includes("is_onboarded")) {
        const { error: fallbackError } = await supabase
          .from("profiles")
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);
        updateError = fallbackError;
      }

      if (updateError) {
        toast.error("Failed to complete onboarding: " + updateError.message);
        return;
      }

      toast.success("Welcome to Sorsovent!");
      router.push("/home");
      router.refresh();
    });
  }

  async function handleSubmit() {
    await handleSkip();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg bg-card border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">What are you interested in?</h1>
          <p className="text-muted-foreground text-sm">
            Select a few topics so we can suggest the best events for you.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {AVAILABLE_INTERESTS.map(interest => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all
                ${selected.includes(interest) 
                  ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                  : "bg-card text-foreground hover:bg-muted"}`}
            >
              {interest}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSubmit} className="w-full h-11 text-sm font-medium" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selected.length > 0 ? `Finish Setup (${selected.length} selected)` : "Continue"}
          </Button>

          <Button 
            type="button"
            variant="ghost" 
            onClick={handleSkip} 
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            disabled={isPending}
          >
            Skip for now (Do it later) →
          </Button>
        </div>
      </div>
    </div>
  );
}
