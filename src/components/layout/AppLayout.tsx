import { useAppStore } from "../../stores/appStore";
import { Sidebar } from "./Sidebar";
import { HelperPanel } from "./HelperPanel";
import { WritingEditor } from "../editor/WritingEditor";

export function AppLayout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const helperPanelOpen = useAppStore((s) => s.helperPanelOpen);
  const layoutMode = useAppStore((s) => s.layoutMode);

  if (layoutMode === "focus") {
    return <WritingEditor />;
  }

  return (
    <div className="flex h-full w-full">
      {sidebarOpen && (
        <aside className="w-64 min-w-[200px] border-r border-border bg-surface-alt">
          <Sidebar />
        </aside>
      )}
      <main className="flex-1 min-w-0">
        <WritingEditor />
      </main>
      {helperPanelOpen && (
        <aside className="w-72 min-w-[200px] border-l border-border bg-surface-alt">
          <HelperPanel />
        </aside>
      )}
    </div>
  );
}
