"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/reset-password`,
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
      <div className="w-full max-w-md p-6 sm:p-8 bg-card/85 dark:bg-card/60 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] rounded-3xl text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="relative mb-4 inline-block">
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md" />
          <div className="relative p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">Check your email</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mb-6 leading-relaxed">
          We&apos;ve sent a password reset link to your email address. Follow the instructions in the email to reset your password.
        </p>
        <Link href="/auth/login">
          <Button variant="outline" className="w-full h-11 rounded-xl cursor-pointer">
            Return to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-6 sm:p-8 bg-card/85 dark:bg-card/60 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] rounded-3xl animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="relative mb-3">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md" />
          <div className="relative p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <KeyRound className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Reset Password</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Enter your email and we&apos;ll send you a recovery link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isPending}
              className="pl-10 h-11 rounded-xl bg-background/60 text-sm focus-visible:ring-primary/20"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center font-medium">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer"
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-border/50 text-center text-xs sm:text-sm">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to login</span>
        </Link>
      </div>
    </div>
  );
}
