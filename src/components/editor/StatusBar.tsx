import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { formatTime } from "../../lib/utils";
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
  const [now, setNow] = useState(new Date());
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);

  // Session timer
  useEffect(() => {
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [sessionStart]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load goal
  useEffect(() => {
    if (!activeWorkId) return;
    import("../../lib/db").then((db) => {
      db.getActiveGoal(activeWorkId, "daily_words")
        .then(setGoal)
        .catch(() => {});
    });
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
    <div className="flex items-center px-4 py-1 border-t border-border bg-surface-alt text-xs text-text-secondary shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {totalChapters > 0 && (
          <span>
            第 {chapterIndex}/{totalChapters} 章
          </span>
        )}
        <span>本章 {wordCount.toLocaleString()} 字</span>
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
