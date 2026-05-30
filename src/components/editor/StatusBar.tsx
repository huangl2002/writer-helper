import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { formatTime } from "../../lib/utils";
import * as db from "../../lib/db";
import type { Goal } from "../../types";

interface Props {
  wordCount: number;
  isSaving: boolean;
  chapterIndex: number;
  totalChapters: number;
}

export function StatusBar({ wordCount, isSaving, chapterIndex, totalChapters }: Props) {
  const todayStats = useAppStore((s) => s.todayStats);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const chapters = useAppStore((s) => s.chapters);
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);
  const [now, setNow] = useState(new Date());
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [showChapterList, setShowChapterList] = useState(false);

  // Combined session timer + clock (single interval)
  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      setElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  // Load goal
  useEffect(() => {
    if (!activeWorkId) return;
    db.getActiveGoal(activeWorkId, "daily_words")
      .then(setGoal)
      .catch(() => {});
  }, [activeWorkId]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const goalRemaining = goal
    ? goal.target_value - todayStats.total_words
    : 0;

  return (
    <div className="flex items-center px-4 py-1.5 border-t border-border bg-surface-alt/70 backdrop-blur-sm text-xs text-text-secondary shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-4 relative">
        {totalChapters > 0 && (
          <button
            onClick={() => setShowChapterList(!showChapterList)}
            className="hover:bg-surface px-1.5 py-0.5 rounded text-xs cursor-pointer"
          >
            第 {chapterIndex}/{totalChapters} 章 ▾
          </button>
        )}
        <span>本章 {wordCount.toLocaleString()} 字</span>

        {/* Chapter quick-switch dropdown */}
        {showChapterList && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowChapterList(false)} />
            <div className="absolute bottom-full left-0 mb-1 z-50 w-64 max-h-64 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl">
              {chapters
                .filter((c) => c.work_id === activeWorkId)
                .map((ch, i) => (
                  <button
                    key={ch.id}
                    onClick={() => { setActiveChapter(ch.id); setShowChapterList(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-alt flex items-center gap-2 ${
                      ch.id === activeChapterId ? "bg-accent/10 text-accent font-medium" : "text-text-primary"
                    }`}
                  >
                    <span className="text-text-secondary w-6 text-right shrink-0">{i + 1}</span>
                    <span className="truncate flex-1">{ch.title}</span>
                    <span className="text-text-secondary shrink-0">{ch.word_count}字</span>
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Center section */}
      <div className="flex-1 flex justify-center">
        {goal && (
          <span
            className={
              goalRemaining <= 0 ? "text-green-500 font-medium" : ""
            }
          >
            {goalRemaining <= 0
              ? "✓ 已达标"
              : `距目标 ${goalRemaining.toLocaleString()} 字`}
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <span>今日 {todayStats.total_words.toLocaleString()} 字</span>
        <span>⏱ {formatElapsed(elapsed)}</span>
        <span>{isSaving ? "保存中..." : "已保存"}</span>
        <span className="tabular-nums">{formatTime(now)}</span>
      </div>
    </div>
  );
}
