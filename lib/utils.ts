import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeFormatDate(val: any, formatStr: string, fallback = ""): string {
  if (!val) return fallback;
  const d = new Date(val);
  if (!isValid(d) || isNaN(d.getTime())) return fallback;
  try {
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}
