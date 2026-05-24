import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import * as db from "../../lib/db";

export function WorkSelector() {
  const works = useAppStore((s) => s.works);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const setWorks = useAppStore((s) => s.setWorks);
  const setActiveWork = useAppStore((s) => s.setActiveWork);

  useEffect(() => {
    db.listWorks().then(setWorks).catch(console.error);
  }, []);

  const handleCreate = async () => {
    const title = prompt("输入作品名称：");
    if (!title?.trim()) return;
    try {
      const work = await db.createWork(title.trim());
      const updated = await db.listWorks();
      setWorks(updated);
      setActiveWork(work.id);
    } catch (e) {
      console.error("Failed to create work:", e);
    }
  };

  if (works.length === 0) {
    return (
      <button
        onClick={handleCreate}
        className="w-full py-2 text-sm border-2 border-dashed border-border rounded text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
      >
        + 创建第一部作品
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={activeWorkId ?? ""}
        onChange={(e) => setActiveWork(e.target.value)}
        className="flex-1 text-sm bg-surface border border-border rounded px-2 py-1 text-text-primary min-w-0"
      >
        {works.map((w) => (
          <option key={w.id} value={w.id}>
            {w.title}
          </option>
        ))}
      </select>
      <button
        onClick={handleCreate}
        className="shrink-0 px-2 py-1 text-sm border border-border rounded hover:bg-surface-alt"
        title="新建作品"
      >
        +
      </button>
    </div>
  );
}
