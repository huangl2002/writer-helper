import { useEffect, useState } from "react";
import type { YearStats } from "../../types";
import * as db from "../../lib/db";

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

function wordColor(count: number): string {
  if (count === 0) return "bg-surface-alt";
  if (count < 500) return "bg-green-200";
  if (count < 2000) return "bg-green-400";
  if (count < 5000) return "bg-green-500";
  return "bg-green-700";
}

export function StatsPanel() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    db.getYearStats(year)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Year navigation */}
      <div className="flex items-center justify-between shrink-0">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="px-2 py-1 border border-border rounded hover:bg-surface-alt text-text-primary text-sm"
        >
          ←
        </button>
        <h2 className="text-lg font-bold text-text-primary">{year} 年</h2>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="px-2 py-1 border border-border rounded hover:bg-surface-alt text-text-primary text-sm"
        >
          →
        </button>
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-surface-alt rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-accent">
              {stats.total_words.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary">年度总字数</div>
          </div>
          <div className="bg-surface-alt rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-text-primary">
              {stats.total_days}
            </div>
            <div className="text-xs text-text-secondary">写作天数</div>
          </div>
          <div className="bg-surface-alt rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-text-primary">
              {stats.best_streak}
            </div>
            <div className="text-xs text-text-secondary">最长连续天数</div>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          加载中...
        </div>
      ) : stats ? (
        <>
          <div className="flex items-center gap-1 mb-1 shrink-0">
            <span className="text-xs text-text-secondary mr-1">色阶:</span>
            <div className="w-3 h-3 rounded-sm bg-surface-alt" title="0" />
            <div className="w-3 h-3 rounded-sm bg-green-200" title="1-499" />
            <div className="w-3 h-3 rounded-sm bg-green-400" title="500-1999" />
            <div className="w-3 h-3 rounded-sm bg-green-500" title="2000-4999" />
            <div className="w-3 h-3 rounded-sm bg-green-700" title="5000+" />
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 flex-1">
            {stats.months.map((m) => {
              const firstDate = new Date(year, m.month - 1, 1);
              const startDow = (firstDate.getDay() + 6) % 7; // Mon=0, Sun=6
              const cells: (number | null)[] = [];
              for (let i = 0; i < startDow; i++) cells.push(null);
              for (const d of m.days) cells.push(d.word_count);

              return (
                <div key={m.month}>
                  <div className="text-xs font-semibold text-text-primary mb-1">
                    {MONTH_LABELS[m.month - 1]}
                  </div>
                  <div
                    className="grid gap-[1px]"
                    style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
                  >
                    {cells.map((wc, i) => {
                      const day = i - startDow + 1;
                      const dateStr = day > 0
                        ? `${m.month}/${day}`
                        : "";
                      return (
                        <div
                          key={i}
                          title={
                            wc !== null
                              ? `${year}/${dateStr}: ${wc.toLocaleString()} 字`
                              : ""
                          }
                          className={`aspect-square rounded-sm ${
                            wc !== null ? wordColor(wc) : "bg-transparent"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          暂无数据，开始写作后会在这里显示热力图
        </div>
      )}
    </div>
  );
}
