import { useAppStore } from "../../stores/appStore";
import { formatTime } from "../../lib/utils";
import { useState, useEffect } from "react";

interface Props {
  wordCount: number;
  isSaving: boolean;
}

export function StatusBar({ wordCount, isSaving }: Props) {
  const todayStats = useAppStore((s) => s.todayStats);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-surface-alt text-xs text-text-secondary">
      <div className="flex items-center gap-4">
        <span>当前章节: {wordCount.toLocaleString()} 字</span>
        <span>今日: {todayStats.total_words.toLocaleString()} 字</span>
      </div>
      <div className="flex items-center gap-4">
        <span>{isSaving ? "保存中..." : "已保存"}</span>
        <span>{formatTime(now)}</span>
      </div>
    </div>
  );
}
