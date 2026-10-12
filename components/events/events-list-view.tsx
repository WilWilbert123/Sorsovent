"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { safeFormatDate, formatEventDate } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { CalendarDays, MapPin, Users, Clock, Plus, Star, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { MarkEventDoneButton } from "@/components/events/mark-event-done-button";

interface EventsListViewProps {
  createdEvents: any[];
  attendingEvents: any[];
  allEvents: any[];
  completedEvents?: any[];
  currentUserId?: string;
}

export function EventsListView({
  createdEvents = [],
  attendingEvents = [],
  allEvents = [],
  completedEvents = [],
  currentUserId,
}: EventsListViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "my" | "attending" | "completed">("all");
  const [eventsList, setEventsList] = useState<any[]>(allEvents);
  const [createdList, setCreatedList] = useState<any[]>(createdEvents);
  const [attendingList, setAttendingList] = useState<any[]>(attendingEvents);
  const [completedList, setCompletedList] = useState<any[]>(completedEvents);

  useEffect(() => {
    setEventsList(allEvents);
  }, [allEvents]);

  useEffect(() => {
    setCreatedList(createdEvents);
  }, [createdEvents]);

  useEffect(() => {
    setAttendingList(attendingEvents);
  }, [attendingEvents]);

  useEffect(() => {
    setCompletedList(completedEvents);
  }, [completedEvents]);

  // Real-time synchronization for attendee counts & attendance status
  useEffect(() => {
    const supabase = createClient();

    const syncAttendeeCounts = async () => {
      // 1. Fetch live attendee counts for all events
      const { data: latestEvents } = await supabase
        .from("events")
        .select("id, event_attendees(count)");

      if (latestEvents) {
        const countMap = new Map<string, number>();
        for (const ev of latestEvents) {
          countMap.set(ev.id, (ev as any).event_attendees?.[0]?.count ?? 0);
        }

        const updateEventListWithCounts = (list: any[]) =>
          list.map((ev) => ({
            ...ev,
            attendee_count: countMap.has(ev.id) ? countMap.get(ev.id)! : (ev.attendee_count || 0),
          }));

        setEventsList((prev) => updateEventListWithCounts(prev));
        setCreatedList((prev) => updateEventListWithCounts(prev));
        setAttendingList((prev) => updateEventListWithCounts(prev));
      }

      // 2. If logged in, fetch user's live attending list
      if (currentUserId) {
        const { data: attendingRows } = await supabase
          .from("event_attendees")
          .select("event_id, events(*, event_attendees(count))")
          .eq("user_id", currentUserId);

        if (attendingRows) {
          const direct = attendingRows
            .map((r: any) => {
              if (!r.events) return null;
              return {
                ...r.events,
                attendee_count: r.events.event_attendees?.[0]?.count ?? 0,
              };
            })
            .filter(Boolean);

          const attMap = new Map<string, any>();
          for (const ev of direct) attMap.set(ev.id, ev);
          for (const ev of createdList) {
            if (!attMap.has(ev.id)) attMap.set(ev.id, ev);
          }
          setAttendingList(Array.from(attMap.values()));
        }
      }
    };

    const channel = supabase
      .channel("realtime-events-list-attendees")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_attendees",
        },
        () => {
          syncAttendeeCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, createdList]);

  const handleEventDeleted = (deletedId: string) => {
    setEventsList((prev) => prev.filter((e) => e.id !== deletedId));
    setCreatedList((prev) => prev.filter((e) => e.id !== deletedId));
    setAttendingList((prev) => prev.filter((e) => e.id !== deletedId));
    setCompletedList((prev) => prev.filter((e) => e.id !== deletedId));
  };

  const handleStatusChange = (eventId: string, newStatus: string) => {
    // 1. Update status in createdList & attendingList
    setCreatedList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );
    setAttendingList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );

    // 2. Move between eventsList (upcoming) and completedList (done)
    if (newStatus === "completed") {
      const target =
        eventsList.find((e) => e.id === eventId) ||
        createdList.find((e) => e.id === eventId);
      if (target) {
        setEventsList((prev) => prev.filter((e) => e.id !== eventId));
        setCompletedList((prev) => [
          { ...target, status: "completed" },
          ...prev.filter((e) => e.id !== eventId),
        ]);
      }
    } else {
      const target =
        completedList.find((e) => e.id === eventId) ||
        createdList.find((e) => e.id === eventId);
      if (target) {
        setCompletedList((prev) => prev.filter((e) => e.id !== eventId));
        setEventsList((prev) => [
          { ...target, status: newStatus },
          ...prev.filter((e) => e.id !== eventId),
        ]);
      }
    }
  };

  const displayedEvents =
    activeTab === "my"
      ? createdList
      : activeTab === "attending"
      ? attendingList
      : activeTab === "completed"
      ? completedList
      : eventsList;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Discover and host events in Sorsogon</p>
        </div>
        <Link href="/events/create">
          <Button size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b mb-6 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Upcoming Events ({eventsList.length})
        </button>

        {currentUserId && (
          <>
            <button
              onClick={() => setActiveTab("my")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "my"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              My Created Events ({createdList.length})
            </button>

            <button
              onClick={() => setActiveTab("attending")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === "attending"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Attending ({attendingList.length})
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab("completed")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === "completed"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Past / Done ({completedList.length})
        </button>
      </div>

      {/* Events List */}
      {displayedEvents.length === 0 ? (
        <div className="text-center py-16 px-4 border rounded-2xl bg-card shadow-sm">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
          <p className="font-semibold text-base">
            {activeTab === "my"
              ? "You haven't created any events yet."
              : activeTab === "attending"
              ? "You haven't joined any events yet."
              : activeTab === "completed"
              ? "No completed events yet."
              : "No upcoming events found."}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-6">
            {activeTab === "my"
              ? "Host a gathering, concert, or sports event for your community!"
              : activeTab === "completed"
              ? "Events that have concluded and are marked as done will appear here."
              : "Browse events and click 'I'm Going' to join!"}
          </p>
          <Link href={activeTab === "my" ? "/events/create" : "/explore"}>
            <Button>{activeTab === "my" ? "Create an Event" : "Explore Events"}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedEvents.map((event) => {
            const isCreator = currentUserId && (event.creator_id === currentUserId || event.organizer_id === currentUserId);
            const isCompleted = event.status === "completed";
            const emoji = getCategoryEmoji(event.category, event.title);
            const monthStr = formatEventDate(event.event_date, event.start_time, event.created_at, "MMM");
            const dayStr = formatEventDate(event.event_date, event.start_time, event.created_at, "d");
            const fullDateStr = formatEventDate(event.event_date, event.start_time, event.created_at, "EEE, MMM d, yyyy");
            const timeStr = event.start_time ? safeFormatDate(event.start_time, "h:mm a") : "";
            const hasValidDate = monthStr && monthStr !== "Date to be announced";

            return (
              <div
                key={event.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all group ${
                  isCompleted ? "opacity-90 bg-muted/20" : ""
                }`}
              >
                <Link href={`/events/${event.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                    isCompleted
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}>
                    {hasValidDate && dayStr ? (
                      <>
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary">{monthStr}</span>
                        <span className="text-lg sm:text-xl font-black leading-none text-foreground">{dayStr}</span>
                      </>
                    ) : (
                      <span className="text-2xl">{emoji}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-base">{emoji}</span>
                      <h3 className={`font-semibold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}>
                        {event.title}
                      </h3>
                      {isCreator && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary shrink-0">
                          My Event
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="outline" className="text-[10px] py-0 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 shrink-0 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          Done
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold text-foreground bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                        <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{fullDateStr}</span>
                      </span>

                      {timeStr && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{timeStr}</span>
                        </span>
                      )}
                      {event.location_name && (
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{event.location_name}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{event.attendee_count || 0} attending</span>
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 shrink-0 justify-end">
                  {isCreator && (
                    <>
                      <MarkEventDoneButton
                        eventId={event.id}
                        status={event.status}
                        compact
                        onStatusChange={(newStatus) => handleStatusChange(event.id, newStatus)}
                      />
                      <DeleteEventButton
                        eventId={event.id}
                        eventTitle={event.title}
                        redirectToEvents={false}
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        buttonText=""
                        onDeleted={() => handleEventDeleted(event.id)}
                      />
                    </>
                  )}

                  <Link href={`/events/${event.id}/chat`}>
                    <Button variant="secondary" size="sm" className="gap-1.5 text-xs h-9">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat
                    </Button>
                  </Link>
                  <Link href={`/events/${event.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-9">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
