"use client";

import { useState } from "react";
import Link from "next/link";
import { safeFormatDate } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { CalendarDays, MapPin, Users, Clock, Plus, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EventsListViewProps {
  createdEvents: any[];
  attendingEvents: any[];
  allEvents: any[];
  currentUserId?: string;
}

export function EventsListView({
  createdEvents = [],
  attendingEvents = [],
  allEvents = [],
  currentUserId,
}: EventsListViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "my" | "attending">("all");

  const displayedEvents =
    activeTab === "my"
      ? createdEvents
      : activeTab === "attending"
      ? attendingEvents
      : allEvents;

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
          All Events ({allEvents.length})
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
              My Created Events ({createdEvents.length})
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
              Attending ({attendingEvents.length})
            </button>
          </>
        )}
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
              : "No upcoming events found."}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 mb-6">
            {activeTab === "my"
              ? "Host a gathering, concert, or sports event for your community!"
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
            const emoji = getCategoryEmoji(event.category, event.title);
            const dateVal = event.start_time || event.event_date || event.created_at;
            const monthStr = safeFormatDate(dateVal, "MMM");
            const dayStr = safeFormatDate(dateVal, "d");
            const timeStr = safeFormatDate(dateVal, "h:mm a");

            return (
              <div
                key={event.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <Link href={`/events/${event.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex flex-col items-center justify-center shrink-0 text-primary border border-primary/20">
                    {monthStr && dayStr ? (
                      <>
                        <span className="text-[10px] sm:text-xs font-semibold uppercase">{monthStr}</span>
                        <span className="text-lg sm:text-xl font-bold leading-none">{dayStr}</span>
                      </>
                    ) : (
                      <span className="text-2xl">{emoji}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{emoji}</span>
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      {isCreator && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary shrink-0">
                          My Event
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {timeStr && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeStr}
                        </span>
                      )}
                      {event.location_name && (
                        <span className="flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{event.location_name}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.attendee_count || 0} attending
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 shrink-0 justify-end">
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
