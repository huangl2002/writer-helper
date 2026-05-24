import { invoke } from "@tauri-apps/api/core";
import type { Chapter, TodayStats, Volume, Work } from "../types";

// Works
export async function createWork(title: string): Promise<Work> {
  return invoke("create_work", { title });
}
export async function listWorks(): Promise<Work[]> {
  return invoke("list_works");
}
export async function updateWork(id: string, title: string): Promise<void> {
  return invoke("update_work", { id, title });
}
export async function deleteWork(id: string): Promise<void> {
  return invoke("delete_work", { id });
}

// Volumes
export async function createVolume(
  workId: string,
  title: string,
): Promise<Volume> {
  return invoke("create_volume", { workId, title });
}
export async function listVolumes(workId: string): Promise<Volume[]> {
  return invoke("list_volumes", { workId });
}
export async function updateVolume(
  id: string,
  title: string,
): Promise<void> {
  return invoke("update_volume", { id, title });
}
export async function deleteVolume(id: string): Promise<void> {
  return invoke("delete_volume", { id });
}
export async function reorderVolumes(ids: string[]): Promise<void> {
  return invoke("reorder_volumes", { ids });
}

// Chapters
export async function createChapter(
  workId: string,
  volumeId: string | null,
  title: string,
): Promise<Chapter> {
  return invoke("create_chapter", { workId, volumeId, title });
}
export async function getChapter(id: string): Promise<Chapter> {
  return invoke("get_chapter", { id });
}
export async function updateChapter(
  id: string,
  title: string,
  contentJson: string,
  wordCount: number,
): Promise<void> {
  return invoke("update_chapter", { id, title, contentJson, wordCount });
}
export async function deleteChapter(id: string): Promise<void> {
  return invoke("delete_chapter", { id });
}
export async function listChapters(
  workId: string,
  volumeId: string | null,
): Promise<Chapter[]> {
  return invoke("list_chapters", { workId, volumeId });
}
export async function reorderChapters(ids: string[]): Promise<void> {
  return invoke("reorder_chapters", { ids });
}

// Stats
export async function recordWritingSession(
  workId: string,
  chapterId: string | null,
  wordDelta: number,
): Promise<void> {
  return invoke("record_writing_session", { workId, chapterId, wordDelta });
}
export async function getTodayWordCount(): Promise<TodayStats> {
  return invoke("get_today_word_count");
}
