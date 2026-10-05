import { Settings, ShieldAlert, Key, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground text-sm">Configure global platform behavior</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              General Configuration
            </CardTitle>
            <CardDescription>Basic settings for the Sorsovent platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Platform Name</Label>
              <Input defaultValue="Sorsovent" disabled />
            </div>
            <div className="space-y-2">
              <Label>Support Email</Label>
              <Input defaultValue="support@sorsovent.com" disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Moderation & Security
            </CardTitle>
            <CardDescription>Configure auto-moderation thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Auto-suspend threshold (Reports)</Label>
              <Input type="number" defaultValue={5} disabled />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
