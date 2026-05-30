import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/appStore";
import { CharacterCard } from "./CharacterCard";
import { CharacterForm } from "./CharacterForm";
import { useModal } from "../common/Modal";
import type { Character, CharacterRelation } from "../../types";
import * as db from "../../lib/db";

export function CharacterList() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relations, setRelations] = useState<CharacterRelation[]>([]);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { modalConfirm } = useModal();

  useEffect(() => {
    if (!activeWorkId) return;
    db.listCharacters(activeWorkId).then(setCharacters).catch(console.error);
    db.listRelations(activeWorkId).then(setRelations).catch(console.error);
  }, [activeWorkId]);

  const refresh = async () => {
    if (!activeWorkId) return;
    const [chars, rels] = await Promise.all([
      db.listCharacters(activeWorkId),
      db.listRelations(activeWorkId),
    ]);
    setCharacters(chars);
    setRelations(rels);
  };

  const handleDelete = async (id: string) => {
    const ok = await modalConfirm("确定删除此角色？相关关系也将删除。");
    if (!ok) return;
    await db.deleteCharacter(id);
    await refresh();
  };

  const handleAddRelation = async (charId: string, targetId: string, type: string) => {
    if (!activeWorkId) return;
    await db.createRelation(activeWorkId, charId, targetId, type, "");
    await refresh();
  };

  const handleDeleteRelation = async (relId: string) => {
    await db.deleteRelation(relId);
    await refresh();
  };

  if (!activeWorkId) {
    return (
      <div className="p-3 text-sm text-text-secondary">
        请先选择作品
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          角色 ({characters.length})
        </h2>
        <button
          onClick={() => {
            setEditingChar(null);
            setShowForm(true);
          }}
          className="text-xs px-2 py-1 bg-accent text-white rounded hover:opacity-90"
        >
          + 新建角色
        </button>
      </div>

      {showForm && (
        <div className="border border-border rounded-lg bg-surface-alt">
          <CharacterForm
            character={editingChar}
            workId={activeWorkId}
            onSave={async () => {
              await refresh();
              setShowForm(false);
              setEditingChar(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingChar(null);
            }}
          />
        </div>
      )}

      {characters.length === 0 && !showForm ? (
        <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">
          点击「新建角色」创建第一个角色
        </div>
      ) : (
        characters.map((ch) => (
          <CharacterCard
            key={ch.id}
            character={ch}
            relations={relations}
            characters={characters}
            onEdit={() => {
              setEditingChar(ch);
              setShowForm(true);
            }}
            onDelete={() => handleDelete(ch.id)}
            onAddRelation={(charId, targetId, type) => handleAddRelation(charId, targetId, type)}
            onDeleteRelation={handleDeleteRelation}
          />
        ))
      )}
    </div>
  );
}
