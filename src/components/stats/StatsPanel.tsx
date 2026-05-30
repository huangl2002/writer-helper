import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { DailyStats, YearStats } from "../../types";
import * as db from "../../lib/db";

const MONTH_LABELS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

/* ─── Animated Number Hook ─── */
function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const start = performance.now();
    const from = display;
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return display;
}

/* ─── Color helpers ─── */
function heatColor(count: number): string {
  if (count === 0) return "";
  if (count < 500)  return "#bbf7d0";
  if (count < 2000) return "#4ade80";
  if (count < 5000) return "#16a34a";
  return "#166534";
}

function heatOpacity(count: number): number {
  if (count === 0) return 0.08;
  if (count < 500) return 0.25;
  if (count < 2000) return 0.5;
  if (count < 5000) return 0.75;
  return 1;
}

/* ─── Sub-components ─── */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">{children}</h3>;
}

/* ══════════════════════════════════════════════════ */

export function StatsPanel() {
  const works = useAppStore((s) => s.works);
  const chapters = useAppStore((s) => s.chapters);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterWorkId, setFilterWorkId] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<DailyStats[]>([]);
  const [selectedDay, setSelectedDay] = useState<{date:string;count:number}|null>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement>(null);

  const totalWords = useAnimatedNumber(stats ? Number(stats.total_words) : 0);
  const writingDays = useAnimatedNumber(stats?.total_days ?? 0);
  const bestStreak = useAnimatedNumber(stats?.best_streak ?? 0);
  const trendTotal = trendData.reduce((s,d)=>s+d.word_count,0);

  useEffect(() => {
    setLoading(true);
    db.getYearStats(year).then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    db.getRecentStats(30).then(setTrendData).catch(console.error);
  }, []);

  // ── Draw trend chart ──
  useEffect(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const barData: {label:string;count:number;date:string}[] = [];
    const map = new Map(trendData.map(d=>[d.date,d.word_count]));
    for (let i=29;i>=0;i--) {
      const d=new Date(); d.setDate(d.getDate()-i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      barData.push({label:`${d.getMonth()+1}/${d.getDate()}`,count:map.get(key)||0,date:key});
    }

    const maxCount = Math.max(...barData.map(d=>d.count),1);
    const pad = {top:20,bottom:28,left:4,right:4};
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = chartW / barData.length;
    const barGap = Math.max(1, barW * 0.3);
    const barInnerW = barW - barGap;

    // Grid
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--color-border-light")||"#e5e2dd";
    ctx.lineWidth = 0.5;
    for (let i=0;i<=3;i++) {
      const y = pad.top + (chartH/3)*i;
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(w-pad.right,y); ctx.stroke();
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-text-muted")||"#9c9792";
      ctx.font = "10px system-ui"; ctx.textAlign = "left";
      ctx.fillText(Math.round(maxCount*(1-i/3)).toLocaleString(), pad.left+2, y-3);
    }

    // Gradient for positive bars
    const accent = getComputedStyle(canvas).getPropertyValue("--color-accent")||"#4f46e5";

    for (let i=0;i<barData.length;i++) {
      const barH = (barData[i].count/maxCount)*chartH;
      const x = pad.left + barW*i + barGap/2;
      const y = pad.top + chartH - barH;

      if (barData[i].count > 0) {
        const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, accent+"88");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-border")||"#e5e2dd";
      }
      // Rounded top
      const r = Math.min(3, barInnerW/2);
      ctx.beginPath();
      ctx.moveTo(x, pad.top + chartH);
      ctx.lineTo(x, y+r);
      ctx.quadraticCurveTo(x, y, x+r, y);
      ctx.lineTo(x+barInnerW-r, y);
      ctx.quadraticCurveTo(x+barInnerW, y, x+barInnerW, y+r);
      ctx.lineTo(x+barInnerW, pad.top + chartH);
      ctx.closePath();
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-text-muted")||"#9c9792";
    ctx.font = "9px system-ui"; ctx.textAlign = "center";
    for (let i=0;i<barData.length;i+=5) {
      ctx.fillText(barData[i].label, pad.left+barW*i+barW/2, h-6);
    }

    // Highlight today
    const todayIdx = barData.findIndex(d=>d.date===new Date().toISOString().slice(0,10));
    if (todayIdx>=0) {
      const x = pad.left+barW*todayIdx+barGap/2;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x-1, pad.top-1, barInnerW+2, chartH+2);
    }

    // Canvas click handler for tooltip
    canvas.onmousemove = (e) => {
      const rect2 = canvas.getBoundingClientRect();
      const mx = e.clientX - rect2.left;
      const idx = Math.floor((mx - pad.left) / barW);
      if (idx>=0 && idx<barData.length && barData[idx].count>0) {
        setSelectedDay({date:barData[idx].date,count:barData[idx].count});
      } else {
        setSelectedDay(null);
      }
    };
    canvas.onmouseleave = () => setSelectedDay(null);
  }, [trendData]);

  // ── Render ──
  return (
    <div className="flex flex-col h-full overflow-y-auto smooth-scroll p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-text-primary">数据统计</h2>
          <p className="text-xs text-text-muted mt-0.5">追踪你的写作足迹</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setYear(y=>y-1)} className="w-8 h-8 rounded-lg border border-border hover:bg-surface-hover flex items-center justify-center text-text-primary transition-colors">
            ←
          </button>
          <span className="text-lg font-bold text-text-primary w-16 text-center tabular-nums">{year}</span>
          <button onClick={()=>setYear(y=>y+1)} className="w-8 h-8 rounded-lg border border-border hover:bg-surface-hover flex items-center justify-center text-text-primary transition-colors">
            →
          </button>
          {works.length>1 && (
            <select value={filterWorkId??""} onChange={e=>setFilterWorkId(e.target.value||null)}
              className="ml-3 text-xs px-3 py-1.5 bg-surface border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none">
              <option value="">全部作品</option>
              {works.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Work filter pills */}
      {!filterWorkId && works.length>0 && (
        <div className="flex flex-wrap gap-2 shrink-0 animate-slide-left">
          {works.slice(0,6).map((w,i)=>{
            const wc=chapters.filter(c=>c.work_id===w.id).reduce((s,c)=>s+c.word_count,0);
            const cnt=chapters.filter(c=>c.work_id===w.id).length;
            return (
              <button key={w.id} onClick={()=>setFilterWorkId(w.id)}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface-alt hover:bg-surface-hover hover:border-accent/30 hover:-translate-y-0.5 transition-all duration-200 text-left"
                style={{animationDelay:`${i*0.05}s`}}>
                <div className="text-sm font-medium text-text-primary">{w.title}</div>
                <div className="text-xs text-text-muted">{wc.toLocaleString()}字 · {cnt}章</div>
              </button>
            );
          })}
        </div>
      )}
      {filterWorkId && (
        <div className="flex items-center gap-2 shrink-0 animate-fade-in">
          <span className="px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-sm font-medium">
            {works.find(w=>w.id===filterWorkId)?.title||"未知"}
          </span>
          <button onClick={()=>setFilterWorkId(null)} className="text-xs px-2 py-1 border border-border rounded-lg hover:bg-surface text-text-muted">✕ 显示全部</button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 shrink-0 animate-stagger">
        {[
          {label:"年度总字数",value:totalWords,icon:"📚",gradient:"from-indigo-500 to-blue-500"},
          {label:"写作天数",value:writingDays,icon:"📅",gradient:"from-emerald-500 to-teal-500"},
          {label:"最长连续",value:bestStreak,icon:"🔥",gradient:"from-amber-500 to-orange-500"},
          {label:"近30天",value:trendTotal,icon:"📈",gradient:"from-violet-500 to-purple-500"},
        ].map((card,i)=>(
          <div key={i}
            className="relative overflow-hidden rounded-2xl p-5 text-white hover-lift cursor-default"
            style={{
              background:`linear-gradient(135deg,var(--color-accent-soft),var(--color-surface-alt))`,
              border:"1px solid var(--color-border-light)",
            }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-extrabold text-text-primary tabular-nums tracking-tight">
              {card.value.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="shrink-0 animate-fade-in-up" style={{animationDelay:"0.2s"}}>
        <SectionHeader>
          📈 近 30 天码字趋势
          {selectedDay && (
            <span className="text-xs font-normal text-text-muted ml-auto">
              {selectedDay.date} — {selectedDay.count.toLocaleString()} 字
            </span>
          )}
        </SectionHeader>
        {trendData.length>0 ? (
          <div className="bg-surface-alt rounded-2xl p-4 border border-border relative" style={{borderRadius:"var(--radius-lg)"}}>
            <canvas ref={trendCanvasRef} className="w-full h-28" />
            <div className="flex items-center justify-center gap-5 mt-2 text-xs text-text-muted">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{background:"var(--color-accent)"}}/> 码字日</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{background:"var(--color-border)"}}/> 休息日</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border" style={{borderColor:"var(--color-accent)",borderWidth:1.5}}/> 今天</span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-alt rounded-2xl p-8 text-center text-sm text-text-muted border border-border">
            📝 开始写作后，这里会显示 30 天趋势图
          </div>
        )}
      </div>

      {/* Calendar heatmap */}
      <div className="shrink-0 animate-fade-in-up" style={{animationDelay:"0.3s"}}>
        <SectionHeader>📅 {year} 年写作热力图</SectionHeader>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : stats ? (
          <div className="bg-surface-alt rounded-2xl p-5 border border-border" style={{borderRadius:"var(--radius-lg)"}}>
            {/* Legend */}
            <div className="flex items-center gap-1.5 mb-4 text-xs text-text-muted">
              <span>少</span>
              {[0.08,0.25,0.5,0.75,1].map((op,i)=>
                <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{background:"#16a34a",opacity:op}}/>
              )}
              <span>多</span>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-4 gap-x-6 gap-y-5">
              {stats.months.map((m,mIdx)=>{
                const firstDate = new Date(year,m.month-1,1);
                const startDow = (firstDate.getDay()+6)%7;
                const cells:(number|null)[] = [];
                for (let i=0;i<startDow;i++) cells.push(null);
                for (const d of m.days) cells.push(d.word_count);

                // Calculate month total
                const monthTotal = m.days.reduce((s,d)=>s+d.word_count,0);

                return (
                  <div key={m.month} className="animate-fade-in-up" style={{animationDelay:`${0.1+mIdx*0.03}s`}}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-text-primary">{MONTH_LABELS[m.month-1]}</span>
                      <span className="text-[10px] text-text-muted">{monthTotal.toLocaleString()}</span>
                    </div>
                    <div className="grid gap-[2px]" style={{gridTemplateColumns:"repeat(7,1fr)"}}>
                      {/* Day headers */}
                      {["一","","三","","五","","日"].map((d,i)=>
                        <div key={"h"+i} className="text-[8px] text-text-muted text-center leading-none mb-0.5">{d}</div>
                      )}
                      {cells.map((wc,i)=>{
                        const day = i-startDow+1;
                        return (
                          <div key={i}
                            title={wc!==null?`${year}/${m.month}/${day}: ${wc.toLocaleString()} 字`:""}
                            className="aspect-square rounded-[2px] transition-transform hover:scale-125 hover:z-10"
                            style={{
                              background: wc!==null?heatColor(wc):"transparent",
                              opacity: wc!==null?heatOpacity(wc):0,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-surface-alt rounded-2xl p-8 text-center text-sm text-text-muted border border-border">
            ✍️ 开始写作后，这里会显示年度热力图
          </div>
        )}
      </div>

      {/* Footer spacing */}
      <div className="h-4" />
    </div>
  );
}
