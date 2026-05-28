import { useAppStore } from "../../stores/appStore";
import { OutlineTree } from "./OutlineTree";

export function OutlineWithChapters() {
  const chapters = useAppStore((s) => s.chapters);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);

  return (
    <div className="flex h-full">
      <div className="w-80 min-w-[240px] border-r border-border bg-surface-alt overflow-y-auto p-2">
        <OutlineTree />
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-3 text-text-primary">章节关联</h2>
        <p className="text-sm text-text-secondary mb-4">
          在大纲中点击节点查看详情。可关联已有章节到大纲节点。
        </p>
        <h3 className="text-sm font-medium text-text-primary mb-2">全部章节</h3>
        <div className="space-y-1">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChapter(ch.id)}
              className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-surface-alt text-text-primary"
            >
              📄 {ch.title}
              <span className="text-xs text-text-secondary ml-2">{ch.word_count}字</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
