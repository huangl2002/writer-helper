import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "../../stores/appStore";
import { ContextMenu, type ContextMenuItem } from "../common/ContextMenu";
import type { Chapter, Volume, Work } from "../../types";
import * as db from "../../lib/db";

export function WorkTree() {
  const works = useAppStore((s) => s.works);
  const volumes = useAppStore((s) => s.volumes);
  const chapters = useAppStore((s) => s.chapters);
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const activeChapterId = useAppStore((s) => s.activeChapterId);
  const setWorks = useAppStore((s) => s.setWorks);
  const setVolumes = useAppStore((s) => s.setVolumes);
  const setChapters = useAppStore((s) => s.setChapters);
  const setActiveWork = useAppStore((s) => s.setActiveWork);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ctxMenu, setCtxMenu] = useState<{
    x: number; y: number; items: ContextMenuItem[];
  } | null>(null);

  // Load works on mount
  useEffect(() => {
    db.listWorks().then(setWorks).catch(console.error);
  }, []);

  // Load volumes & chapters when active work changes
  useEffect(() => {
    if (!activeWorkId) {
      setVolumes([]);
      setChapters([]);
      return;
    }
    db.listVolumes(activeWorkId)
      .then(setVolumes)
      .catch(console.error);
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

  const refreshWorks = () => db.listWorks().then(setWorks).catch(console.error);

  // ── Work CRUD ──
  const handleAddWork = async () => {
    const title = prompt("作品名称：");
    if (!title?.trim()) return;
    try {
      const w = await db.createWork(title.trim());
      await refreshWorks();
      setActiveWork(w.id);
    } catch (e) {
      console.error("Failed to create work:", e);
      alert("创建作品失败，请重试");
    }
  };

  const handleDeleteWork = async (w: Work) => {
    if (!confirm(`确定删除作品「${w.title}」？所有章节数据将被删除。`)) return;
    await db.deleteWork(w.id);
    if (activeWorkId === w.id) setActiveWork(null);
    await refreshWorks();
  };

  // ── Volume CRUD ──
  const handleAddVolume = async () => {
    if (!activeWorkId) return;
    const title = prompt("卷名：");
    if (!title?.trim()) return;
    await db.createVolume(activeWorkId, title.trim());
    await refresh();
  };

  const handleDeleteVolume = async (v: Volume) => {
    if (!confirm("删除此卷？卷内章节将移为未分类。")) return;
    await db.deleteVolume(v.id);
    await refresh();
  };

  // ── Chapter CRUD ──
  const handleAddChapter = async (volumeId: string | null) => {
    if (!activeWorkId) return;
    const title = prompt("章节标题：");
    if (!title?.trim()) return;
    await db.createChapter(activeWorkId, volumeId, title.trim());
    await refresh();
  };

  const handleDeleteChapter = async (ch: Chapter) => {
    if (!confirm("确定删除此章节？")) return;
    await db.deleteChapter(ch.id);
    if (activeChapterId === ch.id) setActiveChapter(null);
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

  // ── Inline edit ──
  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
    setCtxMenu(null);
  };

  const confirmRename = async (type: "work" | "volume" | "chapter", id: string) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    if (type === "work") {
      await db.updateWork(id, editTitle.trim());
      await refreshWorks();
    } else if (type === "volume") {
      await db.updateVolume(id, editTitle.trim());
      await refresh();
    } else {
      const ch = chapters.find((c) => c.id === id);
      if (ch) {
        await db.updateChapter(id, editTitle.trim(), ch.content_json, ch.word_count);
        await refresh();
      }
    }
    setEditingId(null);
  };

  // ── Toggle ──
  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Helpers ──
  const statusLabel = (s: string) =>
    s === "draft" ? "草稿" : s === "writing" ? "写作中" : s === "completed" ? "已完成" : s;
  const statusColor = (s: string) =>
    s === "draft"
      ? "text-text-secondary"
      : s === "writing"
        ? "text-blue-500"
        : s === "completed"
          ? "text-green-500"
          : "";

  function filterItems<T extends { title: string }>(items: T[]): T[] {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(q));
  }

  const filteredWorks = filterItems(works);

  // ── Context menus ──
  const workMenu = (w: Work): ContextMenuItem[] => [
    { label: "重命名", onClick: () => startRename(w.id, w.title) },
    { separator: true },
    { label: "删除作品", danger: true, onClick: () => handleDeleteWork(w) },
  ];

  const volumeMenu = (v: Volume): ContextMenuItem[] => [
    { label: "重命名", onClick: () => startRename(v.id, v.title) },
    { separator: true },
    { label: "删除卷", danger: true, onClick: () => handleDeleteVolume(v) },
  ];

  const chapterMenu = (ch: Chapter): ContextMenuItem[] => [
    { label: "重命名", onClick: () => startRename(ch.id, ch.title) },
    { separator: true },
    { label: "状态: 草稿", onClick: () => handleStatusChange(ch, "draft") },
    { label: "状态: 写作中", onClick: () => handleStatusChange(ch, "writing") },
    { label: "状态: 已完成", onClick: () => handleStatusChange(ch, "completed") },
    { separator: true },
    { label: "移至未分类", onClick: () => handleMoveChapter(ch, null) },
    ...volumes
      .filter((v) => v.id !== ch.volume_id)
      .map((v) => ({
        label: `移至 ${v.title}`,
        onClick: () => handleMoveChapter(ch, v.id),
      })),
    { separator: true },
    { label: "删除章节", danger: true, onClick: () => handleDeleteChapter(ch) },
  ];

  // ── Render ──

  const renderChapter = (ch: Chapter, indent: number) => (
    <div
      key={ch.id}
      onClick={() => setActiveChapter(ch.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, items: chapterMenu(ch) });
      }}
      className={`group flex items-center py-0.5 cursor-pointer rounded text-sm ${
        activeChapterId === ch.id
          ? "bg-accent text-white"
          : "hover:bg-surface-alt text-text-primary"
      }`}
      style={{ paddingLeft: `${indent + 12}px`, paddingRight: "4px" }}
    >
      {editingId === ch.id ? (
        <InlineInput
          value={editTitle}
          onChange={setEditTitle}
          onConfirm={() => confirmRename("chapter", ch.id)}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <>
          <span className="truncate flex-1">📄 {ch.title}</span>
          <span className={`text-xs mr-1 shrink-0 opacity-70 ${statusColor(ch.status)}`}>
            {statusLabel(ch.status)}
          </span>
          <span className="text-xs mr-1 shrink-0 opacity-50">
            {ch.word_count}字
          </span>
        </>
      )}
      {/* Action buttons on hover */}
      <ActionBtn
        onClick={() => handleAddChapter(ch.volume_id)}
        title="+章"
        label="+"
      />
      <ActionBtn
        onClick={() => startRename(ch.id, ch.title)}
        title="重命名"
        label="✎"
      />
      <ActionBtn
        onClick={() => handleDeleteChapter(ch)}
        title="删除"
        label="✕"
        danger
      />
    </div>
  );

  const renderVolume = (vol: Volume) => {
    const volChapters = filterItems(chapters.filter((c) => c.volume_id === vol.id));
    const isCollapsed = collapsed.has(vol.id);

    return (
      <div key={vol.id}>
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            setCtxMenu({ x: e.clientX, y: e.clientY, items: volumeMenu(vol) });
          }}
          className="group flex items-center py-0.5 pr-1 cursor-pointer rounded hover:bg-surface-alt text-sm text-text-secondary font-medium"
          style={{ paddingLeft: "8px" }}
        >
          <button
            onClick={() => toggleCollapse(vol.id)}
            className="shrink-0 w-4 text-xs hover:text-text-primary"
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
          {editingId === vol.id ? (
            <InlineInput
              value={editTitle}
              onChange={setEditTitle}
              onConfirm={() => confirmRename("volume", vol.id)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <span className="truncate flex-1">📁 {vol.title}</span>
          )}
          <ActionBtn onClick={() => handleAddChapter(vol.id)} title="+章" label="+" />
          <ActionBtn
            onClick={() => startRename(vol.id, vol.title)}
            title="重命名"
            label="✎"
          />
          <ActionBtn
            onClick={() => handleDeleteVolume(vol)}
            title="删除"
            label="✕"
            danger
          />
        </div>
        {!isCollapsed &&
          volChapters.map((ch) => renderChapter(ch, 24))}
        {!isCollapsed && volChapters.length === 0 && (
          <div className="text-xs text-text-secondary py-0.5" style={{ paddingLeft: 32 }}>
            空卷 — 点击 + 添加章节
          </div>
        )}
      </div>
    );
  };

  const orphanChapters = filterItems(chapters.filter((c) => !c.volume_id));

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Search */}
      <div className="px-2 pt-1 pb-1">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索..."
          className="w-full text-xs px-2 py-1 border border-border rounded bg-surface text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-1 pb-1">
        {filteredWorks.length === 0 ? (
          <div className="p-3 text-center text-text-secondary text-xs">
            暂无作品
          </div>
        ) : (
          filteredWorks.map((w) => {
            const isActive = activeWorkId === w.id;
            const isExpanded = isActive && !collapsed.has(w.id);

            return (
              <div key={w.id} className="mt-0.5">
                {/* Work row */}
                <div
                  onClick={() => setActiveWork(w.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCtxMenu({ x: e.clientX, y: e.clientY, items: workMenu(w) });
                  }}
                  className={`group flex items-center py-1 px-1 cursor-pointer rounded font-semibold ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "hover:bg-surface-alt text-text-primary"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isActive) toggleCollapse(w.id);
                      else setActiveWork(w.id);
                    }}
                    className="shrink-0 w-4 text-xs hover:text-accent"
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                  {editingId === w.id ? (
                    <InlineInput
                      value={editTitle}
                      onChange={setEditTitle}
                      onConfirm={() => confirmRename("work", w.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <span className="truncate flex-1">📘 {w.title}</span>
                  )}
                  <ActionBtn
                    onClick={() => startRename(w.id, w.title)}
                    title="重命名"
                    label="✎"
                  />
                  <ActionBtn
                    onClick={() => handleDeleteWork(w)}
                    title="删除"
                    label="✕"
                    danger
                  />
                </div>

                {/* Expanded: volumes + orphan chapters */}
                {isExpanded && (
                  <div className="ml-2 border-l border-border pl-1">
                    {/* Orphan chapters first */}
                    {orphanChapters.map((ch) => renderChapter(ch, 8))}

                    {volumes.map(renderVolume)}

                    {/* Quick add for active work */}
                    <div className="flex gap-1 mt-1 ml-2">
                      <button
                        onClick={() => handleAddChapter(null)}
                        className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-primary"
                      >
                        + 章
                      </button>
                      <button
                        onClick={handleAddVolume}
                        className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-primary"
                      >
                        + 卷
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom add work button */}
      <div className="px-2 pb-2 pt-1 border-t border-border shrink-0">
        <button
          onClick={handleAddWork}
          className="w-full text-xs py-1.5 border-2 border-dashed border-border rounded text-text-secondary hover:text-accent hover:border-accent transition-colors"
        >
          + 新建作品
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

/* ─── Small inline sub-components ─── */

function ActionBtn({
  onClick,
  title,
  label,
  danger,
}: {
  onClick: () => void;
  title: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`shrink-0 text-xs px-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
        danger ? "hover:text-red-500" : "hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}

function InlineInput({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onConfirm}
      onKeyDown={(e) => {
        if (e.key === "Enter") onConfirm();
        if (e.key === "Escape") onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 bg-surface border border-accent rounded px-1 py-0 text-sm text-text-primary outline-none min-w-0"
    />
  );
}
