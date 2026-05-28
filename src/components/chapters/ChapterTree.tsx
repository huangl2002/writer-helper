import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "../../stores/appStore";
import { ChapterActions } from "./ChapterActions";
import { ContextMenu, type ContextMenuItem } from "../common/ContextMenu";
import * as db from "../../lib/db";
import type { Chapter, Volume } from "../../types";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ───── Sortable item wrappers ───── */

function SortableItem({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className={className}>
      <div className="flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary px-0.5"
          title="拖拽排序"
        >
          ⠿
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

/* ───── Context menu ───── */

function buildChapterMenu(
  ch: Chapter,
  volumes: Volume[],
  onRename: () => void,
  onStatusChange: (status: string) => void,
  onMoveToVolume: (volumeId: string | null) => void,
  onDelete: () => void,
): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { label: "重命名", onClick: onRename },
    { separator: true },
    {
      label: "状态: 草稿",
      onClick: () => onStatusChange("draft"),
    },
    {
      label: "状态: 写作中",
      onClick: () => onStatusChange("writing"),
    },
    {
      label: "状态: 已完成",
      onClick: () => onStatusChange("done"),
    },
    { separator: true },
    { label: "移至未分类", onClick: () => onMoveToVolume(null) },
    ...volumes
      .filter((v) => v.id !== ch.volume_id)
      .map((v) => ({
        label: `移至 ${v.title}`,
        onClick: () => onMoveToVolume(v.id),
      })),
    { separator: true },
    { label: "删除", danger: true, onClick: onDelete },
  ];
  return items;
}

function buildVolumeMenu(
  onRename: () => void,
  onDelete: () => void,
): ContextMenuItem[] {
  return [
    { label: "重命名", onClick: onRename },
    { separator: true },
    { label: "删除", danger: true, onClick: onDelete },
  ];
}

/* ───── Main component ───── */

export function ChapterTree() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const volumes = useAppStore((s) => s.volumes);
  const chapters = useAppStore((s) => s.chapters);
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const setVolumes = useAppStore((s) => s.setVolumes);
  const setChapters = useAppStore((s) => s.setChapters);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);

  const [collapsedVolumes, setCollapsedVolumes] = useState<Set<string>>(
    new Set(),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!activeWorkId) return;
    db.listVolumes(activeWorkId).then(setVolumes).catch(console.error);
    db.listChapters(activeWorkId, null)
      .then(setChapters)
      .catch(console.error);
  }, [activeWorkId]);

  const refresh = useCallback(async () => {
    if (!activeWorkId) return;
    const [vols, chs] = await Promise.all([
      db.listVolumes(activeWorkId),
      db.listChapters(activeWorkId, null),
    ]);
    setVolumes(vols);
    setChapters(chs);
  }, [activeWorkId]);

  // ── Drag handlers ──

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Handle volume reorder
      const oldVolIdx = volumes.findIndex((v) => v.id === active.id);
      const newVolIdx = volumes.findIndex((v) => v.id === over.id);
      if (oldVolIdx !== -1 && newVolIdx !== -1) {
        const newOrder = arrayMove(volumes, oldVolIdx, newVolIdx);
        setVolumes(newOrder);
        const ids = newOrder.map((v) => v.id);
        await db.reorderVolumes(ids);
        return;
      }

      // Handle chapter reorder at top level
      const orphanChs = chapters.filter((c) => !c.volume_id);
      const oldChIdx = orphanChs.findIndex((c) => c.id === active.id);
      const newChIdx = orphanChs.findIndex((c) => c.id === over.id);
      if (oldChIdx !== -1 && newChIdx !== -1) {
        const newOrphans = arrayMove(orphanChs, oldChIdx, newChIdx);
        const volumeChapters = chapters.filter((c) => c.volume_id);
        // Rebuild sort orders
        const reordered = [...newOrphans, ...volumeChapters];
        await db.reorderChapters(reordered.map((c) => c.id));
        await refresh();
        return;
      }

      // Handle chapter reorder within a volume
      for (const vol of volumes) {
        const volChs = chapters.filter((c) => c.volume_id === vol.id);
        const oldIdx = volChs.findIndex((c) => c.id === active.id);
        const newIdx = volChs.findIndex((c) => c.id === over.id);
        if (oldIdx !== -1 && newIdx !== -1) {
          const reordered = arrayMove(volChs, oldIdx, newIdx);
          const orphanChs = chapters.filter((c) => !c.volume_id);
          const otherChs = chapters.filter(
            (c) => c.volume_id && c.volume_id !== vol.id,
          );
          const allChs = [...orphanChs, ...otherChs, ...reordered];
          await db.reorderChapters(allChs.map((c) => c.id));
          await refresh();
          return;
        }
      }
    },
    [volumes, chapters, refresh],
  );

  const handleDragOver = useCallback(
    async (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeChapter = chapters.find((c) => c.id === active.id);
      if (!activeChapter) return;

      // Check if being dragged over a volume
      const overVolume = volumes.find((v) => v.id === over.id);
      if (overVolume && activeChapter.volume_id !== overVolume.id) {
        const updated = chapters.map((c) =>
          c.id === activeChapter.id
            ? { ...c, volume_id: overVolume.id }
            : c,
        );
        setChapters(updated);
        try {
          await db.moveChapter(activeChapter.id, overVolume.id);
        } catch {
          setChapters(chapters);
        }
        return;
      }

      // Check if dragged over an orphan chapter area (remove from volume)
      const overOrphan = chapters.find(
        (c) => c.id === over.id && !c.volume_id,
      );
      if (overOrphan && activeChapter.volume_id) {
        const updated = chapters.map((c) =>
          c.id === activeChapter.id ? { ...c, volume_id: null } : c,
        );
        setChapters(updated);
        try {
          await db.moveChapter(activeChapter.id, null);
        } catch {
          setChapters(chapters);
        }
        return;
      }
    },
    [chapters, volumes],
  );

  // ── CRUD handlers ──

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

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
    setCtxMenu(null);
  };

  const confirmRename = async (id: string, type: "chapter" | "volume") => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    if (type === "chapter") {
      const ch = chapters.find((c) => c.id === id);
      if (ch) {
        await db.updateChapter(
          id,
          editTitle.trim(),
          ch.content_json,
          ch.word_count,
        );
      }
    } else {
      await db.updateVolume(id, editTitle.trim());
    }
    setEditingId(null);
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

  const handleStatusChange = async (ch: Chapter, status: string) => {
    await db.updateChapterStatus(ch.id, status);
    await refresh();
  };

  const handleMoveChapter = async (ch: Chapter, volumeId: string | null) => {
    await db.moveChapter(ch.id, volumeId);
    await refresh();
  };

  const toggleCollapse = (volId: string) => {
    setCollapsedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volId)) next.delete(volId);
      else next.add(volId);
      return next;
    });
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "草稿";
      case "writing":
        return "写作中";
      case "done":
        return "已完成";
      default:
        return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "text-text-secondary";
      case "writing":
        return "text-blue-500";
      case "done":
        return "text-green-500";
      default:
        return "";
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    menuBuilder: () => ContextMenuItem[],
  ) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, items: menuBuilder() });
  };

  if (!activeWorkId) {
    return (
      <p className="text-sm text-text-secondary p-2">请先创建或选择作品</p>
    );
  }

  const orphanChapters = chapters.filter((c) => !c.volume_id);

  const filterChapters = (chs: typeof chapters) => {
    if (!searchQuery.trim()) return chs;
    const q = searchQuery.toLowerCase();
    return chs.filter((c) => c.title.toLowerCase().includes(q));
  };

  const filteredOrphans = filterChapters(orphanChapters);

  // Build top-level sortable IDs: volumes first, then orphan chapters
  const topLevelIds = [
    ...volumes.map((v) => v.id),
    ...filteredOrphans.map((c) => c.id),
  ];

  return (
    <div className="text-sm">
      {/* Search */}
      <div className="px-2 pb-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索章节..."
          className="w-full text-xs px-2 py-1 border border-border rounded bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <SortableContext items={topLevelIds} strategy={verticalListSortingStrategy}>
          {/* Orphan chapters (no volume) */}
          {filteredOrphans.map((ch) => (
            <SortableItem key={ch.id} id={ch.id}>
              <div
                onClick={() => setActiveChapter(ch.id)}
                onContextMenu={(e) =>
                  handleContextMenu(e, () =>
                    buildChapterMenu(
                      ch,
                      volumes,
                      () => startRename(ch.id, ch.title),
                      (status) => handleStatusChange(ch, status),
                      (vid) => handleMoveChapter(ch, vid),
                      () => handleDeleteChapter(ch.id),
                    ),
                  )
                }
                className={`group flex items-center py-1 px-2 cursor-pointer rounded ${
                  activeChapterId === ch.id
                    ? "bg-accent text-white"
                    : "hover:bg-surface text-text-primary"
                }`}
              >
                {editingId === ch.id ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => confirmRename(ch.id, "chapter")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRename(ch.id, "chapter");
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-surface-alt border border-accent rounded px-1 py-0 text-sm text-text-primary outline-none"
                  />
                ) : (
                  <>
                    <span className="truncate flex-1">📄 {ch.title}</span>
                    <span
                      className={`text-xs mr-1 shrink-0 ${statusColor(ch.status)}`}
                    >
                      {statusLabel(ch.status)}
                    </span>
                    <span className="text-xs text-text-secondary mr-1 shrink-0">
                      {ch.word_count}字
                    </span>
                  </>
                )}
                <ChapterActions
                  onAddVolume={handleAddVolume}
                  onAddChapter={() => handleAddChapter(null)}
                  onRename={() => startRename(ch.id, ch.title)}
                  onDelete={() => handleDeleteChapter(ch.id)}
                />
              </div>
            </SortableItem>
          ))}

          {/* Volumes with chapters */}
          {volumes.map((vol) => {
            const volChapters = filterChapters(
              chapters.filter((c) => c.volume_id === vol.id),
            );
            const isCollapsed = collapsedVolumes.has(vol.id);

            return (
              <SortableItem key={vol.id} id={vol.id}>
                <div className="mt-0.5">
                  <div
                    onContextMenu={(e) =>
                      handleContextMenu(e, () =>
                        buildVolumeMenu(
                          () => startRename(vol.id, vol.title),
                          () => handleDeleteVolume(vol.id),
                        ),
                      )
                    }
                    className="group flex items-center py-1 px-2 font-semibold text-text-secondary"
                  >
                    <button
                      onClick={() => toggleCollapse(vol.id)}
                      className="mr-1 text-xs shrink-0 hover:text-text-primary"
                    >
                      {isCollapsed ? "▸" : "▾"}
                    </button>
                    {editingId === vol.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => confirmRename(vol.id, "volume")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(vol.id, "volume");
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-surface-alt border border-accent rounded px-1 py-0 text-sm text-text-primary outline-none"
                      />
                    ) : (
                      <span className="truncate flex-1">📁 {vol.title}</span>
                    )}
                    <ChapterActions
                      onAddVolume={handleAddVolume}
                      onAddChapter={() => handleAddChapter(vol.id)}
                      onRename={() => startRename(vol.id, vol.title)}
                      onDelete={() => handleDeleteVolume(vol.id)}
                    />
                  </div>

                  {!isCollapsed && volChapters.length > 0 && (
                    <SortableContext
                      items={volChapters.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {volChapters.map((ch) => (
                        <SortableItem key={ch.id} id={ch.id}>
                          <div
                            onClick={() => setActiveChapter(ch.id)}
                            onContextMenu={(e) =>
                              handleContextMenu(e, () =>
                                buildChapterMenu(
                                  ch,
                                  volumes,
                                  () => startRename(ch.id, ch.title),
                                  (status) => handleStatusChange(ch, status),
                                  (vid) => handleMoveChapter(ch, vid),
                                  () => handleDeleteChapter(ch.id),
                                ),
                              )
                            }
                            className={`group flex items-center py-1 pl-8 pr-2 cursor-pointer rounded ${
                              activeChapterId === ch.id
                                ? "bg-accent text-white"
                                : "hover:bg-surface text-text-primary"
                            }`}
                          >
                            {editingId === ch.id ? (
                              <input
                                autoFocus
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => confirmRename(ch.id, "chapter")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    confirmRename(ch.id, "chapter");
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 bg-surface-alt border border-accent rounded px-1 py-0 text-sm text-text-primary outline-none"
                              />
                            ) : (
                              <>
                                <span className="truncate flex-1">
                                  📄 {ch.title}
                                </span>
                                <span
                                  className={`text-xs mr-1 shrink-0 ${statusColor(ch.status)}`}
                                >
                                  {statusLabel(ch.status)}
                                </span>
                                <span className="text-xs text-text-secondary mr-1 shrink-0">
                                  {ch.word_count}字
                                </span>
                              </>
                            )}
                            <ChapterActions
                              onAddVolume={handleAddVolume}
                              onAddChapter={() => handleAddChapter(vol.id)}
                              onRename={() => startRename(ch.id, ch.title)}
                              onDelete={() => handleDeleteChapter(ch.id)}
                            />
                          </div>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  )}

                  {!isCollapsed && volChapters.length === 0 && (
                    <div className="pl-8 py-1 text-xs text-text-secondary">
                      空卷，点击 + 添加章节
                    </div>
                  )}
                </div>
              </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>

      <div className="mt-2 px-2 flex gap-1">
        <button
          onClick={() => handleAddChapter(null)}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-surface text-text-primary"
        >
          + 章节
        </button>
        <button
          onClick={handleAddVolume}
          className="text-xs px-2 py-1 border border-border rounded hover:bg-surface text-text-primary"
        >
          + 卷
        </button>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

