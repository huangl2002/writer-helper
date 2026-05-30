import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import * as db from "../../lib/db";

export type Page =
  | "home" | "writing" | "stats" | "characters" | "outline"
  | "notes" | "goals" | "import" | "history" | "ai" | "ai_settings";

const FEATURES: { key: Page; title: string; desc: string; icon: string; bg: string; available: boolean }[] = [
  { key: "writing", title: "码字台", desc: "沉浸式写作编辑器，章节管理", icon: "✍", bg: "from-indigo-400 to-blue-500", available: true },
  { key: "stats", title: "数据统计", desc: "码字热力图、趋势图表、写作报告", icon: "📊", bg: "from-emerald-400 to-teal-500", available: true },
  { key: "characters", title: "角色管理", desc: "角色卡片、关系图谱、头像设定", icon: "👤", bg: "from-purple-400 to-pink-500", available: true },
  { key: "outline", title: "大纲规划", desc: "无限层级大纲树，关联章节", icon: "🗺", bg: "from-amber-400 to-orange-500", available: true },
  { key: "notes", title: "灵感笔记", desc: "便签墙、标签分类、全文搜索", icon: "📝", bg: "from-yellow-400 to-amber-500", available: true },
  { key: "goals", title: "写作目标", desc: "每日目标追踪，番茄钟专注", icon: "🎯", bg: "from-rose-400 to-red-500", available: true },
  { key: "ai", title: "AI 助手", desc: "续写、润色、扩写、自由对话", icon: "🤖", bg: "from-violet-400 to-purple-500", available: true },
  { key: "ai_settings", title: "AI 配置", desc: "多模型切换，API 密钥管理", icon: "⚙", bg: "from-slate-400 to-gray-500", available: true },
  { key: "history", title: "历史版本", desc: "版本对比、快照恢复", icon: "🕐", bg: "from-cyan-400 to-teal-500", available: true },
  { key: "import", title: "导入导出", desc: "多格式导入导出，数据自由", icon: "📥", bg: "from-blue-400 to-cyan-500", available: true },
];

interface Props {
  onNavigate: (page: Page) => void;
}

export function HomePage({ onNavigate }: Props) {
  const todayStats = useAppStore((s) => s.todayStats);
  const setTodayStats = useAppStore((s) => s.setTodayStats);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const works = useAppStore((s) => s.works);
  const chapters = useAppStore((s) => s.chapters);

  useEffect(() => {
    db.getTodayWordCount().then(setTodayStats).catch(console.error);
  }, []);

  const currentWork = works.find((w) => w.id === activeWorkId);
  const totalWords = chapters.reduce((s, c) => s + c.word_count, 0);

  return (
    <div className="h-full overflow-y-auto smooth-scroll" style={{ background: "var(--color-surface)" }}>
      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-soft border border-accent-light text-xs font-medium text-accent mb-4">
            <span className="w-2 h-2 rounded-full bg-accent pulse-ring" />
            本地安全 · 离线可用
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            <span className="gradient-text">AI Writer Helper</span>
          </h1>
          <p className="text-text-secondary text-lg">你的智能写作伴侣，让创作更流畅</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-10 animate-stagger">
          <div className="group bg-surface-alt border border-border rounded-2xl p-5 text-center hover-lift cursor-default" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">今日码字</div>
            <div className="text-3xl font-extrabold text-accent tracking-tight tabular-nums">
              {todayStats.total_words.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-1">保持节奏 ✨</div>
          </div>
          <div className="group bg-surface-alt border border-border rounded-2xl p-5 text-center hover-lift cursor-default" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">当前作品</div>
            <div className="text-3xl font-extrabold text-text-primary truncate">
              {activeWorkId ? currentWork?.title ?? "—" : "—"}
            </div>
            <div className="text-xs text-text-muted mt-1">{activeWorkId ? "继续加油 💪" : "创建第一部作品"}</div>
          </div>
          <div className="group bg-surface-alt border border-border rounded-2xl p-5 text-center hover-lift cursor-default" style={{ borderRadius: "var(--radius-lg)" }}>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-1">累计码字</div>
            <div className="text-3xl font-extrabold text-text-primary tabular-nums">
              {totalWords.toLocaleString()}
            </div>
            <div className="text-xs text-text-muted mt-1">{chapters.length} 个章节</div>
          </div>
        </div>

        {/* CTA */}
        {activeWorkId && (
          <div className="mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={() => onNavigate("writing")}
              className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 btn-pulse"
              style={{
                background: "linear-gradient(135deg, var(--color-accent), #7c3aed)",
                boxShadow: "0 4px 20px var(--color-glow)",
              }}
            >
              ✍ 继续写作
            </button>
            {/* Recent chapters */}
            {(() => {
              const recent = chapters
                .filter((c) => c.work_id === activeWorkId)
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                .slice(0, 3);
              if (recent.length === 0) return null;
              return (
                <div className="flex gap-3 mt-3">
                  {recent.map((ch, i) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        useAppStore.getState().setActiveChapter(ch.id);
                        onNavigate("writing");
                      }}
                      className="flex-1 text-left px-4 py-3 rounded-xl border border-border bg-surface-alt hover:bg-surface-hover hover:border-accent/30 transition-all duration-200 group"
                      style={{ animationDelay: `${0.3 + i * 0.05}s` }}
                    >
                      <div className="text-xs text-text-muted">最近章节</div>
                      <div className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">{ch.title}</div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-4 animate-stagger">
          {FEATURES.map((f) => (
            <button
              key={f.key}
              disabled={!f.available}
              onClick={() => f.available && onNavigate(f.key)}
              className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border ${
                f.available
                  ? "bg-surface-alt border-border hover:border-accent/30 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
                  : "bg-surface-alt/50 border-border/50 cursor-not-allowed opacity-50"
              }`}
              style={{ borderRadius: "var(--radius-lg)" }}
            >
              {/* Gradient bar on top */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${f.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
              {!f.available && (
                <span className="absolute top-3 right-3 text-xs bg-surface px-2 py-0.5 rounded-full text-text-muted">即将上线</span>
              )}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ background: `var(--color-accent-soft)` }}>
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-text-primary mb-0.5 group-hover:text-accent transition-colors">{f.title}</h3>
                  <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-alt border border-border text-xs text-text-muted">
            <span>AI Writer Helper v0.3</span>
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span>数据纯本地存储</span>
            <span className="w-1 h-1 rounded-full bg-accent" />
            <span>MIT 开源</span>
          </div>
        </div>
      </div>
    </div>
  );
}
