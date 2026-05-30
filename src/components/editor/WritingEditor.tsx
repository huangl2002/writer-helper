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
import { SelectionToolbar } from "./SelectionToolbar";
import { ThemeToggle } from "../theme/ThemeToggle";
import { extractPlainText, countWords } from "../../lib/utils";
import * as db from "../../lib/db";

const SAVE_INTERVAL = 30000;
const CRASH_BUFFER_KEY = "aiwriter_crash_buffer";

interface CrashEntry {
  chapterId: string;
  title: string;
  contentJson: string;
  savedAt: number;
}

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
  const [showCrashRecovery, setShowCrashRecovery] = useState(false);
  const [crashData, setCrashData] = useState<CrashEntry | null>(null);
  const [typewriterMode, setTypewriterMode] = useState(() => {
    try { return localStorage.getItem("aiwriter_typewriter") === "1"; } catch { return false; }
  });

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
      // Typewriter scrolling: keep cursor in upper third
      if (typewriterMode) {
        requestAnimationFrame(() => {
          const { from } = editor.state.selection;
          const coords = editor.view.coordsAtPos(from);
          const parent = editor.view.dom.closest(".overflow-y-auto") as HTMLElement;
          if (parent && coords) {
            const containerRect = parent.getBoundingClientRect();
            const cursorY = coords.top - containerRect.top + parent.scrollTop;
            const targetY = containerRect.height * 0.3;
            if (coords.bottom > containerRect.bottom - 50) {
              parent.scrollTo({ top: cursorY - targetY, behavior: "auto" });
            }
          }
        });
      }
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
      // Clear crash buffer on successful save
      try { localStorage.removeItem(CRASH_BUFFER_KEY); } catch {}
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

  // Crash buffer — save editor state to localStorage every 10s
  useEffect(() => {
    const crashSave = () => {
      if (!activeChapterId || !editor) return;
      try {
        const entry: CrashEntry = {
          chapterId: activeChapterId,
          title: chapterTitle,
          contentJson: JSON.stringify(editor.getJSON()),
          savedAt: Date.now(),
        };
        localStorage.setItem(CRASH_BUFFER_KEY, JSON.stringify(entry));
      } catch {
        // localStorage may be full or unavailable
      }
    };
    const timer = setInterval(crashSave, 10000);
    // Clear crash buffer on clean unmount (app closing normally)
    return () => { clearInterval(timer); };
  }, [activeChapterId, chapterTitle, editor]);

  // Check for crash recovery on mount
  useEffect(() => {
    if (!activeChapterId) return;
    try {
      const raw = localStorage.getItem(CRASH_BUFFER_KEY);
      if (!raw) return;
      const entry: CrashEntry = JSON.parse(raw);
      // Only recover if the crash buffer is for the current chapter
      if (entry.chapterId === activeChapterId && entry.contentJson) {
        setCrashData(entry);
        setShowCrashRecovery(true);
      }
    } catch {
      // Corrupted crash buffer, ignore
    }
  }, [activeChapterId]);

  const handleCrashRecovery = () => {
    if (!crashData || !editor) return;
    try {
      editor.commands.setContent(JSON.parse(crashData.contentJson));
      setChapterTitle(crashData.title);
      setShowCrashRecovery(false);
      setCrashData(null);
      localStorage.removeItem(CRASH_BUFFER_KEY);
    } catch {
      setShowCrashRecovery(false);
    }
  };

  const dismissCrashRecovery = () => {
    setShowCrashRecovery(false);
    setCrashData(null);
    localStorage.removeItem(CRASH_BUFFER_KEY);
  };

  // One-click formatting for web novels
  const handleFormat = useCallback(() => {
    if (!editor) return;
    const { doc } = editor.state;
    const newContent: any[] = [];
    const fullWidthMap: Record<string, string> = {
      ",": "，", ".": "。", "!": "！", "?": "？", ":": "：", ";": "；",
      "(": "（", ")": "）", "<": "《", ">": "》", '"': '"', "'": "'",
    };

    doc.descendants((node, _pos) => {
      if (node.type.name === "paragraph") {
        let text = node.textContent;
        // Convert half-width punctuation to full-width (skip code blocks)
        if (node.textContent) {
          for (const [half, full] of Object.entries(fullWidthMap)) {
            text = text.split(half).join(full);
          }
        }
        if (text.trim()) {
          newContent.push({
            type: "paragraph",
            content: [{ type: "text", text: text }],
          });
          // Add blank paragraph between content paragraphs
          newContent.push({ type: "paragraph" });
        }
      } else if (node.type.name === "heading") {
        newContent.push(node.toJSON());
        newContent.push({ type: "paragraph" });
      } else if (node.type.name === "horizontalRule") {
        newContent.push(node.toJSON());
      } else if (node.type.name === "bulletList" || node.type.name === "orderedList") {
        newContent.push(node.toJSON());
        newContent.push({ type: "paragraph" });
      } else if (node.type.name === "blockquote") {
        newContent.push(node.toJSON());
        newContent.push({ type: "paragraph" });
      }
    });

    // Remove trailing empty paragraphs
    while (newContent.length > 0 && newContent[newContent.length - 1].type === "paragraph" && (!newContent[newContent.length - 1].content || newContent[newContent.length - 1].content.length === 0)) {
      newContent.pop();
    }

    if (newContent.length > 0) {
      editor.commands.setContent({ type: "doc", content: newContent });
    }
  }, [editor]);

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
            <button
              onClick={() => {
                const next = !typewriterMode;
                setTypewriterMode(next);
                try { localStorage.setItem("aiwriter_typewriter", next ? "1" : "0"); } catch {}
              }}
              className={`text-sm px-2 py-1 border rounded ${
                typewriterMode
                  ? "bg-accent text-white border-accent"
                  : "border-border hover:bg-surface text-text-primary"
              }`}
            >
              打字机
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
          <button
            onClick={() => {
              const next = !typewriterMode;
              setTypewriterMode(next);
              try { localStorage.setItem("aiwriter_typewriter", next ? "1" : "0"); } catch {}
            }}
            className={`text-sm px-2 py-1 border rounded shrink-0 ${
              typewriterMode
                ? "bg-accent text-white border-accent"
                : "border-border hover:bg-surface text-text-primary"
            }`}
            title="打字机模式：光标保持屏幕上部，内容自动上移"
          >
            打字机
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
      <EditorToolbar editor={editor} onFind={() => setShowFindBar(true)} onFormat={handleFormat} />

      {/* Find/Replace bar */}
      <FindReplaceBar
        editor={editor}
        visible={showFindBar}
        onClose={() => setShowFindBar(false)}
      />

      {/* Crash recovery banner */}
      {showCrashRecovery && crashData && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm shrink-0">
          <span className="text-amber-800">
            ⚠ 检测到未保存的内容（{new Date(crashData.savedAt).toLocaleTimeString("zh-CN")} 的草稿），是否恢复？
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCrashRecovery}
              className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded hover:bg-amber-600"
            >
              恢复
            </button>
            <button
              onClick={dismissCrashRecovery}
              className="text-xs px-2 py-0.5 border border-amber-300 rounded text-amber-700 hover:bg-amber-100"
            >
              放弃
            </button>
          </div>
        </div>
      )}

      {/* Editor area with paper style */}
      <div className="flex-1 overflow-y-auto bg-[var(--color-editor-bg)] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-surface/60 z-10 flex items-center justify-center">
            <span className="text-sm text-text-secondary">加载中...</span>
          </div>
        )}
        {/* Selection AI toolbar */}
        <SelectionToolbar editor={editor} />
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
