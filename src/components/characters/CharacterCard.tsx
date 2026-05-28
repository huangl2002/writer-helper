import { useState } from "react";
import type { Character, CharacterRelation } from "../../types";

interface Props {
  character: Character;
  relations: CharacterRelation[];
  characters: Character[];
  onEdit: () => void;
  onDelete: () => void;
  onAddRelation: (targetId: string, type: string) => void;
  onDeleteRelation: (relId: string) => void;
}

const RELATION_TYPES = ["朋友", "敌人", "恋人", "师徒", "家人", "其他"];

function parseAliases(aliases: string): string[] {
  try {
    const parsed = JSON.parse(aliases);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CharacterCard({
  character,
  relations,
  characters,
  onEdit,
  onDelete,
  onAddRelation,
  onDeleteRelation,
}: Props) {
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState("朋友");

  const aliases = parseAliases(character.aliases);
  const genderIcon = character.gender === "男" ? "♂" : character.gender === "女" ? "♀" : "";

  const charRelations = relations.filter(
    (r) => r.char_a_id === character.id || r.char_b_id === character.id,
  );

  const getRelatedCharName = (rel: CharacterRelation): string => {
    const otherId =
      rel.char_a_id === character.id ? rel.char_b_id : rel.char_a_id;
    return characters.find((c) => c.id === otherId)?.name ?? "(已删除)";
  };

  return (
    <div className="border border-border rounded-lg bg-surface p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">
            {genderIcon && <span className="mr-1">{genderIcon}</span>}
            {character.name}
          </h3>
          {aliases.length > 0 && (
            <p className="text-xs text-text-secondary">
              别名：{aliases.join("、")}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-primary"
          >
            编辑
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-red-50 hover:text-red-500 text-text-primary"
          >
            删除
          </button>
        </div>
      </div>

      {/* Details */}
      {character.appearance && (
        <div>
          <span className="text-xs text-text-secondary">外貌：</span>
          <span className="text-sm text-text-primary">{character.appearance}</span>
        </div>
      )}
      {character.personality && (
        <div>
          <span className="text-xs text-text-secondary">性格：</span>
          <span className="text-sm text-text-primary">{character.personality}</span>
        </div>
      )}
      {character.background && (
        <div>
          <span className="text-xs text-text-secondary">背景：</span>
          <span className="text-sm text-text-primary line-clamp-3">
            {character.background}
          </span>
        </div>
      )}

      {/* Relations */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-secondary">角色关系</span>
          <button
            onClick={() => setShowRelationForm(!showRelationForm)}
            className="text-xs px-1.5 border border-border rounded hover:bg-surface-alt text-text-primary"
          >
            + 关联
          </button>
        </div>

        {showRelationForm && (
          <div className="flex gap-1 mb-2">
            <select
              value={relTarget}
              onChange={(e) => setRelTarget(e.target.value)}
              className="flex-1 text-xs px-2 py-1 bg-surface border border-border rounded text-text-primary"
            >
              <option value="">选择角色</option>
              {characters
                .filter((c) => c.id !== character.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <select
              value={relType}
              onChange={(e) => setRelType(e.target.value)}
              className="text-xs px-2 py-1 bg-surface border border-border rounded text-text-primary"
            >
              {RELATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              disabled={!relTarget}
              onClick={() => {
                onAddRelation(relTarget, relType);
                setRelTarget("");
                setShowRelationForm(false);
              }}
              className="px-2 py-1 text-xs bg-accent text-white rounded disabled:opacity-50"
            >
              确认
            </button>
          </div>
        )}

        {charRelations.length === 0 ? (
          <p className="text-xs text-text-secondary">暂无关系</p>
        ) : (
          <div className="space-y-1">
            {charRelations.map((rel) => (
              <div
                key={rel.id}
                className="flex items-center justify-between text-xs px-2 py-0.5 bg-surface-alt rounded"
              >
                <span>
                  <span className="text-text-primary">
                    {getRelatedCharName(rel)}
                  </span>
                  <span className="text-text-secondary ml-1">
                    — {rel.relation_type}
                  </span>
                </span>
                <button
                  onClick={() => onDeleteRelation(rel.id)}
                  className="text-text-secondary hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
