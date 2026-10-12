"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeAttendeeCountProps {
  eventId: string;
  initialCount?: number;
  className?: string;
  showIcon?: boolean;
}

export function RealtimeAttendeeCount({
  eventId,
  initialCount = 0,
  className = "",
  showIcon = true,
}: RealtimeAttendeeCountProps) {
  const [count, setCount] = useState<number>(initialCount);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (!eventId) return;

    const supabase = createClient();

    const fetchLatestCount = async () => {
      const { count: freshCount, error } = await supabase
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (!error && typeof freshCount === "number") {
        setCount(freshCount);
        setIsUpdating(true);
        setTimeout(() => setIsUpdating(false), 600);
      }
    };

    // Initial fetch to guarantee accuracy
    fetchLatestCount();

    // Listen to real-time changes on event_attendees
    const channel = supabase
      .channel(`realtime-attendees-count:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_attendees",
        },
        (payload) => {
          const changedEventId =
            (payload.new as any)?.event_id || (payload.old as any)?.event_id;

          // Re-fetch if it affects this event or on deletion where old event_id may be omitted
          if (!changedEventId || changedEventId === eventId) {
            fetchLatestCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div className={`flex items-center gap-1.5 transition-all duration-300 ${isUpdating ? "scale-105 text-primary" : ""} ${className}`}>
      {showIcon && <Users className="h-4 w-4 shrink-0 text-primary" />}
      <span>
        <strong className="font-semibold">{count}</strong>{" "}
        {count === 1 ? "person" : "people"} attending
      </span>
    </div>
  );
}
