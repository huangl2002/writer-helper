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

export interface DailyStats {
  date: string;
  word_count: number;
}

export interface WeekStats {
  days: DailyStats[];
  total_words: number;
}

export interface MonthlyStats {
  days: DailyStats[];
  total_words: number;
}

export interface AllTimeStats {
  total_words: number;
  total_chapters: number;
  total_sessions: number;
}

export interface Character {
  id: string;
  work_id: string;
  name: string;
  aliases: string;
  gender: string;
  appearance: string;
  personality: string;
  background: string;
  custom_attrs: string;
  created_at: string;
  updated_at: string;
}

export interface CharacterRelation {
  id: string;
  work_id: string;
  char_a_id: string;
  char_b_id: string;
  relation_type: string;
  description: string;
  created_at: string;
}

export interface Outline {
  id: string;
  work_id: string;
  parent_id: string | null;
  title: string;
  content: string;
  node_type: string;
  sort_order: number;
  linked_chapter_id: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  work_id: string | null;
  title: string;
  content: string;
  tags: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChapterSnapshot {
  id: string;
  chapter_id: string;
  content_json: string;
  word_count: number;
  snapshot_type: string;
  saved_at: string;
}

export interface AiConfig {
  id: string;
  name: string;
  api_url: string;
  api_key_encrypted: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  is_default: boolean;
  created_at: string;
}

export interface AiConfigInput {
  name: string;
  api_url: string;
  api_key: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
}

export interface Goal {
  id: string;
  work_id: string;
  goal_type: string;
  target_value: number;
  deadline: string;
  is_active: boolean;
  created_at: string;
}

export interface YearStats {
  year: number;
  months: MonthData[];
  total_words: number;
  total_days: number;
  best_streak: number;
}

export interface MonthData {
  month: number;
  days: DailyStats[];
  total: number;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}

export type Theme = "light" | "dark" | "eye-care";
