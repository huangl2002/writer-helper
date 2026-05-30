import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import * as db from "../../lib/db";

export type Page =
  | "home"
  | "writing"
  | "stats"
  | "characters"
  | "outline"
  | "notes"
  | "goals"
  | "import"
  | "history"
  | "ai"
  | "ai_settings";

const FEATURES: {
  key: Page;
  title: string;
  desc: string;
  icon: string;
  color: string;
  available: boolean;
}[] = [
  {
    key: "writing",
    title: "码字台",
    desc: "进入写作编辑器，管理章节与卷结构",
    icon: "✍",
    color: "from-blue-500 to-blue-600",
    available: true,
  },
  {
    key: "stats",
    title: "数据统计",
    desc: "查看码字热力图、趋势图表和写作报告",
    icon: "📊",
    color: "from-green-500 to-green-600",
    available: true,
  },
  {
    key: "characters",
    title: "角色管理",
    desc: "创建角色卡片、设定关系和自定义属性",
    icon: "👤",
    color: "from-purple-500 to-purple-600",
    available: true,
  },
  {
    key: "outline",
    title: "大纲规划",
    desc: "构建故事大纲树，关联已写章节",
    icon: "🗺",
    color: "from-orange-500 to-orange-600",
    available: true,
  },
  {
    key: "notes",
    title: "灵感笔记",
    desc: "随手记录灵感，便签墙分类管理",
    icon: "📝",
    color: "from-yellow-500 to-yellow-600",
    available: true,
  },
  {
    key: "goals",
    title: "写作目标",
    desc: "设定每日目标，番茄钟专注写作",
    icon: "🎯",
    color: "from-red-500 to-red-600",
    available: true,
  },
  {
    key: "ai",
    title: "AI 助手",
    desc: "续写、润色、扩写、自由对话讨论剧情",
    icon: "🤖",
    color: "from-indigo-500 to-indigo-600",
    available: true,
  },
  {
    key: "ai_settings",
    title: "AI 配置",
    desc: "设置 API 地址和密钥，支持多模型切换",
    icon: "⚙",
    color: "from-gray-500 to-gray-600",
    available: true,
  },
  {
    key: "history",
    title: "历史版本",
    desc: "查看章节快照，恢复历史版本",
    icon: "🕐",
    color: "from-teal-500 to-teal-600",
    available: true,
  },
  {
    key: "import",
    title: "导入导出",
    desc: "导出章节/全书/大纲/角色，导入外部文稿",
    icon: "📥",
    color: "from-slate-500 to-slate-600",
    available: true,
  },
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
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            AI Writer Helper
          </h1>
          <p className="text-text-secondary">你的智能写作伴侣</p>
        </div>

        {/* Quick status */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-surface-alt rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {todayStats.total_words.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary mt-1">今日码字</div>
          </div>
          <div className="bg-surface-alt rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">
              {activeWorkId ? (currentWork?.title ?? "—") : "—"}
            </div>
            <div className="text-xs text-text-secondary mt-1">当前作品</div>
          </div>
          <div className="bg-surface-alt rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">
              {totalWords.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary mt-1">累计码字</div>
          </div>
        </div>

        {/* Continue writing CTA */}
        {activeWorkId && (
          <div className="mb-6">
            <button
              onClick={() => onNavigate("writing")}
              className="w-full py-3 bg-accent text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-sm"
            >
              ✍ 继续写作
            </button>
            {/* Recent chapters quick access */}
            {(() => {
              const workChapters = chapters.filter((c) => c.work_id === activeWorkId)
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                .slice(0, 3);
              if (workChapters.length === 0) return null;
              return (
                <div className="flex gap-2 mt-2">
                  {workChapters.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        useAppStore.getState().setActiveChapter(ch.id);
                        onNavigate("writing");
                      }}
                      className="flex-1 text-xs px-3 py-2 bg-surface-alt border border-border rounded-lg hover:bg-accent/5 text-left truncate"
                    >
                      <span className="text-text-secondary">最近：</span>
                      <span className="text-text-primary">{ch.title}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <button
              key={f.key}
              disabled={!f.available}
              onClick={() => f.available && onNavigate(f.key)}
              className={`relative overflow-hidden rounded-xl p-5 text-left transition-all ${
                f.available
                  ? "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 bg-surface-alt border border-border"
                  : "bg-surface-alt/50 border border-border/50 cursor-not-allowed opacity-50"
              }`}
            >
              {!f.available && (
                <span className="absolute top-2 right-2 text-xs bg-surface px-1.5 py-0.5 rounded text-text-secondary">
                  即将上线
                </span>
              )}
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-text-primary mb-1">{f.title}</h3>
              <p className="text-xs text-text-secondary">{f.desc}</p>
            </button>
          ))}
        </div>

        <div className="text-center mt-8 text-xs text-text-secondary">
          AI Writer Helper v0.1 · 本地数据安全存储
        </div>
      </div>
    </div>
  );
}
