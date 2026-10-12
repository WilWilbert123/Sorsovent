"use client";

import { ReportModal } from "./report-modal";

interface ReportButtonProps {
  targetId: string;
  targetType: "post" | "event" | "user";
  targetTitle?: string;
  className?: string;
}

export function ReportButton({ targetId, targetType, targetTitle, className }: ReportButtonProps) {
  return (
    <ReportModal
      targetId={targetId}
      targetType={targetType}
      targetTitle={targetTitle}
      className={className}
    />
  );
}
