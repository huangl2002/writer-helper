import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { Note } from "../../types";
import * as db from "../../lib/db";

const COLORS = [
  { value: "#ffd54f", label: "黄" },
  { value: "#ef9a9a", label: "红" },
  { value: "#a5d6a7", label: "绿" },
  { value: "#90caf9", label: "蓝" },
  { value: "#ce93d8", label: "紫" },
  { value: "#ffcc80", label: "橙" },
];

export function NotesList() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<"wall" | "list">("wall");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<Partial<Note>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!activeWorkId) return;
    doRefresh(searchQuery);
  }, [activeWorkId, searchQuery]);

  const doRefresh = async (query: string) => {
    if (!activeWorkId) return;
    if (query.trim()) {
      const results = await db.searchNotes(query.trim());
      setNotes(results);
    } else {
      setNotes(await db.listNotes(activeWorkId));
    }
  };

  const handleAdd = async () => {
    const title = prompt("便签标题：");
    if (!title?.trim()) return;
    await db.createNote(activeWorkId, title.trim());
    await doRefresh(searchQuery);
  };

  const handleDelete = async (id: string) => {
    await db.deleteNote(id);
    await doRefresh(searchQuery);
  };

  const handleTogglePin = async (note: Note) => {
    await db.updateNote(
      note.id,
      note.title,
      note.content,
      note.tags,
      note.color,
      !note.is_pinned,
    );
    await doRefresh(searchQuery);
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    let tags = "";
    try {
      tags = JSON.parse(note.tags || "[]").join("、");
    } catch {
      tags = (note.tags || "").replace(/[\[\]"]/g, "");
    }
    setEditNote({ ...note, tags });
  };

  const saveEdit = async () => {
    if (!editingId || !editNote.title?.trim()) {
      setEditingId(null);
      return;
    }
    const tagArr = (editNote.tags || "")
      .split(/[,，、]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    await db.updateNote(
      editingId,
      editNote.title || "",
      editNote.content || "",
      JSON.stringify(tagArr),
      editNote.color || "#ffd54f",
      editNote.is_pinned ?? false,
    );
    setEditingId(null);
    await doRefresh(searchQuery);
  };

  const tagsOf = (note: Note): string[] => {
    try {
      return JSON.parse(note.tags || "[]");
    } catch {
      return [];
    }
  };

  if (!activeWorkId) {
    return (
      <div className="p-3 text-sm text-text-secondary">请先选择作品</div>
    );
  }

  const pinned = notes.filter((n) => n.is_pinned);
  const unpinned = notes.filter((n) => !n.is_pinned);
  const displayed = [...pinned, ...unpinned];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-border">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索笔记..."
          className="flex-1 text-xs px-2 py-1 bg-surface border border-border rounded text-text-primary focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => setViewMode(viewMode === "wall" ? "list" : "wall")}
          className="text-xs px-1.5 py-1 border border-border rounded hover:bg-surface-alt text-text-primary"
        >
          {viewMode === "wall" ? "列表" : "卡片"}
        </button>
        <button
          onClick={handleAdd}
          className="text-xs px-2 py-1 bg-accent text-white rounded hover:opacity-90"
        >
          +
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayed.length === 0 ? (
          <div className="flex items-center justify-center text-sm text-text-secondary p-4">
            点击 + 创建第一条笔记
          </div>
        ) : editingId ? (
          /* Edit form */
          <div className="border border-border rounded-lg bg-surface p-3 space-y-2">
            <input
              autoFocus
              value={editNote.title || ""}
              onChange={(e) =>
                setEditNote({ ...editNote, title: e.target.value })
              }
              className="w-full text-sm font-semibold bg-transparent border-b border-border focus:border-accent focus:outline-none px-1 py-0.5 text-text-primary"
              placeholder="标题"
            />
            <textarea
              value={editNote.content || ""}
              onChange={(e) =>
                setEditNote({ ...editNote, content: e.target.value })
              }
              className="w-full text-sm bg-surface border border-border rounded px-2 py-1 text-text-primary focus:border-accent focus:outline-none h-32 resize-none"
              placeholder="内容..."
            />
            <div className="flex items-center gap-2">
              <input
                value={editNote.tags || ""}
                onChange={(e) =>
                  setEditNote({ ...editNote, tags: e.target.value })
                }
                className="flex-1 text-xs px-2 py-1 bg-surface border border-border rounded text-text-primary focus:border-accent focus:outline-none"
                placeholder="标签（逗号分隔）"
              />
              <div className="flex gap-0.5">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setEditNote({ ...editNote, color: c.value })}
                    className={`w-4 h-4 rounded-full border ${
                      editNote.color === c.value
                        ? "border-text-primary ring-1 ring-accent"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                className="px-3 py-1 text-sm bg-accent text-white rounded hover:opacity-90"
              >
                保存
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-surface-alt text-text-primary"
              >
                取消
              </button>
            </div>
          </div>
        ) : viewMode === "wall" ? (
          /* Card wall view */
          <div className="grid grid-cols-2 gap-2">
            {displayed.map((note) => {
              const tags = tagsOf(note);
              return (
                <div
                  key={note.id}
                  className="rounded-lg p-2 text-xs cursor-pointer hover:shadow transition-shadow border border-border"
                  style={{ backgroundColor: note.color + "40" }}
                  onClick={() => startEdit(note)}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-semibold truncate text-text-primary">
                      {note.is_pinned && "📌 "}
                      {note.title || "无标题"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(note);
                      }}
                      className="text-text-secondary hover:text-accent shrink-0"
                      title={note.is_pinned ? "取消置顶" : "置顶"}
                    >
                      📌
                    </button>
                  </div>
                  {note.content && (
                    <p className="text-text-secondary line-clamp-3 mb-1">
                      {note.content}
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {tags.map((t, i) => (
                        <span
                          key={i}
                          className="px-1 bg-surface-alt rounded text-text-secondary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="space-y-1">
            {displayed.map((note) => {
              const tags = tagsOf(note);
              return (
                <div
                  key={note.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-alt cursor-pointer border-l-2"
                  style={{ borderLeftColor: note.color }}
                  onClick={() => startEdit(note)}
                >
                  <span className="shrink-0">
                    {note.is_pinned ? "📌" : ""}
                  </span>
                  <span className="flex-1 truncate text-sm text-text-primary">
                    {note.title || "无标题"}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {note.content
                      ? note.content.slice(0, 30) +
                        (note.content.length > 30 ? "..." : "")
                      : ""}
                  </span>
                  {tags.length > 0 && (
                    <div className="flex gap-0.5">
                      {tags.slice(0, 2).map((t, i) => (
                        <span
                          key={i}
                          className="px-1 bg-surface-alt rounded text-xs text-text-secondary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    className="text-text-secondary hover:text-red-500 shrink-0 text-xs"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
