export interface PresenceStatus {
  isOnline: boolean;
  statusText: string;
  relativeTime: string;
}

/**
 * Calculates user presence status from a last_seen_at ISO string.
 * Users active within the last 120 seconds (2 minutes) are considered Online.
 */
export function getPresenceStatus(
  lastSeenAt: string | null | undefined,
  onlineThresholdSeconds: number = 120
): PresenceStatus {
  if (!lastSeenAt) {
    return {
      isOnline: false,
      statusText: "Offline",
      relativeTime: "Offline",
    };
  }

  const lastSeenDate = new Date(lastSeenAt);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000));

  // If active within the threshold (e.g. 2 minutes), user is online
  if (diffInSeconds < onlineThresholdSeconds) {
    return {
      isOnline: true,
      statusText: "Online",
      relativeTime: "Active now",
    };
  }

  // Minutes ago (< 1 hour)
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    const text = `Active ${minutes}m ago`;
    return {
      isOnline: false,
      statusText: text,
      relativeTime: `${minutes}m ago`,
    };
  }

  // Hours ago (< 24 hours)
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    const text = `Active ${hours}h ago`;
    return {
      isOnline: false,
      statusText: text,
      relativeTime: `${hours}h ago`,
    };
  }

  // Days ago (< 30 days)
  if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    const text = `Active ${days}d ago`;
    return {
      isOnline: false,
      statusText: text,
      relativeTime: `${days}d ago`,
    };
  }

  // Older than 30 days
  return {
    isOnline: false,
    statusText: "Offline",
    relativeTime: "Offline",
  };
}
