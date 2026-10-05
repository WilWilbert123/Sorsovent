export type NotificationType = 
  | "post_like" 
  | "post_comment" 
  | "event_invite" 
  | "event_reminder" 
  | "new_follower"
  | "system_alert";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}
