import { useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
import { ChapterActions } from "./ChapterActions";
import * as db from "../../lib/db";

export function ChapterTree() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const volumes = useAppStore((s) => s.volumes);
  const chapters = useAppStore((s) => s.chapters);
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const setVolumes = useAppStore((s) => s.setVolumes);
  const setChapters = useAppStore((s) => s.setChapters);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);

  useEffect(() => {
    if (!activeWorkId) return;
    db.listVolumes(activeWorkId).then(setVolumes).catch(console.error);
    db.listChapters(activeWorkId, null)
      .then(setChapters)
      .catch(console.error);
  }, [activeWorkId]);

  const refresh = async () => {
    if (!activeWorkId) return;
    const [vols, chs] = await Promise.all([
      db.listVolumes(activeWorkId),
      db.listChapters(activeWorkId, null),
    ]);
    setVolumes(vols);
    setChapters(chs);
  };

  const handleAddVolume = async () => {
    if (!activeWorkId) return;
    const title = prompt("卷名：");
    if (!title?.trim()) return;
    await db.createVolume(activeWorkId, title.trim());
    await refresh();
  };

  const handleAddChapter = async (volumeId: string | null) => {
    if (!activeWorkId) return;
    const title = prompt("章节标题：");
    if (!title?.trim()) return;
    await db.createChapter(activeWorkId, volumeId, title.trim());
    await refresh();
  };

  const handleRenameChapter = async (id: string, currentTitle: string) => {
    const title = prompt("新标题：", currentTitle);
    if (!title?.trim()) return;
    await db.updateChapter(id, title.trim(), "{}", 0);
    await refresh();
  };

  const handleRenameVolume = async (id: string, currentTitle: string) => {
    const title = prompt("新卷名：", currentTitle);
    if (!title?.trim()) return;
    await db.updateVolume(id, title.trim());
    await refresh();
  };

  const handleDeleteChapter = async (id: string) => {
    if (!confirm("确定删除此章节？")) return;
    await db.deleteChapter(id);
    if (activeChapterId === id) setActiveChapter(null);
    await refresh();
  };

  const handleDeleteVolume = async (id: string) => {
    if (!confirm("确定删除此卷？卷内章节将移为未分类。")) return;
    await db.deleteVolume(id);
    await refresh();
  };

  if (!activeWorkId) {
    return (
      <p className="text-sm text-text-secondary p-2">请先创建或选择作品</p>
    );
  }

  const orphanChapters = chapters.filter((c) => !c.volume_id);

  return (
    <div className="text-sm">
      {orphanChapters.map((ch) => (
        <div
          key={ch.id}
          onClick={() => setActiveChapter(ch.id)}
          className={`group flex items-center py-1 px-2 cursor-pointer rounded ${
            activeChapterId === ch.id
              ? "bg-accent text-white"
              : "hover:bg-surface text-text-primary"
          }`}
        >
          <span className="truncate flex-1">📄 {ch.title}</span>
          <ChapterActions
            onAddVolume={() => handleAddVolume()}
            onAddChapter={() => handleAddChapter(null)}
            onRename={() => handleRenameChapter(ch.id, ch.title)}
            onDelete={() => handleDeleteChapter(ch.id)}
          />
        </div>
      ))}

      {volumes.map((vol) => {
        const volChapters = chapters.filter((c) => c.volume_id === vol.id);
        return (
          <div key={vol.id} className="mt-1">
            <div className="group flex items-center py-1 px-2 font-semibold text-text-secondary">
              <span className="truncate flex-1">📁 {vol.title}</span>
              <ChapterActions
                onAddVolume={() => handleAddVolume()}
                onAddChapter={() => handleAddChapter(vol.id)}
                onRename={() => handleRenameVolume(vol.id, vol.title)}
                onDelete={() => handleDeleteVolume(vol.id)}
              />
            </div>
            {volChapters.map((ch) => (
              <div
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`group flex items-center py-1 pl-6 pr-2 cursor-pointer rounded ${
                  activeChapterId === ch.id
                    ? "bg-accent text-white"
                    : "hover:bg-surface text-text-primary"
                }`}
              >
                <span className="truncate flex-1">📄 {ch.title}</span>
                <ChapterActions
                  onAddVolume={() => handleAddVolume()}
                  onAddChapter={() => handleAddChapter(vol.id)}
                  onRename={() => handleRenameChapter(ch.id, ch.title)}
                  onDelete={() => handleDeleteChapter(ch.id)}
                />
              </div>
            ))}
          </div>
        );
      })}

      <div className="mt-2 px-2 flex gap-1">
        <button
          onClick={() => handleAddChapter(null)}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-surface"
        >
          + 章节
        </button>
        <button
          onClick={() => handleAddVolume()}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-surface"
        >
          + 卷
        </button>
      </div>
    </div>
  );
}
