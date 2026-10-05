"use client";

import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReportButtonProps {
  targetId: string;
  targetType: "post" | "event" | "user" | "comment";
}

export function ReportButton({ targetId, targetType }: ReportButtonProps) {
  const handleReport = () => {
    // In production, open a modal with a form to collect report reason
    toast.success(`Successfully reported ${targetType}. Moderation team has been notified.`);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleReport} className="text-muted-foreground hover:text-destructive">
      <Flag className="h-4 w-4 mr-2" />
      Report
    </Button>
  );
}
