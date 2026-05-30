import { useMemo, useRef, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { extractPlainText } from "../../lib/utils";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface EnrichedChapter {
  id: string;
  title: string;
  workTitle: string;
  wordCount: number;
  plainText: string;
}

export function QuickSearch({ visible, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EnrichedChapter[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const chapters = useAppStore((s) => s.chapters);
  const works = useAppStore((s) => s.works);
  const setActiveWork = useAppStore((s) => s.setActiveWork);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);
  const initializedRef = useRef(false);

  // Pre-compute enriched chapter list with plain text (only when visible opens)
  const enrichedList = useMemo(() => {
    return chapters.map((ch) => {
      const work = works.find((w) => w.id === ch.work_id);
      let plainText = "";
      if (ch.content_json) {
        try { plainText = extractPlainText(ch.content_json); } catch {}
      }
      return {
        id: ch.id,
        title: ch.title,
        workTitle: work?.title || "未知作品",
        wordCount: ch.word_count,
        plainText,
      };
    });
  }, [chapters, works]);

  // Reset on open, but only once per open cycle
  if (visible && !initializedRef.current) {
    initializedRef.current = true;
    setQuery("");
    setResults(enrichedList.slice(0, 50));
    setSelectedIdx(0);
  }
  if (!visible && initializedRef.current) {
    initializedRef.current = false;
  }

  // Auto-focus on open
  const focusRef = useRef(false);
  if (visible && !focusRef.current) {
    focusRef.current = true;
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  if (!visible) {
    focusRef.current = false;
  }

  const doSearch = (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults(enrichedList.slice(0, 50));
      setSelectedIdx(0);
      return;
    }
    const lower = q.toLowerCase();
    const filtered = enrichedList
      .filter((ch) => ch.title.toLowerCase().includes(lower) || ch.plainText.toLowerCase().includes(lower))
      .slice(0, 30);
    setResults(filtered);
    setSelectedIdx(0);
  };

  const navigate = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    const work = works.find((w) => w.id === chapters.find((c) => c.id === r.id)?.work_id);
    if (work) setActiveWork(work.id);
    setActiveChapter(r.id);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); navigate(selectedIdx); }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl shadow-xl w-[520px] max-w-[90vw] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="text-sm text-text-secondary">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => doSearch(e.target.value)}
            onKeyDown={handleKey}
            placeholder="搜索章节标题或内容... (Ctrl+Shift+F)"
            className="flex-1 text-sm bg-transparent text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
          <span className="text-xs text-text-secondary">{results.length} 个结果</span>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm">✕</button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-secondary">
              {query ? "无匹配结果" : "暂无章节"}
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => navigate(i)}
                className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-surface-alt transition-colors ${
                  i === selectedIdx ? "bg-accent/10" : ""
                }`}
              >
                <span className="text-lg shrink-0">📄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{r.title}</div>
                  <div className="text-xs text-text-secondary truncate">{r.workTitle} · {r.wordCount.toLocaleString()} 字</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
