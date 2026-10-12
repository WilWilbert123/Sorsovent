"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteEventButtonProps {
  eventId: string;
  eventTitle: string;
  onDeleted?: () => void;
  redirectToEvents?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  className?: string;
  buttonText?: string;
}

export function DeleteEventButton({
  eventId,
  eventTitle,
  onDeleted,
  redirectToEvents = true,
  size = "sm",
  variant = "destructive",
  className,
  buttonText = "Delete Event",
}: DeleteEventButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to delete event.");
        }

        toast.success(data.message || "Event deleted successfully.");
        setOpen(false);

        if (onDeleted) {
          onDeleted();
        }

        if (redirectToEvents) {
          router.push("/events");
        }
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Could not delete event. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={className || "gap-1.5"}
            disabled={isPending}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            {buttonText && <span>{buttonText}</span>}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Event</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>&ldquo;{eventTitle}&rdquo;</strong>?
            This will remove the event along with attendee records and group chats. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
