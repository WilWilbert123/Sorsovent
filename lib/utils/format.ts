import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  // If it's more than 7 days ago, show the actual date
  if (Date.now() - date.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return format(date, "MMM d, yyyy");
  }
  
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatEventDate(dateString: string | null | undefined): string {
  if (!dateString) return "TBD";
  
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }
  
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  
  return format(date, "MMM d, yyyy • h:mm a");
}

export function formatCurrency(amount: number): string {
  if (amount === 0) return "Free";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(amount);
}
