export interface Post {
  id: string;
  author_id: string;
  content: string;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  is_public: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_url: string;
  media_type: "image" | "video";
  display_order: number;
  created_at: string;
}
