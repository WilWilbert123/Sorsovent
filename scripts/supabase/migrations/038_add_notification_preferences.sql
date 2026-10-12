-- Migration 038: Support Push Notification Preferences in profiles.privacy_settings

COMMENT ON COLUMN public.profiles.privacy_settings IS 'JSONB storing user privacy and granular push notification preferences: {"profile_visibility": "public", "push_notifications": {"enabled": true, "likes": true, "comments": true, "chats": true, "events": true}}';
