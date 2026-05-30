import { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useAppStore } from "../../stores/appStore";
import { EditorToolbar } from "./EditorToolbar";
import { StatusBar } from "./StatusBar";
import { FindReplaceBar } from "./FindReplaceBar";
import { ThemeToggle } from "../theme/ThemeToggle";
import { extractPlainText, countWords } from "../../lib/utils";
import * as db from "../../lib/db";

const SAVE_INTERVAL = 30000;

export function WritingEditor() {
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleHelperPanel = useAppStore((s) => s.toggleHelperPanel);
  const setLayoutMode = useAppStore((s) => s.setLayoutMode);
  const layoutMode = useAppStore((s) => s.layoutMode);
  const setTodayStats = useAppStore((s) => s.setTodayStats);
  const chapters = useAppStore((s) => s.chapters);

  const [chapterTitle, setChapterTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lastSavedWordCount, setLastSavedWordCount] = useState(0);
  const [showFindBar, setShowFindBar] = useState(false);

  // Refs to track current state for save without stale closures
  const savingChapterRef = useRef<string | null>(null);
  const saveDataRef = useRef<{
    chapterId: string;
    title: string;
    wordCount: number;
    lastSavedWordCount: number;
    workId: string | null;
  } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "开始写作..." }),
      Link.configure({ openOnClick: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
    ],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: ({ editor }) => {
      const text = extractPlainText(JSON.stringify(editor.getJSON()));
      setWordCount(countWords(text));
    },
  });

  // Update save ref whenever relevant state changes
  useEffect(() => {
    if (activeChapterId) {
      saveDataRef.current = {
        chapterId: activeChapterId,
        title: chapterTitle,
        wordCount,
        lastSavedWordCount,
        workId: activeWorkId,
      };
    }
  }, [activeChapterId, chapterTitle, wordCount, lastSavedWordCount, activeWorkId]);

  // Save function - uses ref to avoid stale closures
  const saveCurrentChapter = useCallback(async () => {
    const data = saveDataRef.current;
    if (!data || !editor) return;

    const currentId = data.chapterId;
    if (savingChapterRef.current === currentId) return;
    savingChapterRef.current = currentId;

    setIsSaving(true);
    const json = JSON.stringify(editor.getJSON());
    const delta = data.wordCount - data.lastSavedWordCount;
    try {
      await db.updateChapter(currentId, data.title, json, data.wordCount);
      db.autoSnapshotIfNeeded(currentId).catch(() => {});
      if (delta !== 0 && data.workId) {
        await db.recordWritingSession(data.workId, currentId, delta);
        const stats = await db.getTodayWordCount();
        setTodayStats(stats);
      }
      setLastSavedWordCount(data.wordCount);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setIsSaving(false);
      savingChapterRef.current = null;
    }
  }, [editor, setTodayStats]);

  // Load chapter content when active chapter changes
  useEffect(() => {
    if (!activeChapterId) {
      editor?.commands.setContent({
        type: "doc",
        content: [{ type: "paragraph" }],
      });
      setChapterTitle("");
      setWordCount(0);
      setLastSavedWordCount(0);
      saveDataRef.current = null;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const prevChapterId = saveDataRef.current?.chapterId;
    const doLoad = () => {
      db.getChapter(activeChapterId)
        .then((ch) => {
          setChapterTitle(ch.title);
          try {
            editor?.commands.setContent(JSON.parse(ch.content_json));
          } catch {
            editor?.commands.setContent({
              type: "doc",
              content: [{ type: "paragraph" }],
            });
          }
          setWordCount(ch.word_count);
          setLastSavedWordCount(ch.word_count);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    };

    if (prevChapterId && prevChapterId !== activeChapterId) {
      saveCurrentChapter()
        .catch((e) => console.error("Failed to save previous chapter:", e))
        .finally(doLoad);
    } else {
      doLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapterId]);

  // Load today stats on mount
  useEffect(() => {
    db.getTodayWordCount().then(setTodayStats).catch(console.error);
  }, []);

  // Auto-save interval
  useEffect(() => {
    const timer = setInterval(saveCurrentChapter, SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [saveCurrentChapter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      // Save
      if (mod && e.key === "s") {
        e.preventDefault();
        saveCurrentChapter();
      }

      // Find
      if (mod && e.key === "f") {
        e.preventDefault();
        setShowFindBar(true);
      }

      // Find/Replace
      if (mod && e.key === "h") {
        e.preventDefault();
        setShowFindBar(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveCurrentChapter]);

  // Compute chapter position
  const workChapters = chapters.filter((c) => c.work_id === activeWorkId);
  const chapterIndex = workChapters.findIndex((c) => c.id === activeChapterId);
  const chapterPos = chapterIndex >= 0 ? chapterIndex + 1 : 0;
  const totalChapters = workChapters.length;

  if (!activeChapterId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-alt">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="text-sm px-2 py-1 border border-border rounded hover:bg-surface"
            >
              侧栏
            </button>
            <button
              onClick={toggleHelperPanel}
              className="text-sm px-2 py-1 border border-border rounded hover:bg-surface"
            >
              辅栏
            </button>
            <button
              onClick={() =>
                setLayoutMode(layoutMode === "focus" ? "default" : "focus")
              }
              className="text-sm px-2 py-1 border border-border rounded hover:bg-surface"
            >
              {layoutMode === "focus" ? "退出专注" : "专注"}
            </button>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center text-text-secondary bg-[var(--color-editor-bg)]">
          <p>选择或创建一个章节开始写作</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-alt gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={toggleSidebar}
            className="text-sm px-2 py-1 border border-border rounded hover:bg-surface shrink-0"
          >
            侧栏
          </button>
          <button
            onClick={toggleHelperPanel}
            className="text-sm px-2 py-1 border border-border rounded hover:bg-surface shrink-0"
          >
            辅栏
          </button>
          <button
            onClick={() =>
              setLayoutMode(layoutMode === "focus" ? "default" : "focus")
            }
            className="text-sm px-2 py-1 border border-border rounded hover:bg-surface shrink-0"
          >
            {layoutMode === "focus" ? "退出专注" : "专注"}
          </button>
          <input
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            onBlur={() => {
              if (chapterTitle.trim() && activeChapterId) {
                saveCurrentChapter().catch(console.error);
              }
            }}
            className="flex-1 text-lg font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-accent focus:outline-none px-2 py-0.5 text-text-primary min-w-0"
            placeholder="章节标题"
          />
        </div>
        <ThemeToggle />
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} onFind={() => setShowFindBar(true)} />

      {/* Find/Replace bar */}
      <FindReplaceBar
        editor={editor}
        visible={showFindBar}
        onClose={() => setShowFindBar(false)}
      />

      {/* Editor area with paper style */}
      <div className="flex-1 overflow-y-auto bg-[var(--color-editor-bg)]">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/60 z-10 flex items-center justify-center">
            <span className="text-sm text-text-secondary">加载中...</span>
          </div>
        )}
        {/* Paper */}
        <div className="max-w-[210mm] mx-auto my-6">
          <div className="bg-surface shadow-lg rounded-sm mx-4">
            <div className="px-8 py-10 min-h-[297mm]">
              <EditorContent
                editor={editor}
                className="prose prose-stone max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[600px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-text-secondary [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar
        wordCount={wordCount}
        isSaving={isSaving}
        chapterIndex={chapterPos}
        totalChapters={totalChapters}
      />
    </div>
  );
}
