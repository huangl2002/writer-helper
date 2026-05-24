import { WorkSelector } from "../works/WorkSelector";
import { ChapterTree } from "../chapters/ChapterTree";

export function Sidebar() {
  return (
    <div className="flex flex-col h-full p-2 gap-2 overflow-hidden">
      <WorkSelector />
      <div className="flex-1 overflow-y-auto">
        <ChapterTree />
      </div>
    </div>
  );
}
