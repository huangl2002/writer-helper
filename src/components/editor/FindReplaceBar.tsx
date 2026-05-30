import { useState, useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
  visible: boolean;
  onClose: () => void;
}

export function FindReplaceBar({ editor, visible, onClose }: Props) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when visible
  useEffect(() => {
    if (visible) {
      const sel = editor?.state.selection;
      if (sel && !sel.empty) {
        const text = editor!.state.doc.textBetween(sel.from, sel.to);
        if (text) setFindText(text);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setFindText("");
      setReplaceText("");
      setShowReplace(false);
      setMatchIndex(0);
      setTotalMatches(0);
    }
  }, [visible, editor]);

  const findAllMatches = useCallback(
    (query: string) => {
      if (!editor || !query) return [];
      const text = editor.state.doc.textContent;
      const matches: number[] = [];
      let pos = 0;
      const lower = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      while ((pos = lower.indexOf(lowerQuery, pos)) !== -1) {
        matches.push(pos);
        pos += query.length;
      }
      return matches;
    },
    [editor],
  );

  const getAbsolutePosition = useCallback(
    (textOffset: number) => {
      if (!editor) return 0;
      let pos = 0;
      let remaining = textOffset;
      editor.state.doc.descendants((node, offset) => {
        if (node.isText && remaining >= 0) {
          const len = (node.text || "").length;
          if (remaining < len) {
            pos = offset + remaining;
            remaining = -1;
          } else {
            remaining -= len;
          }
        }
      });
      return pos;
    },
    [editor],
  );

  const navigateMatch = useCallback(
    (query: string, direction: "next" | "prev") => {
      if (!editor || !query) return;
      const matches = findAllMatches(query);
      if (matches.length === 0) {
        setTotalMatches(0);
        setMatchIndex(0);
        return;
      }
      setTotalMatches(matches.length);

      const currentPos = editor.state.selection.from;
      let newIndex = 0;

      if (direction === "next") {
        for (let i = 0; i < matches.length; i++) {
          const absPos = getAbsolutePosition(matches[i]);
          if (absPos > currentPos) {
            newIndex = i;
            break;
          }
        }
      } else {
        for (let i = matches.length - 1; i >= 0; i--) {
          const absPos = getAbsolutePosition(matches[i]);
          if (absPos < currentPos) {
            newIndex = i;
            break;
          }
        }
      }

      setMatchIndex(newIndex);
      const absPos = getAbsolutePosition(matches[newIndex]);
      editor
        .chain()
        .focus()
        .setTextSelection({ from: absPos, to: absPos + query.length })
        .run();
    },
    [editor, findAllMatches, getAbsolutePosition],
  );

  const handleReplace = useCallback(() => {
    if (!editor || !findText) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to);
    if (selected.toLowerCase() === findText.toLowerCase()) {
      editor
        .chain()
        .focus()
        .insertContent(replaceText)
        .run();
    }
    navigateMatch(findText, "next");
  }, [editor, findText, replaceText, navigateMatch]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || !findText) return;
    const matches = findAllMatches(findText);
    // Replace from end to start to preserve offsets
    for (let i = matches.length - 1; i >= 0; i--) {
      const absPos = getAbsolutePosition(matches[i]);
      editor
        .chain()
        .setTextSelection({
          from: absPos,
          to: absPos + findText.length,
        })
        .insertContent(replaceText)
        .run();
    }
    setMatchIndex(0);
    setTotalMatches(0);
  }, [editor, findText, replaceText, findAllMatches, getAbsolutePosition]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === "Escape") {
        onClose();
        editor?.commands.focus();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (showReplace) handleReplace();
        else navigateMatch(findText, "next");
      }
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        navigateMatch(findText, "prev");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose, editor, findText, showReplace, handleReplace, navigateMatch]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-alt text-sm shrink-0">
      {/* Find */}
      <span className="text-xs text-text-secondary shrink-0">查找</span>
      <input
        ref={inputRef}
        value={findText}
        onChange={(e) => {
          setFindText(e.target.value);
          if (e.target.value) navigateMatch(e.target.value, "next");
          else {
            setTotalMatches(0);
            setMatchIndex(0);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            navigateMatch(findText, e.shiftKey ? "prev" : "next");
          }
        }}
        className="w-40 text-xs px-1.5 py-0.5 border border-border rounded bg-surface text-text-primary focus:border-accent focus:outline-none"
        placeholder="输入文字..."
      />

      {/* Match count */}
      {findText && (
        <span className="text-xs text-text-secondary shrink-0">
          {totalMatches > 0 ? `${matchIndex + 1}/${totalMatches}` : "0/0"}
        </span>
      )}

      {/* Navigation */}
      <button
        onClick={() => navigateMatch(findText, "prev")}
        className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface text-text-primary shrink-0"
        title="上一个 (Shift+Enter)"
      >
        ▲
      </button>
      <button
        onClick={() => navigateMatch(findText, "next")}
        className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface text-text-primary shrink-0"
        title="下一个 (Enter)"
      >
        ▼
      </button>

      {/* Toggle replace */}
      <button
        onClick={() => setShowReplace(!showReplace)}
        className={`text-xs px-1.5 py-0.5 border rounded shrink-0 ${
          showReplace
            ? "bg-accent text-white border-accent"
            : "border-border hover:bg-surface text-text-primary"
        }`}
        title="替换 (Ctrl+H)"
      >
        替换
      </button>

      {/* Replace input */}
      {showReplace && (
        <>
          <span className="text-xs text-text-secondary shrink-0">替换为</span>
          <input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="w-40 text-xs px-1.5 py-0.5 border border-border rounded bg-surface text-text-primary focus:border-accent focus:outline-none"
            placeholder="替换内容..."
          />
          <button
            onClick={handleReplace}
            className="text-xs px-2 py-0.5 border border-border rounded hover:bg-surface text-text-primary shrink-0"
          >
            替换
          </button>
          <button
            onClick={handleReplaceAll}
            className="text-xs px-2 py-0.5 border border-border rounded hover:bg-surface text-text-primary shrink-0"
          >
            全部替换
          </button>
        </>
      )}

      {/* Close */}
      <div className="flex-1" />
      <button
        onClick={() => {
          onClose();
          editor?.commands.focus();
        }}
        className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface text-text-secondary shrink-0"
        title="关闭 (Esc)"
      >
        ✕
      </button>
    </div>
  );
}
