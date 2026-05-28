import { useEffect, useRef, useState } from "react";
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
import { Panel, type PanelImperativeHandle, Group, Separator } from "react-resizable-panels";

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

export function MainLayout() {
  const [page, setPage] = useState<Page>("home");
  const layoutMode = useAppStore((s) => s.layoutMode);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const helperPanelOpen = useAppStore((s) => s.helperPanelOpen);
  const sidebarRef = useRef<PanelImperativeHandle>(null);
  const helperRef = useRef<PanelImperativeHandle>(null);
  const mountedRef = useRef(false);

  // Sync store state → panel size (skip initial mount to respect defaultSize)
  useEffect(() => {
    if (!mountedRef.current) return;
    sidebarRef.current?.resize(sidebarOpen ? 18 : 0);
  }, [sidebarOpen]);

  useEffect(() => {
    if (!mountedRef.current) return;
    helperRef.current?.resize(helperPanelOpen ? 22 : 0);
  }, [helperPanelOpen]);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

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
        <Group orientation="horizontal" className="flex-1 min-h-0">
          <Panel
            id="sidebar"
            panelRef={sidebarRef}
            defaultSize={sidebarOpen ? 18 : 0}
            minSize={0}
            maxSize={35}
          >
            <aside className="h-full border-r border-border bg-surface-alt overflow-hidden">
              <Sidebar />
            </aside>
          </Panel>
          <Separator id="sep-left" className="w-[3px] bg-border hover:bg-accent transition-colors cursor-col-resize" />
          <Panel id="editor" minSize={30}>
            <main className="h-full overflow-hidden">
              <WritingEditor />
            </main>
          </Panel>
          <Separator id="sep-right" className="w-[3px] bg-border hover:bg-accent transition-colors cursor-col-resize" />
          <Panel
            id="helper"
            panelRef={helperRef}
            defaultSize={helperPanelOpen ? 22 : 0}
            minSize={0}
            maxSize={40}
          >
            <aside className="h-full border-l border-border bg-surface-alt overflow-hidden">
              <HelperPanel />
            </aside>
          </Panel>
        </Group>
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


