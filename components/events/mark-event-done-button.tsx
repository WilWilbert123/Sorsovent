"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MarkEventDoneButtonProps {
  eventId: string;
  status?: string | null;
  onStatusChange?: (newStatus: string) => void;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  compact?: boolean;
}

export function MarkEventDoneButton({
  eventId,
  status,
  onStatusChange,
  size = "sm",
  variant = "outline",
  className,
  compact = false,
}: MarkEventDoneButtonProps) {
  const [currentStatus, setCurrentStatus] = useState<string>(status || "published");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isCompleted = currentStatus === "completed";

  async function handleToggleStatus() {
    startTransition(async () => {
      const nextStatus = isCompleted ? "published" : "completed";

      try {
        const res = await fetch(`/api/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update event status.");
        }

        setCurrentStatus(nextStatus);
        toast.success(
          nextStatus === "completed"
            ? "Event marked as done / completed!"
            : "Event marked as active / upcoming."
        );

        if (onStatusChange) {
          onStatusChange(nextStatus);
        }

        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Could not update status. Please try again.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant={isCompleted ? "secondary" : variant}
      size={size}
      disabled={isPending}
      onClick={handleToggleStatus}
      className={
        className ||
        (isCompleted
          ? "gap-1.5 text-xs text-muted-foreground hover:text-foreground border-border/80"
          : "gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30")
      }
      title={isCompleted ? "Reopen event as upcoming" : "Mark event as finished / done"}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isCompleted ? (
        <RotateCcw className="h-3.5 w-3.5" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      )}
      {!compact && (
        <span>{isCompleted ? "Reopen Event" : "Mark as Done"}</span>
      )}
      {compact && isCompleted && <span>Reopen</span>}
      {compact && !isCompleted && <span>Done</span>}
    </Button>
  );
}
