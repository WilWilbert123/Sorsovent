"use client";

import { useState, useTransition } from "react";
import { MapPin, Shield, Loader2, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const router = useRouter();

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Verify admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      const role = roleData?.role;
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN" || role === "MODERATOR";

      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("Access denied. Admin privileges required.");
        return;
      }

      toast.success("Welcome back, Admin!");
      router.push("/admin/dashboard");
      router.refresh();
    });
  }

  async function handleMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setMagicLinkEmail(email);
      setMagicLinkSent(true);
      toast.success("Magic link dispatched! Check your email inbox.");
    });
  }

  async function handleGoogleSignIn() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/admin/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border bg-card/95 backdrop-blur rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4 text-center border-b bg-muted/20">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full ring-4 ring-primary/5">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-extrabold text-lg tracking-wider">SORSOVENT</span>
          </div>
          <CardTitle className="text-xl font-bold">Admin Portal</CardTitle>
          <CardDescription className="text-xs">
            Secure Administrator Authentication System
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Continue with Google */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-muted-foreground/20 hover:bg-accent flex items-center justify-center gap-3 font-medium transition-all shadow-sm mb-5"
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

          <div className="relative mb-6">
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
                  <Label htmlFor="email" className="text-xs font-semibold">Admin Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@sorsovent.com"
                    autoComplete="email"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
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
                <Button type="submit" className="w-full h-11" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In to Admin Panel
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
                    We sent a magic sign-in link to <span className="font-medium text-foreground">{magicLinkEmail}</span>. Click the link to log in directly.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary"
                    onClick={() => setMagicLinkSent(false)}
                  >
                    Send to a different email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-email" className="text-xs font-semibold">Admin Email</Label>
                    <Input
                      id="magic-email"
                      name="email"
                      type="email"
                      placeholder="admin@sorsovent.com"
                      autoComplete="email"
                      required
                      disabled={isPending}
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Magic Link
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
