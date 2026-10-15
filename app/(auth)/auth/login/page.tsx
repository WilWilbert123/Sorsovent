"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Mail, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const router = useRouter();

  const getNextUrl = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("next") || "/onboarding";
    }
    return "/onboarding";
  };

  async function handleMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const nextDestination = getNextUrl();
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`,
        },
      });

      if (magicError) {
        setError(magicError.message);
        return;
      }

      setMagicLinkEmail(email);
      setMagicLinkSent(true);
      toast.success("Magic sign-in link dispatched to your email!");
    });
  }

  async function handleGoogleSignIn() {
    startTransition(async () => {
      const supabase = createClient();
      const nextDestination = getNextUrl();
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`,
        },
      });

      if (googleError) {
        toast.error(googleError.message);
      }
    });
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md p-5 sm:p-7 bg-card/90 dark:bg-card/60 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl sm:rounded-3xl animate-in fade-in zoom-in-95 duration-200">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-5 text-center">
        <div className="relative mb-2">
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm" />
          <div className="relative p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Welcome to Mingle</h1>
        <p className="text-muted-foreground text-xs mt-1">Sign in or get started with your account</p>
      </div>

      {/* Continue with Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 rounded-xl border-border hover:bg-muted/60 flex items-center justify-center gap-2.5 font-medium transition-all shadow-xs mb-4 cursor-pointer text-xs"
        onClick={handleGoogleSignIn}
        disabled={isPending}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
        <span>Continue with Google</span>
      </Button>

      {/* Divider */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/70" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
          <span className="bg-card px-2.5 text-muted-foreground font-medium">Or continue with email</span>
        </div>
      </div>

      {/* Magic Link Form */}
      {magicLinkSent ? (
        <div className="py-4 text-center space-y-2.5">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-sm">Check your inbox</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
            We sent a magic sign-in link to <span className="font-medium text-foreground">{magicLinkEmail}</span>. Click the link in your email to sign in.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary cursor-pointer h-8 mt-2"
            onClick={() => setMagicLinkSent(false)}
          >
            Use a different email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleMagicLinkSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isPending}
                className="pl-9 h-10 rounded-xl bg-background/60 text-xs focus-visible:ring-primary/20"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">

              Password-free login. An account is created automatically if you&apos;re new.
            </p>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center font-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 rounded-xl font-semibold text-xs shadow-md shadow-primary/25 hover:shadow-lg transition-all cursor-pointer group mt-2"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <span>Send Magic Link</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Helpful Hint */}
      <div className="mt-5 pt-3.5 border-t border-border/50 text-center">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Continuing with <span className="font-medium text-foreground">Google</span> or <span className="font-medium text-foreground">Magic Link</span> signs in existing users or automatically creates your account.
        </p>
      </div>
    </div>
  );
}
