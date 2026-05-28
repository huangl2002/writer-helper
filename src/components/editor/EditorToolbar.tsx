import type { Editor } from "@tiptap/react";
import { useCallback, useState } from "react";

interface Props {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: Props) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `px-2 py-1 text-sm rounded border ${
      active
        ? "bg-accent text-white border-accent"
        : "border-border hover:bg-surface-alt text-text-primary"
    }`;

  const handleSetLink = useCallback(() => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-border bg-surface-alt">
      {/* Undo/Redo */}
      <button onClick={() => editor.chain().focus().undo().run()} className={btn(false)} title="撤销 (Ctrl+Z)">↩</button>
      <button onClick={() => editor.chain().focus().redo().run()} className={btn(false)} title="重做 (Ctrl+Y)">↪</button>
      <span className="w-px bg-border mx-1 h-5" />

      {/* Bold/Italic */}
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))} title="加粗 (Ctrl+B)"><strong>B</strong></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))} title="斜体 (Ctrl+I)"><em>I</em></button>
      <span className="w-px bg-border mx-1 h-5" />

      {/* Headings */}
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive("heading", { level: 1 }))}>H1</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))}>H2</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))}>H3</button>
      <span className="w-px bg-border mx-1 h-5" />

      {/* Lists */}
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))} title="无序列表">•≡</button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))} title="有序列表">1.</button>
      <span className="w-px bg-border mx-1 h-5" />

      {/* Blockquote */}
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive("blockquote"))} title="引用">❝</button>

      {/* Link */}
      {showLinkInput ? (
        <span className="flex items-center gap-1">
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-32 text-xs px-1 py-0.5 border border-border rounded bg-surface text-text-primary"
            onKeyDown={(e) => { if (e.key === "Enter") handleSetLink(); if (e.key === "Escape") setShowLinkInput(false); }}
            autoFocus
          />
          <button onClick={handleSetLink} className="text-xs px-1 text-accent">✓</button>
          <button onClick={() => setShowLinkInput(false)} className="text-xs px-1 text-text-secondary">✕</button>
        </span>
      ) : (
        <button onClick={() => { setShowLinkInput(true); setLinkUrl(editor.getAttributes("link").href || ""); }} className={btn(editor.isActive("link"))} title="链接">🔗</button>
      )}

      <span className="w-px bg-border mx-1 h-5" />

      {/* Horizontal rule */}
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="px-2 py-1 text-sm rounded border border-border hover:bg-surface-alt text-text-primary" title="分隔线">―</button>
    </div>
  );
}
