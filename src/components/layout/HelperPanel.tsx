import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import * as db from "../../lib/db";

export function HelperPanel() {
  const todayStats = useAppStore((s) => s.todayStats);
  const chapters = useAppStore((s) => s.chapters);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const setTodayStats = useAppStore((s) => s.setTodayStats);
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);

  useEffect(() => {
    db.getTodayWordCount().then(setTodayStats).catch(console.error);
  }, [chapters.length]);

  const totalChapters = chapters.length;
  const totalWords = chapters.reduce((sum, c) => sum + c.word_count, 0);
  const draftCount = chapters.filter((c) => c.status === "draft").length;
  const doneCount = chapters.filter((c) => c.status === "completed").length;

  const recentChapters = [...chapters]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 15);

  if (!activeWorkId) {
    return (
      <div className="flex flex-col h-full p-3 gap-2">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          概览
        </h2>
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          在「码字台」选择作品开始写作
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
        写作助手
      </h2>

      {/* Today's stats */}
      <div className="rounded-xl p-4 space-y-2 animate-fade-in" style={{ background: "linear-gradient(135deg, var(--color-accent-soft), var(--color-surface-alt))" }}>
        <h3 className="text-xs font-medium text-text-secondary">今日码字</h3>
        <div className="text-2xl font-bold text-accent">
          {todayStats.total_words.toLocaleString()}
          <span className="text-sm font-normal text-text-secondary ml-1">字</span>
        </div>
        <div className="text-xs text-text-secondary">
          写作时段 {todayStats.session_count} 次
        </div>
      </div>

      {/* All-time stats */}
      <div className="bg-surface-alt rounded-lg p-3 space-y-2">
        <h3 className="text-xs font-medium text-text-secondary">作品统计</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="font-semibold text-text-primary">{totalChapters}</div>
            <div className="text-xs text-text-secondary">章节</div>
          </div>
          <div>
            <div className="font-semibold text-text-primary">{totalWords.toLocaleString()}</div>
            <div className="text-xs text-text-secondary">总字数</div>
          </div>
          <div>
            <div className="font-semibold text-text-primary">{draftCount}</div>
            <div className="text-xs text-text-secondary">草稿</div>
          </div>
          <div>
            <div className="font-semibold text-text-primary">{doneCount}</div>
            <div className="text-xs text-text-secondary">已完成</div>
          </div>
        </div>
      </div>

      {/* Recent chapters */}
      <div className="flex-1 min-h-0">
        <h3 className="text-xs font-medium text-text-secondary mb-2">最近章节</h3>
        {recentChapters.length === 0 ? (
          <p className="text-xs text-text-secondary">暂无章节</p>
        ) : (
          <div className="space-y-0.5">
            {recentChapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`w-full text-left text-xs px-2 py-1 rounded block ${
                  activeChapterId === ch.id
                    ? "bg-accent text-white"
                    : "hover:bg-surface text-text-primary"
                }`}
              >
                <span className="truncate block">{ch.title}</span>
                <span className="opacity-70">{ch.word_count}字</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
