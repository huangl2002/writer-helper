import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { DailyStats, YearStats } from "../../types";
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
  const works = useAppStore((s) => s.works);
  const chapters = useAppStore((s) => s.chapters);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterWorkId, setFilterWorkId] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<DailyStats[]>([]);
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setLoading(true);
    db.getYearStats(year)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    db.getRecentStats(30).then(setTrendData).catch(console.error);
  }, []);

  // Draw trend chart
  useEffect(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas || trendData.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Generate 30-day data (fill zeros for missing days)
    const barData: { label: string; count: number }[] = [];
    const map = new Map(trendData.map((d) => [d.date, d.word_count]));
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      barData.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, count: map.get(key) || 0 });
    }

    const maxCount = Math.max(...barData.map((d) => d.count), 1);
    const padTop = 16;
    const padBottom = 24;
    const padLeft = 8;
    const barW = (w - padLeft) / barData.length;
    const chartH = h - padTop - padBottom;

    // Grid lines
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--color-border") || "#d6d3d1";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const y = padTop + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-text-secondary") || "#78716c";
      ctx.font = "10px sans-serif";
      ctx.fillText(Math.round(maxCount * (1 - i / 3)).toLocaleString(), 2, y - 2);
    }

    // Bars
    const accent = getComputedStyle(canvas).getPropertyValue("--color-accent") || "#2563eb";
    for (let i = 0; i < barData.length; i++) {
      const barH = (barData[i].count / maxCount) * chartH;
      const x = padLeft + barW * i + 1;
      const y = padTop + chartH - barH;
      ctx.fillStyle = barData[i].count > 0 ? accent : "rgba(128,128,128,0.15)";
      ctx.fillRect(x, y, barW - 2, Math.max(barH, barData[i].count > 0 ? 2 : 0));
    }

    // Day labels (every 7 days)
    for (let i = 0; i < barData.length; i += 7) {
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-text-secondary") || "#78716c";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(barData[i].label, padLeft + barW * i + barW / 2, h - 4);
    }
  }, [trendData]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Year navigation + Work filter */}
      <div className="flex items-center justify-between shrink-0 gap-3">
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
        {works.length > 1 && (
          <select
            value={filterWorkId ?? ""}
            onChange={(e) => setFilterWorkId(e.target.value || null)}
            className="text-xs px-2 py-1 bg-surface border border-border rounded text-text-primary"
          >
            <option value="">全部作品</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>{w.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Per-work breakdown */}
      {!filterWorkId && works.length > 0 && (
        <div className="grid grid-cols-2 gap-2 shrink-0">
          {works.slice(0, 6).map((w) => {
            const wc = chapters
              .filter((c) => c.work_id === w.id)
              .reduce((s, c) => s + c.word_count, 0);
            const count = chapters.filter((c) => c.work_id === w.id).length;
            return (
              <button
                key={w.id}
                onClick={() => setFilterWorkId(w.id)}
                className="bg-surface-alt rounded-lg p-2 text-left hover:bg-accent/10 transition-colors border border-border"
              >
                <div className="text-sm font-medium text-text-primary truncate">{w.title}</div>
                <div className="text-xs text-text-secondary">{wc.toLocaleString()} 字 · {count} 章</div>
              </button>
            );
          })}
        </div>
      )}
      {filterWorkId && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-text-primary">
            {works.find((w) => w.id === filterWorkId)?.title || "未知作品"}
          </span>
          <button
            onClick={() => setFilterWorkId(null)}
            className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface text-text-secondary"
          >
            显示全部
          </button>
        </div>
      )}

      {/* Trend chart */}
      {trendData.length > 0 && (
        <div className="shrink-0">
          <h3 className="text-xs font-semibold text-text-secondary mb-1">近 30 天趋势</h3>
          <canvas
            ref={trendCanvasRef}
            className="w-full h-24 bg-surface-alt rounded-lg"
          />
        </div>
      )}

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
