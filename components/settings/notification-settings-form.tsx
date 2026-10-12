"use client";

import { PushNotificationBanner } from "@/components/notifications/push-notification-banner";
import { PushPreferencesCard } from "@/components/notifications/push-preferences-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sliders } from "lucide-react";

export function NotificationSettingsForm() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PushNotificationBanner />

      <Card className="rounded-2xl border border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sliders className="h-5 w-5 text-primary" />
            Push Notification Channels
          </CardTitle>
          <CardDescription>
            Select which live alerts and push notifications you want to receive for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushPreferencesCard showTitle={false} />
        </CardContent>
      </Card>
    </div>
  );
}
