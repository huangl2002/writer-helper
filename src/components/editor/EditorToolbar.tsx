import type { Editor } from "@tiptap/react";
import { useCallback, useState } from "react";

interface Props {
  editor: Editor | null;
  onFind?: () => void;
  onFormat?: () => void;
}

function btnBase(active: boolean) {
  return `px-2 py-1 text-sm rounded border transition-colors ${
    active
      ? "bg-accent text-white border-accent"
      : "border-border hover:bg-surface text-text-primary"
  }`;
}

function Divider() {
  return <span className="w-px h-6 bg-border mx-1.5 self-center shrink-0" />;
}

interface ToolGroupProps {
  label: string;
  children: React.ReactNode;
}

function ToolGroup({ label, children }: ToolGroupProps) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <span className="text-[10px] text-text-secondary leading-none mb-1 select-none">
        {label}
      </span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}

export function EditorToolbar({ editor, onFind, onFormat }: Props) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!editor) return null;

  const handleSetLink = useCallback(() => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border bg-surface-alt overflow-x-auto">
      {/* 编辑 */}
      <ToolGroup label="编辑">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          className={btnBase(false)}
          title="撤销 (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          className={btnBase(false)}
          title="重做 (Ctrl+Y)"
        >
          ↪
        </button>
        {onFind && (
          <button
            onClick={onFind}
            className={btnBase(false)}
            title="查找替换 (Ctrl+F)"
          >
            🔍
          </button>
        )}
      </ToolGroup>

      <Divider />

      {/* 格式 */}
      <ToolGroup label="格式">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnBase(editor.isActive("bold"))}
          title="加粗 (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnBase(editor.isActive("italic"))}
          title="斜体 (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnBase(editor.isActive("underline"))}
          title="下划线 (Ctrl+U)"
        >
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnBase(editor.isActive("strike"))}
          title="删除线"
        >
          <span style={{ textDecoration: "line-through" }}>S</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={btnBase(editor.isActive("highlight"))}
          title="高亮"
        >
          🖌
        </button>
      </ToolGroup>

      <Divider />

      {/* 段落 */}
      <ToolGroup label="段落">
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={btnBase(editor.isActive("heading", { level: 1 }))}
          title="一级标题"
        >
          H1
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={btnBase(editor.isActive("heading", { level: 2 }))}
          title="二级标题"
        >
          H2
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={btnBase(editor.isActive("heading", { level: 3 }))}
          title="三级标题"
        >
          H3
        </button>
      </ToolGroup>

      <Divider />

      <ToolGroup label="列表">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnBase(editor.isActive("bulletList"))}
          title="无序列表"
        >
          •≡
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnBase(editor.isActive("orderedList"))}
          title="有序列表"
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btnBase(editor.isActive("blockquote"))}
          title="引用"
        >
          ❝
        </button>
      </ToolGroup>

      <Divider />

      {/* 对齐 */}
      <ToolGroup label="对齐">
        <button
          onClick={() =>
            editor.chain().focus().setTextAlign("left").run()
          }
          className={btnBase(editor.isActive({ textAlign: "left" }))}
          title="左对齐"
        >
          ≡◁
        </button>
        <button
          onClick={() =>
            editor.chain().focus().setTextAlign("center").run()
          }
          className={btnBase(editor.isActive({ textAlign: "center" }))}
          title="居中"
        >
          ≡◇
        </button>
        <button
          onClick={() =>
            editor.chain().focus().setTextAlign("right").run()
          }
          className={btnBase(editor.isActive({ textAlign: "right" }))}
          title="右对齐"
        >
          ≡▷
        </button>
        <button
          onClick={() =>
            editor.chain().focus().setTextAlign("justify").run()
          }
          className={btnBase(editor.isActive({ textAlign: "justify" }))}
          title="两端对齐"
        >
          ≡▯
        </button>
      </ToolGroup>

      <Divider />

      {/* 工具 */}
      <ToolGroup label="工具">
        {onFormat && (
          <button
            onClick={onFormat}
            className={btnBase(false)}
            title="一键排版：段首缩进、段间空行、全角标点"
          >
            📐
          </button>
        )}
      </ToolGroup>

      <Divider />

      {/* 插入 */}
      <ToolGroup label="插入">
        {showLinkInput ? (
          <span className="flex items-center gap-1">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-32 text-xs px-1 py-0.5 border border-border rounded bg-surface text-text-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSetLink();
                if (e.key === "Escape") setShowLinkInput(false);
              }}
              autoFocus
            />
            <button
              onClick={handleSetLink}
              className="text-xs px-1 text-accent"
            >
              ✓
            </button>
            <button
              onClick={() => setShowLinkInput(false)}
              className="text-xs px-1 text-text-secondary"
            >
              ✕
            </button>
          </span>
        ) : (
          <button
            onClick={() => {
              setShowLinkInput(true);
              setLinkUrl(editor.getAttributes("link").href || "");
            }}
            className={btnBase(editor.isActive("link"))}
            title="链接"
          >
            🔗
          </button>
        )}
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btnBase(false)}
          title="分隔线"
        >
          ―
        </button>
      </ToolGroup>

      {/* Spacer for collapsed toolbar indicator */}
      <div className="flex-1" />

      {/* Clear formatting */}
      <button
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className="px-2 py-1 text-xs rounded border border-border hover:bg-surface text-text-secondary shrink-0"
        title="清除格式"
      >
        清除
      </button>
    </div>
  );
}
