import { useState, useRef, useEffect } from "react";
import type { AiConfig } from "../../types";
import * as db from "../../lib/db";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const ACTIONS: { key: string; label: string; systemPrompt: string }[] = [
  {
    key: "continue",
    label: "续写",
    systemPrompt: "你是一位专业的小说作家。根据用户提供的上文，自然流畅地续写下一段内容。保持一致的文风、语气和角色性格。只返回续写内容，不要附加解释。",
  },
  {
    key: "polish",
    label: "润色",
    systemPrompt: "你是一位文字编辑。优化用户提供的文本，使其表达更流畅、更有文采，但保持原意不变。只返回润色后的文本。",
  },
  {
    key: "expand",
    label: "扩写",
    systemPrompt: "你是一位小说作家。将用户提供的段落进行扩写，增加细节描写、心理活动、环境渲染等，使内容更加丰富。保持原有风格。只返回扩写后的内容。",
  },
  {
    key: "condense",
    label: "缩写",
    systemPrompt: "将用户提供的文本进行精简缩写，保留核心情节和关键信息，去除冗余描述。只返回缩写后的文本。",
  },
  {
    key: "chat",
    label: "自由对话",
    systemPrompt: "你是一位专业的写作顾问，帮助用户解决写作中的问题，讨论剧情走向、角色塑造等创作话题。",
  },
];

import type { Page } from "../layout/HomePage";
interface Props { onNavigate?: (page: Page) => void }
export function AiChat({ onNavigate }: Props) {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [action, setAction] = useState("chat");
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load persisted messages
    try {
      const saved = localStorage.getItem("aiwriter_chat_messages");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist messages when loading completes (not on every streaming chunk)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      try {
        if (messages.length > 0) {
          localStorage.setItem("aiwriter_chat_messages", JSON.stringify(messages.slice(-100)));
        }
      } catch {}
    }, 3000);
    return () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current); };
  }, [messages]);

  // Clear chat history
  const clearMessages = () => {
    setMessages([]);
    try { localStorage.removeItem("aiwriter_chat_messages"); } catch {}
  };

  useEffect(() => {
    // Try to load available config — use default, or fallback to any
    db.getDefaultAiConfig().then((cfg) => {
      if (cfg) {
        // Found default config, try to decrypt
        db.getAiConfigDecrypted(cfg.id)
          .then((decrypted) => {
            setConfig(decrypted);
            setConfigError("");
          })
          .catch(() => {
            setConfigError("无法解密 API Key，加密密钥可能已变更，请重新配置 API Key");
          });
      } else {
        // No default config set — check if any configs exist
        db.listAiConfigs().then((all) => {
          if (all.length > 0) {
            setConfigError("已配置但未设为默认，请在 AI 配置中点击 ⭐ 设置默认");
          }
        }).catch(() => {});
      }
    }).catch((e) => {
      console.error("Failed to load AI config:", e);
      setConfigError("加载 AI 配置失败，请重试");
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const callAi = async (userMessage: string, sysPrompt: string) => {
    if (!config) {
      setError("请先在 AI 配置中添加 API");
      return;
    }

    const apiMessages = [
      { role: "system", content: sysPrompt },
      ...messages,
      { role: "user", content: userMessage },
    ];

    setLoading(true);
    setError("");
    // Add user message and empty assistant placeholder for streaming
    const userMsg: Message = { role: "user", content: userMessage };
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch(config.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.api_key_encrypted}`,
        },
        body: JSON.stringify({
          model: config.model_name,
          messages: apiMessages,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        // Remove placeholder on error
        setMessages((prev) => prev.slice(0, -2));
        throw new Error(`${res.status}: ${errText.slice(0, 200)}`);
      }

      // Read streaming response
      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => prev.slice(0, -2));
        throw new Error("浏览器不支持流式读取");
      }

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              // Update the last assistant message in-place
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullContent,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      if (!fullContent) {
        setMessages((prev) => prev.slice(0, -2));
        setError("AI 未返回内容，请检查 API 配置");
      }
    } catch (e: any) {
      setError(`请求失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const actionCfg = ACTIONS.find((a) => a.key === action);
    if (!actionCfg) return;
    await callAi(input, actionCfg.systemPrompt);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!config) {
    return (
      <div className="flex flex-col h-full p-4 items-center justify-center text-sm text-text-secondary">
        <p className="mb-2">未配置 AI 服务</p>
        {configError && (
          <p className="text-xs text-red-500 mb-2">{configError}</p>
        )}
        <p className="text-xs mb-4">需要 OpenAI 兼容接口（支持 DeepSeek、通义千问等）</p>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate?.("ai_settings")}
            className="text-sm px-3 py-1 bg-accent text-white rounded hover:opacity-90"
          >
            前往配置
          </button>
          <button
            onClick={() => {
              setConfigError("");
              db.getDefaultAiConfig().then((cfg) => {
                if (cfg) {
                  db.getAiConfigDecrypted(cfg.id).then((d) => {
                    setConfig(d);
                    setConfigError("");
                  }).catch(() => setConfigError("解密失败"));
                } else {
                  setConfigError("未找到默认配置");
                }
              }).catch(() => setConfigError("加载失败"));
            }}
            className="text-sm px-3 py-1 border border-border rounded hover:bg-surface text-text-primary"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action selector */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border bg-surface-alt">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            onClick={() => {
              setAction(a.key);
              setMessages([]);
              setError("");
            }}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              action === a.key
                ? "bg-accent text-white"
                : "hover:bg-surface text-text-primary border border-border"
            }`}
          >
            {a.label}
          </button>
        ))}
        <div className="flex-1" />
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs px-1.5 py-0.5 border border-border rounded text-text-secondary hover:text-red-500 hover:border-red-300"
            title="清除对话历史"
          >
            清除
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-text-secondary text-center py-8">
            {ACTIONS.find((a) => a.key === action)?.systemPrompt.slice(0, 60)}...
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${
              msg.role === "user"
                ? "bg-accent/10 text-text-primary ml-auto"
                : "bg-surface-alt text-text-primary"
            }`}
          >
            <div className="text-xs text-text-secondary mb-0.5">
              {msg.role === "user" ? "你" : "AI"}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
            {msg.role === "assistant" && action !== "chat" && (
              <button
                onClick={() => {
                  // Copy to clipboard or insert into editor
                  navigator.clipboard.writeText(msg.content).catch(() => {});
                }}
                className="text-xs mt-1 text-accent hover:underline"
              >
                复制内容
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-sm text-text-secondary px-3 py-2">AI 思考中...</div>
        )}
        {error && (
          <div className="text-sm text-red-500 px-3 py-2 bg-red-50 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            action === "chat"
              ? "讨论写作话题... (Enter 发送)"
              : "输入文本或上文... (Enter 发送)"
          }
          className="w-full text-sm px-2 py-1 bg-surface border border-border rounded text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none resize-none h-16"
          disabled={loading}
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-text-secondary">
            {config.name} · {config.model_name}
          </span>
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="text-xs px-3 py-1 bg-accent text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
