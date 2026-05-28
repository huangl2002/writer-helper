import { useEffect, useState } from "react";
import type { AiConfig, AiConfigInput } from "../../types";
import * as db from "../../lib/db";

const PROVIDER_TEMPLATES: { name: string; url: string; model: string }[] = [
  { name: "OpenAI", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o" },
  { name: "DeepSeek", url: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
  { name: "通义千问", url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", model: "qwen-plus" },
  { name: "Kimi (Moonshot)", url: "https://api.moonshot.cn/v1/chat/completions", model: "moonshot-v1-8k" },
  { name: "Ollama (本地)", url: "http://localhost:11434/v1/chat/completions", model: "llama3" },
  { name: "自定义", url: "", model: "" },
];

export function AiSettings() {
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    api_url: "",
    api_key: "",
    model_name: "gpt-4o",
    temperature: 0.7,
    max_tokens: 4096,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    db.listAiConfigs().then(setConfigs).catch(console.error);
  }, []);

  const refresh = () => db.listAiConfigs().then(setConfigs).catch(console.error);

  const handleSave = async () => {
    if (!form.name || !form.api_url || !form.api_key || !form.model_name) {
      setMsg("请填写所有必填项");
      return;
    }
    try {
      const input: AiConfigInput = { ...form };
      if (editId) {
        await db.updateAiConfig(editId, input);
      } else {
        await db.createAiConfig(input);
      }
      setEditing(false);
      setEditId(null);
      setMsg("");
      await refresh();
    } catch (e: any) {
      setMsg(`保存失败: ${e}`);
    }
  };

  const handleEdit = async (cfg: AiConfig) => {
    try {
      const decrypted = await db.getAiConfigDecrypted(cfg.id);
      setForm({
        name: decrypted.name,
        api_url: decrypted.api_url,
        api_key: decrypted.api_key_encrypted, // now decrypted
        model_name: decrypted.model_name,
        temperature: decrypted.temperature,
        max_tokens: decrypted.max_tokens,
      });
      setEditId(cfg.id);
      setEditing(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("删除此配置？")) return;
    await db.deleteAiConfig(id);
    await refresh();
  };

  const handleSetDefault = async (id: string) => {
    await db.setDefaultAiConfig(id);
    await refresh();
  };

  const applyTemplate = (tpl: (typeof PROVIDER_TEMPLATES)[0]) => {
    setForm({
      ...form,
      name: tpl.name !== "自定义" ? tpl.name : "",
      api_url: tpl.url,
      model_name: tpl.model,
    });
  };

  const inp =
    "w-full px-2 py-1 text-sm bg-surface border border-border rounded text-text-primary focus:border-accent focus:outline-none";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">AI 配置</h1>
        <button
          onClick={() => { setEditing(true); setEditId(null); setForm({ name: "", api_url: "", api_key: "", model_name: "gpt-4o", temperature: 0.7, max_tokens: 4096 }); }}
          className="text-sm px-3 py-1 bg-accent text-white rounded hover:opacity-90"
        >
          + 添加配置
        </button>
      </div>

      {msg && (
        <div className="text-sm px-3 py-2 bg-surface-alt rounded text-center text-text-secondary">
          {msg}
        </div>
      )}

      {editing ? (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-surface-alt">
          <h2 className="font-semibold text-text-primary">
            {editId ? "编辑配置" : "新建配置"}
          </h2>

          {/* Provider templates */}
          <div className="flex flex-wrap gap-1">
            {PROVIDER_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => applyTemplate(tpl)}
                className="text-xs px-2 py-1 border border-border rounded hover:bg-surface text-text-primary"
              >
                {tpl.name}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-text-secondary">配置名称 *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="如: DeepSeek、OpenAI" />
          </div>
          <div>
            <label className="text-xs text-text-secondary">API 地址 *</label>
            <input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} className={inp} placeholder="https://api.openai.com/v1/chat/completions" />
          </div>
          <div>
            <label className="text-xs text-text-secondary">API Key *</label>
            <input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} className={inp} type="password" placeholder="sk-..." />
            <p className="text-xs text-text-secondary mt-0.5">Key 经加密后存储于本地数据库</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-text-secondary">模型 *</label>
              <input value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} className={inp} placeholder="gpt-4o" />
            </div>
            <div className="w-20">
              <label className="text-xs text-text-secondary">温度</label>
              <input value={form.temperature} onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0.7 })} className={inp} type="number" min="0" max="2" step="0.1" />
            </div>
            <div className="w-24">
              <label className="text-xs text-text-secondary">最大Token</label>
              <input value={form.max_tokens} onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) || 4096 })} className={inp} type="number" min="1" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-1.5 text-sm bg-accent text-white rounded hover:opacity-90">
              保存
            </button>
            <button onClick={() => setEditing(false)} className="px-4 py-1.5 text-sm border border-border rounded hover:bg-surface text-text-primary">
              取消
            </button>
          </div>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          <p className="mb-2">尚未配置 AI 服务</p>
          <p className="text-xs">添加 OpenAI 兼容接口的服务商（支持 DeepSeek、通义千问、Kimi、Ollama 等）</p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((cfg) => (
            <div key={cfg.id} className="flex items-center gap-3 px-3 py-2 border border-border rounded-lg bg-surface">
              <span className="text-lg">{cfg.is_default ? "⭐" : "🔧"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">{cfg.name}</div>
                <div className="text-xs text-text-secondary truncate">{cfg.model_name} · {cfg.api_url}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!cfg.is_default && (
                  <button onClick={() => handleSetDefault(cfg.id)} className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-secondary" title="设为默认">
                    ⭐
                  </button>
                )}
                <button onClick={() => handleEdit(cfg)} className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-primary">
                  编辑
                </button>
                <button onClick={() => handleDelete(cfg.id)} className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-red-50 hover:text-red-500">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
