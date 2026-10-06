// ============================================================================
// Sorsovent — API Types
// Request/response shapes for API routes and server actions
// ============================================================================

// ---------------------------------------------------------------------------
// Generic API Response
// ---------------------------------------------------------------------------

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Server action result (login / signup) */
export interface AuthActionResult {
  error?: string;
}

/** Signup form data shape */
export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

/** Login form data shape */
export interface LoginData {
  email: string;
  password: string;
  nextUrl?: string;
}

// ---------------------------------------------------------------------------
// Events API
// ---------------------------------------------------------------------------

/** POST /api/events request body */
export interface CreateEventRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location_name: string;
  is_public?: boolean;
  category?: string;
  price?: number;
}

// ---------------------------------------------------------------------------
// Posts API
// ---------------------------------------------------------------------------

/** POST /api/posts request body */
export interface CreatePostRequest {
  content: string;
  location_name?: string;
}

// ---------------------------------------------------------------------------
// Notifications API
// ---------------------------------------------------------------------------

/** POST /api/notifications request body */
export interface CreateNotificationRequest {
  recipient_id: string;
  type: string;
  content: string;
  reference_id?: string;
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/** Upload response from Cloudinary */
export interface UploadResult {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type?: string;
}

// ---------------------------------------------------------------------------
// Search / Filters
// ---------------------------------------------------------------------------

/** Common query params for list endpoints */
export interface ListQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
}

/** Event-specific filter params */
export interface EventFilterParams extends ListQueryParams {
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/** Post-specific filter params */
export interface PostFilterParams extends ListQueryParams {
  authorId?: string;
  eventId?: string;
}
