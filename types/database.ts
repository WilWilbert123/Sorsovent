// ============================================================================
// Sorsovent — Database Types
// Generated from: scripts/generate-migrations.js
// Reconciled with actual field usage across the codebase
// ============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** User role levels used for authorization */
export type UserRole = "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

/** Visibility setting for events and posts */
export type Visibility = "public" | "private" | "followers_only";

/** Status of an event */
export type EventStatus = "draft" | "pending" | "published" | "cancelled" | "completed";

/** Status of an RSVP / attendance */
export type AttendeeStatus = "going" | "interested" | "not_going";

/** Type of saved item */
export type SavedItemType = "event" | "post";

/** Conversation type */
export type ConversationType = "direct" | "group" | "event";

/** Notification type */
export type NotificationType =
  | "follow"
  | "like"
  | "comment"
  | "event_join"
  | "mention"
  | "message"
  | "event_update"
  | "report_resolved";

/** Report status */
export type ReportStatus = "pending" | "resolved" | "dismissed";

/** Media type */
export type MediaType = "image" | "video";

// ---------------------------------------------------------------------------
// Table Row Types (what you GET from Supabase)
// ---------------------------------------------------------------------------

/** Row from `profiles` table */
export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  privacy_settings: ProfilePrivacySettings;
  created_at: string;
  updated_at: string;
}

export interface ProfilePrivacySettings {
  profile_visibility: Visibility;
}

/** Row from `user_roles` table */
export interface UserRoleRow {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/** Row from `events` table */
export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: string;
  cover_image: string | null;
  cover_image_url: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  attendee_count: number;
  price: number;
  visibility: Visibility;
  status: EventStatus;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/** Row from `event_attendees` table */
export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: AttendeeStatus;
  rsvp_status: AttendeeStatus;
  created_at: string;
}

/** Row from `posts` table */
export interface Post {
  id: string;
  author_id: string;
  content: string | null;
  media_urls: string[] | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  latitude: number | null;
  longitude: number | null;
  event_id: string | null;
  visibility: Visibility;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

/** Row from `post_media` table */
export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: MediaType;
  display_order: number;
  created_at: string;
}

/** Row from `comments` table */
export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Row from `likes` / `post_likes` table */
export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

/** Row from `follows` table */
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/** Row from `saved_items` table */
export interface SavedItem {
  id: string;
  user_id: string;
  item_type: SavedItemType;
  event_id: string | null;
  post_id: string | null;
  created_at: string;
}

/** Row from `conversations` table */
export interface Conversation {
  id: string;
  type: ConversationType;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Row from `conversation_members` table */
export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  created_at: string;
}

/** Row from `messages` table */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  created_at: string;
}

/** Row from `notifications` table */
export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  content: string | null;
  event_id: string | null;
  post_id: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

/** Row from `reports` table */
export interface Report {
  id: string;
  reporter_id: string | null;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reported_event_id: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

/** Row from `blocks` table */
export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/** Row from `places` table */
export interface Place {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  latitude: number;
  longitude: number;
  cover_image: string | null;
  rating: number;
  created_at: string;
  updated_at: string;
}

/** Row from `event_photos` table */
export interface EventPhoto {
  id: string;
  event_id: string;
  uploader_id: string;
  photo_url: string;
  created_at: string;
}

/** Row from `audit_logs` table */
export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Insert Types (what you SEND to Supabase — id & timestamps omitted)
// ---------------------------------------------------------------------------

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at">> & {
  updated_at?: string;
};

export type EventInsert = Omit<Event, "id" | "created_at" | "updated_at" | "attendee_count"> & {
  id?: string;
  attendee_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type EventUpdate = Partial<Omit<Event, "id" | "created_at" | "creator_id">> & {
  updated_at?: string;
};

export type PostInsert = Omit<Post, "id" | "created_at" | "updated_at" | "like_count" | "comment_count"> & {
  id?: string;
  like_count?: number;
  comment_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type PostUpdate = Partial<Omit<Post, "id" | "created_at" | "author_id">> & {
  updated_at?: string;
};

export type CommentInsert = Omit<Comment, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MessageInsert = Omit<Message, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type NotificationInsert = Omit<Notification, "id" | "created_at" | "is_read"> & {
  id?: string;
  is_read?: boolean;
  created_at?: string;
};

export type ReportInsert = Omit<Report, "id" | "created_at" | "updated_at" | "status"> & {
  id?: string;
  status?: ReportStatus;
  created_at?: string;
  updated_at?: string;
};
