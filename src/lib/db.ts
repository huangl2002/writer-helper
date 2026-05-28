import { invoke } from "@tauri-apps/api/core";
import type { AiConfig, AiConfigInput, AllTimeStats, Chapter, ChapterSnapshot, Character, CharacterRelation, Goal, MonthlyStats, Note, Outline, TodayStats, Volume, WeekStats, Work } from "../types";

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
export async function moveChapter(
  id: string,
  volumeId: string | null,
): Promise<void> {
  return invoke("move_chapter", { id, volumeId });
}
export async function updateChapterStatus(
  id: string,
  status: string,
): Promise<void> {
  return invoke("update_chapter_status", { id, status });
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
export async function getWeekStats(): Promise<WeekStats> {
  return invoke("get_week_stats");
}
export async function getMonthStats(): Promise<MonthlyStats> {
  return invoke("get_month_stats");
}
export async function getAllTimeStats(): Promise<AllTimeStats> {
  return invoke("get_all_time_stats");
}

// Characters
export async function createCharacter(
  workId: string,
  name: string,
): Promise<Character> {
  return invoke("create_character", { workId, name });
}
export async function listCharacters(workId: string): Promise<Character[]> {
  return invoke("list_characters", { workId });
}
export async function getCharacter(id: string): Promise<Character> {
  return invoke("get_character", { id });
}
export async function updateCharacter(
  id: string,
  name: string,
  aliases: string,
  gender: string,
  appearance: string,
  personality: string,
  background: string,
  customAttrs: string,
): Promise<void> {
  return invoke("update_character", {
    id,
    name,
    aliases,
    gender,
    appearance,
    personality,
    background,
    customAttrs,
  });
}
export async function deleteCharacter(id: string): Promise<void> {
  return invoke("delete_character", { id });
}

// Character Relations
export async function createRelation(
  workId: string,
  charAId: string,
  charBId: string,
  relationType: string,
  description: string,
): Promise<CharacterRelation> {
  return invoke("create_relation", {
    workId,
    charAId,
    charBId,
    relationType,
    description,
  });
}
export async function listRelations(
  workId: string,
): Promise<CharacterRelation[]> {
  return invoke("list_relations", { workId });
}
export async function deleteRelation(id: string): Promise<void> {
  return invoke("delete_relation", { id });
}

// Outlines
export async function createOutline(
  workId: string,
  parentId: string | null,
  title: string,
  nodeType: string,
): Promise<Outline> {
  return invoke("create_outline", { workId, parentId, title, nodeType });
}
export async function listOutlines(workId: string): Promise<Outline[]> {
  return invoke("list_outlines", { workId });
}
export async function updateOutline(
  id: string,
  title: string,
  content: string,
  nodeType: string,
  linkedChapterId: string | null,
  isComplete: boolean,
): Promise<void> {
  return invoke("update_outline", { id, title, content, nodeType, linkedChapterId, isComplete });
}
export async function moveOutline(
  id: string,
  parentId: string | null,
): Promise<void> {
  return invoke("move_outline", { id, parentId });
}
export async function deleteOutline(id: string): Promise<void> {
  return invoke("delete_outline", { id });
}
export async function reorderOutlines(ids: string[]): Promise<void> {
  return invoke("reorder_outlines", { ids });
}

// Notes
export async function createNote(
  workId: string | null,
  title: string,
): Promise<Note> {
  return invoke("create_note", { workId, title });
}
export async function listNotes(
  workId: string | null,
): Promise<Note[]> {
  return invoke("list_notes", { workId });
}
export async function updateNote(
  id: string,
  title: string,
  content: string,
  tags: string,
  color: string,
  isPinned: boolean,
): Promise<void> {
  return invoke("update_note", { id, title, content, tags, color, isPinned });
}
export async function deleteNote(id: string): Promise<void> {
  return invoke("delete_note", { id });
}
export async function searchNotes(query: string): Promise<Note[]> {
  return invoke("search_notes", { query });
}

// Goals
export async function createGoal(
  workId: string,
  goalType: string,
  targetValue: number,
): Promise<Goal> {
  return invoke("create_goal", { workId, goalType, targetValue });
}
export async function getActiveGoal(
  workId: string,
  goalType: string,
): Promise<Goal | null> {
  return invoke("get_active_goal", { workId, goalType });
}
export async function updateGoal(
  id: string,
  targetValue: number,
  isActive: boolean,
): Promise<void> {
  return invoke("update_goal", { id, targetValue, isActive });
}
export async function deleteGoal(id: string): Promise<void> {
  return invoke("delete_goal", { id });
}

// Export
export async function exportChapterTxt(id: string, path: string): Promise<string> {
  return invoke("export_chapter_txt", { id, path });
}
export async function exportChapterMd(id: string, path: string): Promise<string> {
  return invoke("export_chapter_md", { id, path });
}
export async function exportWorkTxt(workId: string, path: string): Promise<string> {
  return invoke("export_work_txt", { workId, path });
}
export async function exportWorkMd(workId: string, path: string): Promise<string> {
  return invoke("export_work_md", { workId, path });
}
export async function exportOutlinesMd(workId: string, path: string): Promise<string> {
  return invoke("export_outlines_md", { workId, path });
}
export async function exportCharactersJson(workId: string, path: string): Promise<string> {
  return invoke("export_characters_json", { workId, path });
}

// Import
export async function previewImportTxt(path: string): Promise<string[]> {
  return invoke("preview_import_txt", { path });
}
export async function importTxt(
  workId: string,
  volumeId: string | null,
  path: string,
): Promise<number> {
  return invoke("import_txt", { workId, volumeId, path });
}
export async function importMd(
  workId: string,
  volumeId: string | null,
  path: string,
): Promise<number> {
  return invoke("import_md", { workId, volumeId, path });
}
export async function importFolder(
  workId: string,
  volumeId: string | null,
  folderPath: string,
): Promise<number> {
  return invoke("import_folder", { workId, volumeId, folderPath });
}

// Snapshots
export async function createSnapshot(
  chapterId: string,
  snapshotType: string,
): Promise<ChapterSnapshot> {
  return invoke("create_snapshot", { chapterId, snapshotType });
}
export async function listSnapshots(
  chapterId: string,
): Promise<ChapterSnapshot[]> {
  return invoke("list_snapshots", { chapterId });
}
export async function restoreSnapshot(snapshotId: string): Promise<void> {
  return invoke("restore_snapshot", { snapshotId });
}
export async function deleteSnapshot(id: string): Promise<void> {
  return invoke("delete_snapshot", { id });
}
export async function autoSnapshotIfNeeded(
  chapterId: string,
): Promise<boolean> {
  return invoke("auto_snapshot_if_needed", { chapterId });
}

// AI Config
export async function createAiConfig(input: AiConfigInput): Promise<AiConfig> {
  return invoke("create_ai_config", { input });
}
export async function listAiConfigs(): Promise<AiConfig[]> {
  return invoke("list_ai_configs");
}
export async function getDefaultAiConfig(): Promise<AiConfig | null> {
  return invoke("get_default_ai_config");
}
export async function getAiConfigDecrypted(id: string): Promise<AiConfig> {
  return invoke("get_ai_config_decrypted", { id });
}
export async function updateAiConfig(
  id: string,
  input: AiConfigInput,
): Promise<void> {
  return invoke("update_ai_config", { id, input });
}
export async function setDefaultAiConfig(id: string): Promise<void> {
  return invoke("set_default_ai_config", { id });
}
export async function deleteAiConfig(id: string): Promise<void> {
  return invoke("delete_ai_config", { id });
}
