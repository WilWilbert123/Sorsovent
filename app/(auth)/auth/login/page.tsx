"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Loader2, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { loginSchema } from "@/lib/validation/auth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const router = useRouter();

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      toast.success("Welcome back!");
      router.push("/onboarding");
      router.refresh();
    });
  }

  async function handleMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (magicError) {
        setError(magicError.message);
        return;
      }

      setMagicLinkEmail(email);
      setMagicLinkSent(true);
      toast.success("Magic link sent to your email!");
    });
  }

  async function handleGoogleSignIn() {
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

  return (
    <div className="w-full max-w-sm mx-auto p-4 md:p-8 bg-card border rounded-3xl shadow-lg">
      <div className="flex flex-col items-center mb-6">
        <div className="p-3 bg-primary/10 rounded-full mb-3">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground text-xs mt-1">Sign in to your Sorsovent account</p>
      </div>

      {/* Continue with Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 border-muted-foreground/20 hover:bg-accent flex items-center justify-center gap-3 font-medium transition-all shadow-sm mb-4"
        onClick={handleGoogleSignIn}
        disabled={isPending}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
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
        Continue with Google
      </Button>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-muted" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with</span>
        </div>
      </div>

      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="password" className="text-xs flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Password
          </TabsTrigger>
          <TabsTrigger value="magic-link" className="text-xs flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Magic Link
          </TabsTrigger>
        </TabsList>

        <TabsContent value="password">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isPending}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="magic-link">
          {magicLinkSent ? (
            <div className="py-4 text-center space-y-3">
              <div className="inline-flex p-3 bg-primary/10 rounded-full text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-sm">Check your inbox</h3>
              <p className="text-xs text-muted-foreground">
                We sent a magic sign-in link to <span className="font-medium text-foreground">{magicLinkEmail}</span>. Click the link to log in instantly.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => setMagicLinkSent(false)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isPending}
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

              <Button type="submit" className="w-full h-11" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Magic Link
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link href="/auth/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
