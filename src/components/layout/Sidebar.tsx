import { WorkTree } from "../works/WorkTree";

export function Sidebar() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 py-2 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          作品管理
        </span>
      </div>
      <WorkTree />
    </div>
  );
}
