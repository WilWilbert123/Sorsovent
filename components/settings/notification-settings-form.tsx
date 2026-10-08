"use client";

import { PushNotificationBanner } from "@/components/notifications/push-notification-banner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, MessageSquare, Calendar, ShieldCheck } from "lucide-react";

export function NotificationSettingsForm() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PushNotificationBanner />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alert Preferences
          </CardTitle>
          <CardDescription>
            Choose what type of activity triggers live notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3.5 border rounded-xl bg-card">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">Event Group Chat Messages</p>
                <p className="text-xs text-muted-foreground">Receive push alerts when attendees chat in joined events</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              Enabled
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 border rounded-xl bg-card">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">Event Reminders & RSVP Updates</p>
                <p className="text-xs text-muted-foreground">Get notified about upcoming events you are attending</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              Enabled
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 border rounded-xl bg-card">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">Community Follows & Interactions</p>
                <p className="text-xs text-muted-foreground">Alerts when someone follows you or likes your post</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              Enabled
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
