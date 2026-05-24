import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-sm rounded border ${
      active
        ? "bg-accent text-white border-accent"
        : "border-border hover:bg-surface-alt text-text-primary"
    }`;

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border bg-surface-alt">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive("bold"))}
        title="加粗 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive("italic"))}
        title="斜体 (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <span className="w-px bg-border mx-1" />
      <button
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        className={btnClass(editor.isActive("heading", { level: 1 }))}
      >
        H1
      </button>
      <button
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        className={btnClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        className={btnClass(editor.isActive("heading", { level: 3 }))}
      >
        H3
      </button>
      <span className="w-px bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="px-2 py-1 text-sm rounded border border-border hover:bg-surface-alt text-text-primary"
        title="分隔线"
      >
        ―
      </button>
    </div>
  );
}
