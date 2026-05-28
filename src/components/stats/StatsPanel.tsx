import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { DailyStats } from "../../types";
import * as db from "../../lib/db";

/* ─── Simple writing calendar heatmap ─── */

function HeatmapCell({ date, count, max }: { date: string; count: number; max: number }) {
  const intensity = max > 0 ? count / max : 0;
  const bg =
    count === 0
      ? "bg-surface-alt"
      : intensity < 0.25
        ? "bg-green-100"
        : intensity < 0.5
          ? "bg-green-200"
          : intensity < 0.75
            ? "bg-green-400"
            : "bg-green-600";

  return (
    <div
      className={`w-4 h-4 rounded-sm ${bg} hover:ring-1 hover:ring-accent transition-all`}
      title={`${date}: ${count.toLocaleString()} 字`}
    />
  );
}

function SimpleBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-1">
      <span className="w-8 text-right text-xs text-text-secondary shrink-0">
        {label}
      </span>
      <div className="flex-1 h-4 bg-surface-alt rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-text-secondary w-12 shrink-0">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

/* ─── Main component ─── */

export function StatsPanel() {
  const todayStats = useAppStore((s) => s.todayStats);
  const setTodayStats = useAppStore((s) => s.setTodayStats);

  const [weekDays, setWeekDays] = useState<DailyStats[]>([]);
  const [monthDays, setMonthDays] = useState<DailyStats[]>([]);
  const [allTime, setAllTime] = useState({ total_words: 0, total_chapters: 0, total_sessions: 0 });
  const [view, setView] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    db.getTodayWordCount().then(setTodayStats).catch(console.error);
    db.getWeekStats()
      .then((r) => setWeekDays(r.days || []))
      .catch(console.error);
    db.getMonthStats()
      .then((r) => setMonthDays(r.days || []))
      .catch(console.error);
    db.getAllTimeStats()
      .then(setAllTime)
      .catch(console.error);
  }, []);

  const fillDaysForWeek = (): { date: string; word_count: number }[] => {
    const days: { date: string; word_count: number }[] = [];
    const map = new Map(weekDays.map((d) => [d.date, d.word_count]));
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, word_count: map.get(key) ?? 0 });
    }
    return days;
  };

  const fillDaysForMonth = (): { date: string; word_count: number }[] => {
    const map = new Map(monthDays.map((d) => [d.date, d.word_count]));
    const today = new Date();
    const days: { date: string; word_count: number }[] = [];
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    while (start <= today) {
      const key = start.toISOString().slice(0, 10);
      days.push({ date: key, word_count: map.get(key) ?? 0 });
      start.setDate(start.getDate() + 1);
    }
    return days;
  };

  const weekFilled = fillDaysForWeek();
  const monthFilled = fillDaysForMonth();

  const currentData = view === "week" ? weekFilled : monthFilled;
  const currentMax = Math.max(...currentData.map((d) => d.word_count), 1);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
        码字统计
      </h2>

      {/* Today */}
      <div className="bg-surface-alt rounded-lg p-3 text-center">
        <div className="text-xs text-text-secondary mb-1">今日码字</div>
        <div className="text-3xl font-bold text-accent">
          {todayStats.total_words.toLocaleString()}
        </div>
        <div className="text-xs text-text-secondary">
          写作 {todayStats.session_count} 次
        </div>
      </div>

      {/* View selector */}
      <div className="flex border border-border rounded overflow-hidden">
        {(["week", "month", "all"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 text-xs py-1 ${
              view === v
                ? "bg-accent text-white"
                : "hover:bg-surface-alt text-text-primary"
            }`}
          >
            {v === "week" ? "近7天" : v === "month" ? "本月" : "总计"}
          </button>
        ))}
      </div>

      {/* Heatmap / Chart */}
      {view === "all" ? (
        <div className="bg-surface-alt rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xl font-bold text-accent">
                {allTime.total_words.toLocaleString()}
              </div>
              <div className="text-xs text-text-secondary">总字数</div>
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">
                {allTime.total_chapters}
              </div>
              <div className="text-xs text-text-secondary">章节</div>
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">
                {allTime.total_sessions}
              </div>
              <div className="text-xs text-text-secondary">写作次数</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <div className="bg-surface-alt rounded-lg p-3">
            <div className="flex flex-wrap gap-1 mb-2">
              {currentData.map((d) => (
                <HeatmapCell
                  key={d.date}
                  date={d.date}
                  count={d.word_count}
                  max={currentMax}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                共 {currentData.reduce((s, d) => s + d.word_count, 0).toLocaleString()} 字
              </span>
              <span>浅→深</span>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-surface-alt rounded-lg p-3 space-y-1">
            {currentData.map((d) => {
              const label = d.date.slice(5); // MM-DD
              return (
                <SimpleBar
                  key={d.date}
                  value={d.word_count}
                  max={currentMax}
                  label={label}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
