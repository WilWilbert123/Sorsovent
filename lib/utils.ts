import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeFormatDate(val: any, formatStr: string, fallback = ""): string {
  if (!val) return fallback;
  let d: Date | null = null;

  if (val instanceof Date) {
    d = val;
  } else if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    // Pure time string like "16:00:00" or "16:00"
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      d = new Date(`1970-01-01T${trimmed}`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      // Date only YYYY-MM-DD - parse in local midnight
      d = new Date(`${trimmed}T00:00:00`);
    } else {
      d = new Date(trimmed);
    }
  } else if (typeof val === "number") {
    d = new Date(val);
  }

  if (!d || !isValid(d) || isNaN(d.getTime())) return fallback;
  try {
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Formats event date string safely (extracts from event_date, start_time ISO, or created_at)
 */
export function formatEventDate(
  eventDate?: string | null,
  startTime?: string | null,
  createdAt?: string | null,
  formatStr = "MMMM d, yyyy"
): string {
  // 1. Try eventDate (YYYY-MM-DD or ISO)
  if (eventDate) {
    const formatted = safeFormatDate(eventDate, formatStr);
    if (formatted) return formatted;
  }

  // 2. Try startTime if it contains full ISO date
  if (startTime && (startTime.includes("T") || (startTime.includes("-") && startTime.length >= 10))) {
    const formatted = safeFormatDate(startTime, formatStr);
    if (formatted) return formatted;
  }

  // 3. Fallback to createdAt if present
  if (createdAt) {
    const formatted = safeFormatDate(createdAt, formatStr);
    if (formatted) return formatted;
  }

  return "Date to be announced";
}

/**
 * Formats event time safely (e.g. "4:00 PM" or "4:00 PM - 6:00 PM")
 */
export function formatEventTime(
  startTime?: string | null,
  endTime?: string | null,
  fallback = "TBA"
): string {
  if (!startTime && !endTime) return fallback;

  const startFormatted = startTime ? safeFormatDate(startTime, "h:mm a") : "";
  const endFormatted = endTime ? safeFormatDate(endTime, "h:mm a") : "";

  if (startFormatted && endFormatted) {
    return `${startFormatted} - ${endFormatted}`;
  }
  if (startFormatted) return startFormatted;
  if (endFormatted) return endFormatted;

  return fallback;
}

