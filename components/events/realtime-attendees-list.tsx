"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface AttendeeProfile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface AttendeeItem {
  user_id: string;
  status: string;
  profiles: AttendeeProfile | null;
}

interface RealtimeAttendeesListProps {
  eventId: string;
  initialAttendees: AttendeeItem[];
}

export function RealtimeAttendeesList({
  eventId,
  initialAttendees,
}: RealtimeAttendeesListProps) {
  const [attendees, setAttendees] = useState<AttendeeItem[]>(initialAttendees);

  useEffect(() => {
    setAttendees(initialAttendees);
  }, [initialAttendees]);

  useEffect(() => {
    if (!eventId) return;

    const supabase = createClient();

    const fetchAttendees = async () => {
      const { data, error } = await supabase
        .from("event_attendees")
        .select(`
          user_id,
          status,
          profiles!event_attendees_user_id_fkey (
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq("event_id", eventId)
        .in("status", ["attending", "going"]);

      if (!error && data) {
        setAttendees(data as any);
      }
    };

    const channel = supabase
      .channel(`realtime-attendees-list:${eventId}`)
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

          if (!changedEventId || changedEventId === eventId) {
            fetchAttendees();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (!attendees || attendees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
        <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-lg font-semibold mb-2">No attendees yet</h2>
        <p className="text-muted-foreground mb-6">
          Be the first to RSVP to this event!
        </p>
        <Link href={`/events/${eventId}`}>
          <Button>View Event</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {attendees.map((a) => {
        const profile = a.profiles;
        if (!profile) return null;
        return (
          <div
            key={a.user_id}
            className="flex items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/40 transition-colors"
          >
            <Link
              href={`/profile/${profile.username}`}
              className="flex items-center gap-3 group"
            >
              <Avatar>
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>
                  {(profile.full_name || profile.username)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold group-hover:text-primary transition-colors">
                  {profile.full_name || profile.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{profile.username}
                </p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
