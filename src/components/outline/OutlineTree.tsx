import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import type { Outline } from "../../types";
import * as db from "../../lib/db";

const NODE_TYPES = [
  { value: "volume", label: "卷" },
  { value: "chapter", label: "章" },
  { value: "plot", label: "情节" },
  { value: "scene", label: "场景" },
];

function buildTree(outlines: Outline[]): Outline[] {
  const map = new Map<string, Outline & { children: Outline[] }>();
  const roots: (Outline & { children: Outline[] })[] = [];

  for (const o of outlines) {
    map.set(o.id, { ...o, children: [] });
  }
  for (const o of map.values()) {
    if (o.parent_id && map.has(o.parent_id)) {
      map.get(o.parent_id)!.children.push(o);
    } else {
      roots.push(o);
    }
  }

  return roots;
}

export function OutlineTree() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const chapters = useAppStore((s) => s.chapters);
  const setActiveChapter = useAppStore((s) => s.setActiveChapter);

  const [outlines, setOutlines] = useState<Outline[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeWorkId) return;
    db.listOutlines(activeWorkId).then(setOutlines).catch(console.error);
  }, [activeWorkId]);

  const refresh = async () => {
    if (!activeWorkId) return;
    const items = await db.listOutlines(activeWorkId);
    setOutlines(items);
  };

  const handleAdd = async (parentId: string | null) => {
    if (!activeWorkId) return;
    const title = prompt("大纲节点名称：");
    if (!title?.trim()) return;
    await db.createOutline(activeWorkId, parentId, title.trim(), "plot");
    await refresh();
  };

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const confirmRename = async (o: Outline) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    await db.updateOutline(
      o.id,
      editTitle.trim(),
      o.content,
      o.node_type,
      o.linked_chapter_id,
      o.is_complete,
    );
    setEditingId(null);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此大纲节点？子节点将上移。")) return;
    await db.deleteOutline(id);
    await refresh();
  };

  const toggleComplete = async (o: Outline) => {
    await db.updateOutline(
      o.id,
      o.title,
      o.content,
      o.node_type,
      o.linked_chapter_id,
      !o.is_complete,
    );
    await refresh();
  };

  const linkChapter = async (o: Outline, chapterId: string) => {
    await db.updateOutline(
      o.id,
      o.title,
      o.content,
      o.node_type,
      chapterId || null,
      o.is_complete,
    );
    await refresh();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    const allExpandable = outlines
      .filter((o) => outlines.some((p) => p.parent_id === o.id))
      .map((o) => o.id);
    if (expandedIds.size > 0) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(allExpandable));
    }
  };

  const tree = buildTree(outlines);

  const renderNode = (
    node: Outline & { children?: Outline[] },
    depth: number,
  ) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const linkedChapter = node.linked_chapter_id
      ? chapters.find((c) => c.id === node.linked_chapter_id)
      : null;

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center py-0.5 px-2 rounded cursor-pointer ${
            depth === 0 ? "font-semibold" : ""
          } hover:bg-surface-alt text-text-primary`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Expand/collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="shrink-0 text-xs mr-1 hover:text-accent"
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Complete checkbox */}
          <input
            type="checkbox"
            checked={node.is_complete}
            onChange={() => toggleComplete(node)}
            className="shrink-0 mr-1.5"
            title="标记完成"
          />

          {/* Title or edit input */}
          {editingId === node.id ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => confirmRename(node)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmRename(node);
                if (e.key === "Escape") setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-surface-alt border border-accent rounded px-1 py-0 text-sm text-text-primary outline-none"
            />
          ) : (
            <span
              className={`flex-1 truncate text-sm ${
                node.is_complete ? "line-through text-text-secondary" : ""
              }`}
            >
              {NODE_TYPES.find((t) => t.value === node.node_type)?.label && (
                <span className="text-xs text-text-secondary mr-1">
                  [{NODE_TYPES.find((t) => t.value === node.node_type)?.label}]
                </span>
              )}
              {node.title}
              {linkedChapter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveChapter(linkedChapter.id);
                  }}
                  className="text-xs text-accent ml-1 hover:underline"
                >
                  →{linkedChapter.title}
                </button>
              )}
            </span>
          )}

          {/* Node type selector */}
          <select
            value={node.node_type}
            onChange={(e) => {
              db.updateOutline(
                node.id,
                node.title,
                node.content,
                e.target.value,
                node.linked_chapter_id,
                node.is_complete,
              ).then(refresh);
            }}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-xs bg-surface border border-border rounded px-1 py-0 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity mr-1"
          >
            {NODE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Link chapter */}
          <select
            value={node.linked_chapter_id ?? ""}
            onChange={(e) => linkChapter(node, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-xs bg-surface border border-border rounded px-1 py-0 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity mr-1 max-w-[100px]"
          >
            <option value="">关联章节</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Actions */}
          <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleAdd(node.id); }}
              className="text-xs px-1 hover:text-accent"
              title="添加子节点"
            >
              +
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); startRename(node.id, node.title); }}
              className="text-xs px-1 hover:text-accent"
            >
              ✎
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }}
              className="text-xs px-1 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded &&
          node.children!.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!activeWorkId) {
    return (
      <div className="p-3 text-sm text-text-secondary">
        请先选择作品
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="flex items-center justify-between px-2 py-1 border-b border-border">
        <span className="text-xs text-text-secondary">
          {outlines.length} 个节点
        </span>
        <div className="flex gap-1">
          <button
            onClick={toggleExpandAll}
            className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-primary"
          >
            {expandedIds.size > 0 ? "折叠" : "展开"}
          </button>
          <button
            onClick={() => handleAdd(null)}
            className="text-xs px-1.5 py-0.5 bg-accent text-white rounded hover:opacity-90"
          >
            + 根节点
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="flex items-center justify-center text-text-secondary text-sm p-4">
            点击「+ 根节点」开始构建大纲
          </div>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}
