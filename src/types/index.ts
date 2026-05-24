export interface Work {
  id: string;
  title: string;
  pen_name: string;
  genre_tags: string;
  description: string;
  created_at: string;
  updated_at: string;
  sync_status: string;
  owner_id: string;
}

export interface Volume {
  id: string;
  work_id: string;
  title: string;
  sort_order: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  volume_id: string | null;
  work_id: string;
  title: string;
  content_json: string;
  word_count: number;
  status: string;
  sort_order: number;
  source: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TodayStats {
  total_words: number;
  session_count: number;
}

export type Theme = "light" | "dark" | "eye-care";
