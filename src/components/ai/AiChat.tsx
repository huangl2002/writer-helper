import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../stores/appStore";
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

export function AiChat() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [action, setAction] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.getDefaultAiConfig().then((cfg) => {
      if (cfg) {
        db.getAiConfigDecrypted(cfg.id).then(setConfig).catch(() => setConfig(cfg));
      }
    }).catch(console.error);
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
          stream: false,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "(无响应)";

      setMessages((prev) => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: reply },
      ]);
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
        <p className="text-xs mb-4">需要 OpenAI 兼容接口（支持 DeepSeek、通义千问等）</p>
        <button
          onClick={() => useAppStore.getState().setActiveWork(null as any)}
          className="text-sm px-3 py-1 bg-accent text-white rounded hover:opacity-90"
        >
          前往配置
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action selector */}
      <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-border bg-surface-alt">
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
