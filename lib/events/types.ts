export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  location_name: string;
  lat: number | null;
  lng: number | null;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  category: string | null;
  is_public: boolean;
  max_attendees: number | null;
  attendee_count: number;
  created_at: string;
  updated_at: string;
}
