import { useState } from "react";
import type { Character } from "../../types";
import * as db from "../../lib/db";

interface Props {
  character: Character | null;
  workId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function CharacterForm({ character, workId, onSave, onCancel }: Props) {
  const [name, setName] = useState(character?.name ?? "");
  const [gender, setGender] = useState(character?.gender ?? "");
  const [aliases, setAliases] = useState(
    character?.aliases ? JSON.parse(character.aliases).join("、") : "",
  );
  const [appearance, setAppearance] = useState(character?.appearance ?? "");
  const [personality, setPersonality] = useState(character?.personality ?? "");
  const [background, setBackground] = useState(character?.background ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const aliasesArr = aliases
      .split(/[,，、]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    const customAttrs = character?.custom_attrs ?? "{}";

    try {
      if (character) {
        await db.updateCharacter(
          character.id,
          name.trim(),
          JSON.stringify(aliasesArr),
          gender,
          appearance,
          personality,
          background,
          customAttrs,
        );
      } else {
        const created = await db.createCharacter(workId, name.trim());
        await db.updateCharacter(
          created.id,
          name.trim(),
          JSON.stringify(aliasesArr),
          gender,
          appearance,
          personality,
          background,
          customAttrs,
        );
      }
      onSave();
    } catch (e) {
      console.error("Save character failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-2 py-1 text-sm bg-surface border border-border rounded text-text-primary focus:border-accent focus:outline-none";
  const labelClass = "text-xs text-text-secondary";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div>
        <label className={labelClass}>姓名 *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="角色姓名"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>性别</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={inputClass}
          >
            <option value="">未知</option>
            <option value="男">男</option>
            <option value="女">女</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div className="flex-1">
          <label className={labelClass}>别名（逗号分隔）</label>
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            className={inputClass}
            placeholder="别名、称号"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>外貌描述</label>
        <textarea
          value={appearance}
          onChange={(e) => setAppearance(e.target.value)}
          className={`${inputClass} h-16 resize-none`}
          placeholder="外貌、着装等"
        />
      </div>
      <div>
        <label className={labelClass}>性格描述</label>
        <textarea
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className={`${inputClass} h-16 resize-none`}
          placeholder="性格特点"
        />
      </div>
      <div>
        <label className={labelClass}>背景故事</label>
        <textarea
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          className={`${inputClass} h-20 resize-none`}
          placeholder="角色背景、身世"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 px-3 py-1.5 text-sm bg-accent text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-surface-alt text-text-primary"
        >
          取消
        </button>
      </div>
    </form>
  );
}
