"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  Mail,
  Megaphone,
  CalendarDays,
  ShieldAlert,
  Save,
  Loader2,
  CheckCircle2,
  Sparkles,
  Database,
  Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SystemSettings } from "@/lib/admin/settings";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AdminSettingsManagerProps {
  initialSettings: SystemSettings;
}

export function AdminSettingsManager({ initialSettings }: AdminSettingsManagerProps) {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(initialSettings.updatedAt || null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("admin-settings-sync")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: "action=eq.SYSTEM_SETTINGS_UPDATE",
        },
        (payload: any) => {
          const incoming = payload?.new?.metadata;
          if (incoming) {
            setSettings((prev) => ({ ...prev, ...incoming }));
            setLastSaved(payload?.new?.created_at || new Date().toISOString());
            toast.info("Settings synced from live Supabase update");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
        },
        (payload: any) => {
          const incoming = payload?.new?.settings;
          if (incoming) {
            setSettings((prev) => ({ ...prev, ...incoming }));
            setLastSaved(new Date().toISOString());
            toast.info("Settings synced from Supabase table");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          payload: settings,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Platform settings saved to Supabase successfully!");
        if (data.data) {
          setSettings(data.data);
          setLastSaved(new Date().toISOString());
        }
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Platform Settings</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[10px] gap-1 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Realtime
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Customize branding, announcement banners, community policies, and security thresholds
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button type="submit" disabled={isSaving} className="gap-2 h-10 px-5 shadow-sm">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving to Supabase..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Supabase Persistence Confirmation Alert Banner */}
      <div className="p-3.5 rounded-2xl bg-muted/40 border flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Database className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-muted-foreground">
            Settings are saved to <strong className="text-foreground">Supabase</strong> and broadcast live across the web application.
          </span>
        </div>
        {lastSaved && (
          <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
            Last saved: {new Date(lastSaved).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* 1. General Branding */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Globe className="h-5 w-5 text-primary" />
            General Branding & Identity
          </CardTitle>
          <CardDescription className="text-xs">
            Configure primary titles, support contacts, and community taglines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platformName" className="text-xs font-semibold">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                placeholder="e.g. Mingle"
                className="h-10 text-sm bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail" className="text-xs font-semibold">Support Contact Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                placeholder="e.g. support@mingle.com"
                className="h-10 text-sm bg-card"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage" className="text-xs font-semibold">Hero Welcome Tagline</Label>
            <Input
              id="welcomeMessage"
              value={settings.welcomeMessage}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
              placeholder="e.g. Discover and host community events in Sorsogon"
              className="h-10 text-sm bg-card"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Global Announcement Banner */}
      <Card className="rounded-2xl shadow-sm border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Megaphone className="h-5 w-5 text-primary" />
              Global Announcement Banner
            </CardTitle>
            <Badge variant={settings.announcementActive ? "default" : "secondary"} className="text-[10px]">
              {settings.announcementActive ? "Currently Broadcasting" : "Disabled"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Broadcast platform-wide notices, weather alerts, or festival schedules to all users in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border">
            <div>
              <p className="text-sm font-semibold">Display Announcement Banner</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When active, shows a top alert bar on all pages across the web application
              </p>
            </div>
            <Switch
              checked={settings.announcementActive}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, announcementActive: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcementMessage" className="text-xs font-semibold">Banner Message</Label>
            <Input
              id="announcementMessage"
              value={settings.announcementMessage}
              onChange={(e) => setSettings({ ...settings, announcementMessage: e.target.value })}
              placeholder="e.g. Kasanggayahan Festival Events are now live! Join today."
              className="h-10 text-sm bg-card"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Label className="text-xs font-semibold">Banner Tone:</Label>
            <div className="flex items-center gap-2">
              {(["info", "warning", "success"] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setSettings({ ...settings, announcementType: tone })}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                    settings.announcementType === tone
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Community & Event Rules */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Community & Event Permissions
          </CardTitle>
          <CardDescription className="text-xs">
            Control event submission policies and member registration permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border">
            <div>
              <p className="text-sm font-semibold">Allow Public Event Creation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow standard verified members to publish public community gatherings
              </p>
            </div>
            <Switch
              checked={settings.allowPublicEventCreation}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, allowPublicEventCreation: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border">
            <div>
              <p className="text-sm font-semibold">Allow New User Registrations</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enable new members to register accounts via auth and Google OAuth
              </p>
            </div>
            <Switch
              checked={settings.allowUserRegistration}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, allowUserRegistration: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Safety & System Maintenance */}
      <Card className="rounded-2xl shadow-sm border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Safety Thresholds & System Controls
          </CardTitle>
          <CardDescription className="text-xs">
            Automated moderation safety limits and maintenance status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="autoSuspendThreshold" className="text-xs font-semibold">
              Auto-Suspend Flag Threshold
            </Label>
            <Input
              id="autoSuspendThreshold"
              type="number"
              min={1}
              max={50}
              value={settings.autoSuspendThreshold}
              onChange={(e) => setSettings({ ...settings, autoSuspendThreshold: parseInt(e.target.value) || 5 })}
              className="h-10 text-sm bg-card"
            />
            <p className="text-[11px] text-muted-foreground">
              Number of pending reports required before an item is flagged for urgent review.
            </p>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-destructive/5 rounded-xl border border-destructive/20 mt-4">
            <div>
              <p className="text-sm font-semibold text-destructive">System Maintenance Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displays maintenance notice to standard users while allowing admin access
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked: boolean) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSaving} className="gap-2 h-11 px-6 shadow-sm">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving to Supabase..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}
