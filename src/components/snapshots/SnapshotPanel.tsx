import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { ChapterSnapshot } from "../../types";
import * as db from "../../lib/db";

export function SnapshotPanel() {
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const activeChapterTitle = useAppStore((s) => {
    const ch = s.chapters.find((c) => c.id === s.activeChapterId);
    return ch?.title ?? "";
  });

  const [snapshots, setSnapshots] = useState<ChapterSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMsg = useCallback((text: string) => {
    setMsg(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(""), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!activeChapterId) {
      setSnapshots([]);
      return;
    }
    db.listSnapshots(activeChapterId)
      .then(setSnapshots)
      .catch(console.error);
  }, [activeChapterId]);

  const handleCreate = async () => {
    if (!activeChapterId) return;
    setLoading(true);
    try {
      await db.createSnapshot(activeChapterId, "manual");
      showMsg("快照已保存");
      const list = await db.listSnapshots(activeChapterId);
      setSnapshots(list);
    } catch (e) {
      showMsg("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (snap: ChapterSnapshot) => {
    if (!confirm(`确定恢复到此快照？当前内容将被替换。`)) return;
    setLoading(true);
    try {
      // Save current state as snapshot first
      await db.createSnapshot(activeChapterId!, "auto");
      await db.restoreSnapshot(snap.id);
      showMsg("已恢复，请重新打开章节");
      // Reload chapter
      const ch = await db.getChapter(activeChapterId!);
      useAppStore.getState().setChapters(
        useAppStore.getState().chapters.map((c) =>
          c.id === ch.id ? ch : c,
        ),
      );
    } catch (e) {
      showMsg("恢复失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("删除此快照？")) return;
    await db.deleteSnapshot(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleString("zh-CN");
    } catch {
      return s;
    }
  };

  if (!activeChapterId) {
    return (
      <div className="p-3 text-sm text-text-secondary">
        选择一个章节查看历史版本
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">历史版本</h2>
          <p className="text-xs text-text-secondary truncate">
            {activeChapterTitle}
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="text-xs px-2 py-1 bg-accent text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          + 手动快照
        </button>
      </div>

      {msg && (
        <div className="text-xs px-2 py-1 bg-surface-alt rounded text-accent text-center">
          {msg}
        </div>
      )}

      {snapshots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">
          暂无历史版本。每25次保存自动记录，或手动创建快照。
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-alt text-sm"
            >
              <span className="shrink-0 text-xs">
                {snap.snapshot_type === "auto" ? "🕐" : "📌"}
              </span>
              <span className="flex-1 truncate text-text-primary">
                {formatDate(snap.saved_at)}
              </span>
              <span className="text-xs text-text-secondary shrink-0">
                {snap.word_count.toLocaleString()}字
              </span>
              <button
                onClick={() => handleRestore(snap)}
                disabled={loading}
                className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-accent hover:text-white text-text-secondary disabled:opacity-50 shrink-0"
                title="恢复到该版本"
              >
                恢复
              </button>
              <button
                onClick={() => handleDelete(snap.id)}
                disabled={loading}
                className="text-xs px-1 text-text-secondary hover:text-red-500 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
