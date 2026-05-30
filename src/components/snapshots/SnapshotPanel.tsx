import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { useModal } from "../common/Modal";
import type { ChapterSnapshot } from "../../types";
import * as db from "../../lib/db";

interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
  lineNum: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  let i = m, j = n;
  const items: { type: "same" | "added" | "removed"; text: string }[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      items.push({ type: "same", text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      items.push({ type: "added", text: newLines[j - 1] });
      j--;
    } else {
      items.push({ type: "removed", text: oldLines[i - 1] });
      i--;
    }
  }
  items.reverse();

  let lineNum = 0;
  for (const item of items) {
    result.push({ ...item, lineNum: ++lineNum });
  }
  return result;
}

export function SnapshotPanel() {
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const activeChapterTitle = useAppStore((s) => {
    const ch = s.chapters.find((c) => c.id === s.activeChapterId);
    return ch?.title ?? "";
  });

  const [snapshots, setSnapshots] = useState<ChapterSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [diffLeft, setDiffLeft] = useState<ChapterSnapshot | null>(null);
  const [diffRight, setDiffRight] = useState<ChapterSnapshot | null>(null);
  const [diffContent, setDiffContent] = useState<DiffLine[] | null>(null);
  const { modalConfirm } = useModal();
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
    const ok = await modalConfirm(`确定恢复到此快照？当前内容将被替换。`);
    if (!ok) return;
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
    const ok = await modalConfirm("删除此快照？");
    if (!ok) return;
    await db.deleteSnapshot(id);
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    if (diffLeft?.id === id) { setDiffLeft(null); setDiffContent(null); }
    if (diffRight?.id === id) { setDiffRight(null); setDiffContent(null); }
  };

  const handleSelectForDiff = (snap: ChapterSnapshot) => {
    if (!diffLeft) {
      setDiffLeft(snap);
    } else if (!diffRight && snap.id !== diffLeft.id) {
      setDiffRight(snap);
    } else {
      setDiffLeft(snap);
      setDiffRight(null);
      setDiffContent(null);
    }
  };

  useEffect(() => {
    if (!diffLeft || !diffRight) {
      setDiffContent(null);
      return;
    }
    try {
      const leftText = JSON.parse(diffLeft.content_json);
      const rightText = JSON.parse(diffRight.content_json);
      const oldPlain = leftText?.content?.map((n: any) => n.content?.map((c: any) => c.text).join("")).join("\n") || "";
      const newPlain = rightText?.content?.map((n: any) => n.content?.map((c: any) => c.text).join("")).join("\n") || "";
      setDiffContent(computeDiff(oldPlain, newPlain));
    } catch {
      setDiffContent(computeDiff(diffLeft.content_json, diffRight.content_json));
    }
  }, [diffLeft, diffRight]);

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

      {/* Diff view */}
      {diffLeft && diffRight && diffContent && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-alt border-b border-border text-xs">
            <span>
              对比: <span className="font-medium">{formatDate(diffLeft.saved_at)}</span>
              {" → "}
              <span className="font-medium">{formatDate(diffRight.saved_at)}</span>
            </span>
            <button
              onClick={() => { setDiffLeft(null); setDiffRight(null); setDiffContent(null); }}
              className="text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto font-mono text-xs">
            {diffContent.map((line, i) => (
              <div
                key={i}
                className={`px-3 py-0.5 whitespace-pre-wrap ${
                  line.type === "added"
                    ? "bg-green-100 text-green-800"
                    : line.type === "removed"
                      ? "bg-red-100 text-red-800"
                      : "text-text-primary"
                }`}
              >
                <span className="select-none text-text-secondary mr-2 inline-block w-8 text-right">
                  {line.lineNum}
                </span>
                <span>{line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}</span>
                {line.text}
              </div>
            ))}
          </div>
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
                onClick={() => handleSelectForDiff(snap)}
                disabled={loading}
                className={`text-xs px-1.5 py-0.5 border rounded shrink-0 disabled:opacity-50 ${
                  diffLeft?.id === snap.id || diffRight?.id === snap.id
                    ? "bg-accent text-white border-accent"
                    : "border-border hover:bg-surface-alt text-text-secondary"
                }`}
                title="选择对比 (选2个)"
              >
                {diffLeft?.id === snap.id ? "L" : diffRight?.id === snap.id ? "R" : "对比"}
              </button>
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
