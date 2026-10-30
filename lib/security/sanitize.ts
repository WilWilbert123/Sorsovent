/**
 * Security sanitization, URL validation, and safe error helpers.
 */

/**
 * Escapes HTML special characters to prevent DOM/Stored XSS when interpolating
 * user-controlled values into raw HTML strings (e.g., Leaflet L.divIcon & bindPopup).
 */
export function escapeHtml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validates that an image/avatar URL uses a safe protocol (https:, http:, or relative /)
 * and returns an HTML-escaped string safe for <img src="..."> attributes.
 */
export function sanitizeImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return escapeHtml(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return escapeHtml(parsed.toString());
    }
  } catch {
    return "";
  }
  return "";
}

/**
 * Validates redirect targets (e.g., `next` or `nextUrl`) to prevent Open Redirect attacks.
 * Only permits relative internal paths starting with a single `/`.
 */
export function getSafeRedirectPath(
  rawNext: string | null | undefined,
  fallback = "/home"
): string {
  if (!rawNext || typeof rawNext !== "string") return fallback;
  const trimmed = rawNext.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\0")
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Validates external social/website URLs entered in user profiles.
 * Rejects `javascript:`, `data:`, `vbscript:`, etc.
 */
export function isSafeHttpUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || !rawUrl.trim()) return true; // empty is allowed
  const trimmed = rawUrl.trim();
  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Validates that an uploaded media URL belongs to a safe HTTPS origin or data URL preview,
 * blocking internal route paths like `/api/auth/signout` from being embedded in `<img>`.
 */
export function isSafeMediaUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("data:image/")) return true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    // Block self-referential /api/ routes to prevent forced-action GET requests via <img>
    if (parsed.pathname.startsWith("/api/")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

