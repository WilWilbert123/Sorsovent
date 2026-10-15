"use client";

import { useState } from "react";
import { Flag, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ReportModalProps {
  targetId: string;
  targetType: "event" | "user" | "post";
  targetTitle?: string;
  triggerVariant?: "ghost" | "outline" | "destructive" | "default";
  triggerSize?: "sm" | "default" | "xs";
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  renderTrigger?: boolean;
}

const REPORT_REASONS = [
  "Scam, fraud, or fake gathering",
  "Inappropriate or adult content",
  "Hate speech, harassment, or bullying",
  "Spam or misleading information",
  "Safety hazard or illegal activity",
  "Copyright or intellectual property issue",
  "Other policy violation",
];

export function ReportModal({
  targetId,
  targetType,
  targetTitle,
  triggerVariant = "ghost",
  triggerSize = "sm",
  className,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  renderTrigger = true,
}: ReportModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (controlledIsOpen !== undefined) {
      if (!open && controlledOnClose) controlledOnClose();
    } else {
      setInternalOpen(open);
    }
  };
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: selectedReason,
          details,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Thank you. Your report has been submitted for review.");
        setIsOpen(false);
        setDetails("");
      } else {
        toast.error(data.error || "Failed to submit report. Please sign in.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {renderTrigger && (
        <Button
          variant={triggerVariant}
          size={triggerSize}
          onClick={() => setIsOpen(true)}
          className={className || "text-muted-foreground hover:text-destructive gap-1.5 text-xs"}
        >
          <Flag className="h-3.5 w-3.5" />
          Report
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Report {targetType.toUpperCase()}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Help us keep Mingle safe. What is wrong with{" "}
                {targetTitle ? <strong>"{targetTitle}"</strong> : `this ${targetType}`}?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Reason</Label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                        selectedReason === r
                          ? "bg-primary/10 border-primary font-medium text-foreground"
                          : "bg-muted/30 border-transparent hover:bg-muted/70 text-muted-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={r}
                        checked={selectedReason === r}
                        onChange={() => setSelectedReason(r)}
                        className="text-primary focus:ring-primary"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reportDetails" className="text-xs font-semibold">
                  Additional Details (Optional)
                </Label>
                <Textarea
                  id="reportDetails"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe the issue or provide extra context..."
                  className="text-xs h-20 resize-none"
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={isSubmitting}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="h-3.5 w-3.5" />
                    Submit Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
