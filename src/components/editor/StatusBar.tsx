import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { formatTime } from "../../lib/utils";
import type { Goal } from "../../types";

interface Props {
  wordCount: number;
  isSaving: boolean;
}

export function StatusBar({ wordCount, isSaving }: Props) {
  const todayStats = useAppStore((s) => s.todayStats);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const [now, setNow] = useState(new Date());
  const [sessionStart] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
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
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const goalRemaining = goal ? goal.target_value - todayStats.total_words : 0;

  return (
    <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-surface-alt text-xs text-text-secondary">
      <div className="flex items-center gap-4">
        <span>本章: {wordCount.toLocaleString()} 字</span>
        <span>今日: {todayStats.total_words.toLocaleString()} 字</span>
        {goal && (
          <span className={goalRemaining <= 0 ? "text-green-500" : ""}>
            {goalRemaining <= 0 ? "✓ 已达标" : `距目标 ${goalRemaining.toLocaleString()} 字`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>⏱ {formatElapsed(elapsed)}</span>
        <span>{isSaving ? "保存中..." : "已保存"}</span>
        <span>{formatTime(now)}</span>
      </div>
    </div>
  );
}
