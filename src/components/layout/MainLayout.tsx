import { useCallback, useRef, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { HomePage, type Page } from "./HomePage";
import { Sidebar } from "./Sidebar";
import { HelperPanel } from "./HelperPanel";
import { WritingEditor } from "../editor/WritingEditor";
import { StatsPanel } from "../stats/StatsPanel";
import { CharacterList } from "../characters/CharacterList";
import { OutlineWithChapters } from "../outline/OutlineWithChapters";
import { NotesList } from "../notes/NotesList";
import { GoalsPomodoro } from "../goals/GoalsPomodoro";
import { ImportExport } from "../import/ImportExport";
import { SnapshotPanel } from "../snapshots/SnapshotPanel";
import { AiChat } from "../ai/AiChat";
import { AiSettings } from "../ai/AiSettings";

const PAGE_TITLES: Record<Page, string> = {
  home: "首页",
  writing: "码字台",
  stats: "数据统计",
  characters: "角色管理",
  outline: "大纲规划",
  notes: "灵感笔记",
  goals: "写作目标",
  import: "导入导出",
  history: "历史版本",
  ai: "AI 助手",
  ai_settings: "AI 配置",
};

const SIDEBAR_WIDTH = 260;
const HELPER_WIDTH = 280;

export function MainLayout() {
  const [page, setPage] = useState<Page>("home");
  const layoutMode = useAppStore((s) => s.layoutMode);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const helperPanelOpen = useAppStore((s) => s.helperPanelOpen);

  if (page === "home") {
    return <HomePage onNavigate={setPage} />;
  }

  // Writing desk with 3-panel layout
  if (page === "writing") {
    if (layoutMode === "focus") {
      return (
        <div className="flex flex-col h-full w-full">
          <PageHeader title="码字台" onBack={() => setPage("home")} />
          <WritingEditor />
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full w-full">
        <PageHeader title="码字台" onBack={() => setPage("home")} />
        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <div
            className="h-full shrink-0 overflow-hidden bg-surface-alt transition-[width] duration-200"
            style={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0, borderRight: sidebarOpen ? "1px solid var(--color-border)" : "none" }}
          >
            <div style={{ width: SIDEBAR_WIDTH }} className="h-full">
              <Sidebar />
            </div>
          </div>

{/* Drag handle — sidebar */}
          {sidebarOpen && <DragHandle />}

          {/* Editor */}
          <main className="flex-1 min-w-0 h-full overflow-hidden">
            <WritingEditor />
          </main>

{/* Drag handle — helper */}
          {helperPanelOpen && <DragHandle />}

          {/* Helper panel */}
          <div
            className="h-full shrink-0 overflow-hidden bg-surface-alt transition-[width] duration-200"
            style={{ width: helperPanelOpen ? HELPER_WIDTH : 0, borderLeft: helperPanelOpen ? "1px solid var(--color-border)" : "none" }}
          >
            <div style={{ width: HELPER_WIDTH }} className="h-full">
              <HelperPanel />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full-page views for other features
  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader
        title={PAGE_TITLES[page]}
        onBack={() => setPage("home")}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {page === "stats" && <StatsPanel />}
        {page === "characters" && <CharacterList />}
        {page === "outline" && <OutlineWithChapters />}
        {page === "notes" && <NotesList />}
        {page === "goals" && <GoalsPomodoro />}
        {page === "import" && <ImportExport />}
        {page === "history" && <SnapshotPanel />}
        {page === "ai" && <AiChat onNavigate={setPage} />}
        {page === "ai_settings" && <AiSettings />}
      </div>
    </div>
  );
}

/* ─── Page header with back button ─── */

function DragHandle() {
  const handleRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const handle = handleRef.current;
    if (!handle) return;
    const prev = handle.previousElementSibling as HTMLElement;
    const next = handle.nextElementSibling as HTMLElement;
    if (!prev || !next) return;
    const startX = e.clientX;
    const prevStartW = prev.offsetWidth;
    const nextStartW = next.offsetWidth;
    const totalW = prevStartW + nextStartW;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const newPrevW = Math.max(60, prevStartW + dx);
      const newNextW = totalW - newPrevW;
      if (newNextW < 60) return;
      prev.style.width = `${newPrevW}px`;
      next.style.width = `${newNextW}px`;
      prev.style.transition = "none";
      next.style.transition = "none";
    };
    const onUp = () => {
      prev.style.transition = "";
      next.style.transition = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div
      ref={handleRef}
      onMouseDown={onMouseDown}
      className="w-[5px] shrink-0 bg-border hover:bg-accent cursor-col-resize transition-colors"
    />
  );
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex items-center gap-2 shrink-0 px-3 py-1.5 border-b border-border bg-surface-alt">
      <button
        onClick={onBack}
        className="text-sm px-2 py-0.5 border border-border rounded hover:bg-surface text-text-primary transition-colors"
      >
        ← 首页
      </button>
      <span className="text-sm font-semibold text-text-primary">{title}</span>
      <div className="flex-1" />
      <span className="text-xs text-text-secondary">AI Writer Helper v0.1</span>
    </header>
  );
}


