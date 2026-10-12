"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { registerSchema } from "@/lib/validation/auth";
import { toast } from "sonner";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const validation = registerSchema.safeParse({ email, password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    });
  }

  async function handleGoogleSignUp() {
    startTransition(async () => {
      const supabase = createClient();
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (googleError) {
        toast.error(googleError.message);
      }
    });
  }

  if (success) {
    return (
      <div className="w-full max-w-sm sm:max-w-md p-4 sm:p-6 bg-card/90 dark:bg-card/60 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl sm:rounded-3xl text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="relative mb-3 inline-block">
          <div className="absolute inset-0 rounded-xl bg-emerald-500/20 blur-md" />
          <div className="relative p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight mb-1">Check your email</h1>
        <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
          We&apos;ve sent a verification link to your email address. Verify your account to continue.
        </p>
        <Link href="/auth/login">
          <Button variant="outline" className="w-full h-9 rounded-xl text-xs cursor-pointer">
            Return to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md p-4 sm:p-6 bg-card/90 dark:bg-card/60 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl sm:rounded-3xl animate-in fade-in zoom-in-95 duration-200">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-3 sm:mb-4 text-center">
        <div className="relative mb-1.5">
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm" />
          <div className="relative p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
        </div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Join Sorsovent</h1>
        <p className="text-muted-foreground text-[11px] sm:text-xs">Create your account to start discovering</p>
      </div>

      {/* Continue with Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-9 sm:h-9.5 rounded-xl border-border hover:bg-muted/60 flex items-center justify-center gap-2.5 font-medium transition-all shadow-xs mb-3 cursor-pointer text-xs"
        onClick={handleGoogleSignUp}
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
      <div className="relative mb-3">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/70" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
          <span className="bg-card px-2 text-muted-foreground font-medium">Or register with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-[11px] font-medium">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isPending}
              className="pl-8.5 h-9 rounded-xl bg-background/60 text-xs focus-visible:ring-primary/20"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-[11px] font-medium">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={isPending}
              className="pl-8.5 pr-8.5 h-9 rounded-xl bg-background/60 text-xs focus-visible:ring-primary/20"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-[11px] font-medium">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={isPending}
              className="pl-8.5 pr-8.5 h-9 rounded-xl bg-background/60 text-xs focus-visible:ring-primary/20"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-[11px] text-destructive text-center font-medium">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-9.5 rounded-xl font-semibold text-xs shadow-md shadow-primary/25 hover:shadow-lg transition-all cursor-pointer group mt-1"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      {/* Switch to Sign In */}
      <div className="mt-3 pt-2.5 border-t border-border/50 text-center text-xs">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link href="/auth/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
