// ============================================================================
// Sorsovent — Component / UI Types
// Types used by React components with Supabase join data
// ============================================================================

import type {
  Profile,
  Post,
  Event,
  Message,
  Notification,
  Conversation,
  ConversationMember,
  PostMedia,
  EventAttendee,
  Report,
  AuditLog,
  Place,
  UserRole,
} from "./database";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** Minimal profile shape returned from Supabase joins */
export interface ProfileSummary {
  id?: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

/** Extended profile for profile pages */
export interface ProfileDetail extends Profile {
  follower_count: number;
  following_count: number;
  post_count: number;
  is_following?: boolean;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/** Post with author profile joined (what feed queries return) */
export interface PostWithAuthor extends Post {
  profiles: ProfileSummary;
  post_media?: Pick<PostMedia, "media_url" | "media_type">[];
}

/** Props for FeedPost component */
export interface FeedPostProps {
  post: PostWithAuthor;
  currentUserId: string;
}

/** Props for CreatePostCard component */
export interface CreatePostCardProps {
  profile: ProfileSummary | null;
  userId: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Event with organizer profile joined */
export interface EventWithOrganizer extends Event {
  profiles: ProfileSummary;
}

/** Props for JoinEventButton component */
export interface JoinEventButtonProps {
  eventId: string;
  isAttending: boolean;
  userId: string;
}

// ---------------------------------------------------------------------------
// Chat / Messages
// ---------------------------------------------------------------------------

/** Message with sender profile joined */
export interface MessageWithSender extends Message {
  profiles: ProfileSummary;
}

/** Conversation with members and last message (for the list view) */
export interface ConversationWithDetails extends Conversation {
  conversation_members: (ConversationMember & {
    profiles: ProfileSummary;
  })[];
  messages?: Message[];
}

/** Props for ChatMessages component */
export interface ChatMessagesProps {
  initialMessages: MessageWithSender[];
  conversationId: string;
  currentUserId: string;
}

/** Props for ChatInput component */
export interface ChatInputProps {
  conversationId: string;
  senderId: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** Notification with actor profile joined */
export interface NotificationWithActor extends Notification {
  profiles: ProfileSummary;
}

// ---------------------------------------------------------------------------
// Follow
// ---------------------------------------------------------------------------

/** Props for FollowButton component */
export interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  isFollowing: boolean;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Props for SettingsPageClient component */
export interface SettingsPageClientProps {
  profile: Profile;
  userId: string;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Dashboard stats card data */
export interface DashboardStat {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: string;
}

/** User row for admin user management */
export interface AdminUserRow extends Profile {
  user_roles?: {
    role: UserRole;
  };
}

/** Report with related entities for admin */
export interface ReportWithDetails extends Report {
  reporter: ProfileSummary | null;
  reported_user: ProfileSummary | null;
  reported_post: Pick<Post, "id" | "content"> | null;
  reported_event: Pick<Event, "id" | "title"> | null;
}
