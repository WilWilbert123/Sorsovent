"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { registerSchema } from "@/lib/validation/auth";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
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
          emailRedirectTo: `${location.origin}/auth/callback`,
        }
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 md:p-8 bg-card border rounded-3xl shadow-sm text-center">
        <div className="p-3 bg-primary/10 rounded-full mb-4 inline-block">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Check your email</h1>
        <p className="text-muted-foreground text-sm mb-6">
          We've sent a verification link to your email address. Please verify your account to continue.
        </p>
        <Link href="/auth/login">
          <Button variant="outline" className="w-full">Return to login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 md:p-8 bg-card border rounded-3xl shadow-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="p-3 bg-primary/10 rounded-full mb-4">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Join Sorsovent</h1>
        <p className="text-muted-foreground text-sm mt-1">Create your account to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isPending}
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
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              disabled={isPending}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive text-center font-medium">{error}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
