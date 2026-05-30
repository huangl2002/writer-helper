import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import * as db from "../../lib/db";

interface Props {
  editor: Editor | null;
}

type AiAction = "continue" | "polish" | "expand" | "condense";

const ACTION_LABELS: Record<AiAction, string> = {
  continue: "续写",
  polish: "润色",
  expand: "扩写",
  condense: "缩写",
};

const SYSTEM_PROMPTS: Record<AiAction, string> = {
  continue:
    "你是一位专业的小说作家。根据用户提供的上文，自然流畅地续写下一段内容。保持一致的文风、语气和角色性格。只返回续写内容，不要附加解释。",
  polish:
    "你是一位文字编辑。优化用户提供的文本，使其表达更流畅、更有文采，但保持原意不变。只返回润色后的文本。",
  expand:
    "你是一位小说作家。将用户提供的段落进行扩写，增加细节描写、心理活动、环境渲染等，使内容更加丰富。保持原有风格。只返回扩写后的内容。",
  condense:
    "将用户提供的文本进行精简缩写，保留核心情节和关键信息，去除冗余描述。只返回缩写后的文本。",
};

export function SelectionToolbar({ editor }: Props) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionChange = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to) {
        setVisible(false);
        setShowResult(false);
        return;
      }
      // Position above the selection
      const view = editor.view;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      const editorRect = view.dom.getBoundingClientRect();
      setPosition({
        x: (start.left + end.right) / 2 - editorRect.left + editorRect.left,
        y: Math.max(start.top - 12, editorRect.top),
      });
      setVisible(true);
      setShowResult(false);
      setError("");
    };

    editor.on("selectionUpdate", handleSelectionChange);
    return () => {
      editor.off("selectionUpdate", handleSelectionChange);
    };
  }, [editor]);

  // Click outside closes result panel
  useEffect(() => {
    if (!showResult) return;
    const handler = (e: MouseEvent) => {
      if (resultRef.current && !resultRef.current.contains(e.target as Node)) {
        setShowResult(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showResult]);

  const handleAction = async (action: AiAction) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (!selectedText.trim()) return;

    try {
      const cfg = await db.getDefaultAiConfig();
      if (!cfg) {
        setError("请先配置 AI 服务");
        return;
      }
      const config = await db.getAiConfigDecrypted(cfg.id);
      if (!config) {
        setError("无法解密 API Key");
        return;
      }

      setLoading(true);
      setError("");
      setResult("");
      setShowResult(true);

      const res = await fetch(config.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.api_key_encrypted}`,
        },
        body: JSON.stringify({
          model: config.model_name,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS[action] },
            { role: "user", content: selectedText },
          ],
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          stream: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${res.status}: ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "(无响应)";
      setResult(reply);
    } catch (e: any) {
      setError(`请求失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const insertResult = () => {
    if (!editor || !result) return;
    editor.chain().focus().insertContent(result).run();
    setShowResult(false);
    setVisible(false);
  };

  if (!visible && !showResult) return null;

  return (
    <>
      {/* Floating action bar */}
      {visible && !showResult && (
        <div
          className="fixed z-40 flex items-center gap-0.5 px-1.5 py-1 bg-surface border border-border rounded-lg shadow-lg text-xs"
          style={{
            left: position.x,
            top: position.y - 36,
            transform: "translate(-50%, -100%)",
          }}
        >
          {(Object.keys(ACTION_LABELS) as AiAction[]).map((action) => (
            <button
              key={action}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction(action);
              }}
              disabled={loading}
              className="px-2 py-0.5 rounded hover:bg-accent hover:text-white text-text-primary border border-border disabled:opacity-50 whitespace-nowrap"
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      )}

      {/* Result panel */}
      {showResult && (
        <div
          ref={resultRef}
          className="fixed z-40 w-72 max-h-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
          style={{ left: position.x - 144, top: position.y }}
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-surface-alt text-xs">
            <span>AI 生成结果</span>
            <button
              onClick={() => setShowResult(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              ✕
            </button>
          </div>
          <div className="p-2 overflow-y-auto max-h-52 text-sm text-text-primary whitespace-pre-wrap">
            {loading ? (
              <span className="text-text-secondary">生成中...</span>
            ) : error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              result
            )}
          </div>
          {result && (
            <div className="flex gap-1 px-2 pb-2">
              <button
                onClick={insertResult}
                className="flex-1 px-2 py-1 text-xs bg-accent text-white rounded hover:opacity-90"
              >
                插入编辑
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result).catch(() => {});
                }}
                className="px-2 py-1 text-xs border border-border rounded hover:bg-surface-alt text-text-primary"
              >
                复制
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
