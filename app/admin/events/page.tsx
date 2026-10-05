import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { CalendarDays, Search, MapPin, MoreHorizontal, ShieldOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function AdminEventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select(`
      id, title, start_time, location_name, is_public, attendee_count,
      profiles!events_organizer_id_fkey (username, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground text-sm">Manage platform events</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search events by title or location..." className="pl-9 max-w-sm" />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Organizer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events?.map((event: any) => {
              const startDate = event.start_time ? new Date(event.start_time) : null;
              return (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs text-muted-foreground">{event.attendee_count || 0} attending</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {startDate ? format(startDate, "MMM d, yyyy • h:mm a") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[150px]">{event.location_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    @{event.profiles?.username}
                  </TableCell>
                  <TableCell>
                    {event.is_public ? (
                      <Badge variant="outline" className="text-xs border-green-300 text-green-700">Public</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Private</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <ShieldOff className="mr-2 h-4 w-4" />
                          Take Down Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
