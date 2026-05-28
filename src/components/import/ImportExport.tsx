import { useState } from "react";
import { useAppStore } from "../../stores/appStore";
import * as db from "../../lib/db";

export function ImportExport() {
  const activeWorkId = useAppStore((s) => s.activeWorkId);
  const chapters = useAppStore((s) => s.chapters);
  const volumes = useAppStore((s) => s.volumes);
  const setVolumes = useAppStore((s) => s.setVolumes);
  const setChapters = useAppStore((s) => s.setChapters);
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importVolume, setImportVolume] = useState<string | null>(null);

  const pickAndExport = async (
    label: string,
    exportFn: (path: string) => Promise<string>,
  ) => {
    setExporting(label);
    try {
      // Use Tauri save dialog
      const { save } = await import("@tauri-apps/plugin-dialog");
      const ext = label.includes("Markdown") ? "md" : "txt";
      const filePath = await save({
        filters: [
          {
            name: label,
            extensions: [ext, "json"].filter(Boolean),
          },
        ],
      });
      if (filePath) {
        await exportFn(filePath);
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleExportChapter = async (chId: string, format: "txt" | "md") => {
    const ch = chapters.find((c) => c.id === chId);
    if (!ch) return;
    await pickAndExport(
      format === "md" ? "Markdown" : "TXT",
      (path) =>
        format === "md"
          ? db.exportChapterMd(chId, path)
          : db.exportChapterTxt(chId, path),
    );
  };

  const handleExportWork = async (format: "txt" | "md") => {
    if (!activeWorkId) return;
    await pickAndExport(
      format === "md" ? "Markdown" : "TXT",
      (path) =>
        format === "md"
          ? db.exportWorkMd(activeWorkId, path)
          : db.exportWorkTxt(activeWorkId, path),
    );
  };

  const handleExportOutlines = async () => {
    if (!activeWorkId) return;
    await pickAndExport("大纲 Markdown", (path) =>
      db.exportOutlinesMd(activeWorkId, path),
    );
  };

  const handleExportCharacters = async () => {
    if (!activeWorkId) return;
    await pickAndExport("角色 JSON", (path) =>
      db.exportCharactersJson(activeWorkId, path),
    );
  };

  const btnClass =
    "w-full text-left px-3 py-2 border border-border rounded text-sm hover:bg-surface-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const activeClass = `${btnClass} text-accent border-accent bg-accent/5`;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-xl font-bold text-text-primary mb-6">导入 / 导出</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Export section */}
        <section className="space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            📤 导出
          </h2>

          {/* Single chapter export */}
          <div className="space-y-1">
            <h3 className="text-xs text-text-secondary font-medium">单章导出</h3>
            {chapters.length === 0 ? (
              <p className="text-xs text-text-secondary px-3 py-2">暂无章节</p>
            ) : (
              chapters.slice(0, 10).map((ch) => (
                <div key={ch.id} className="flex items-center gap-1">
                  <span className="text-xs truncate flex-1 text-text-primary">
                    {ch.title}
                  </span>
                  <button
                    onClick={() => handleExportChapter(ch.id, "txt")}
                    disabled={exporting !== null}
                    className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-secondary shrink-0"
                  >
                    TXT
                  </button>
                  <button
                    onClick={() => handleExportChapter(ch.id, "md")}
                    disabled={exporting !== null}
                    className="text-xs px-1.5 py-0.5 border border-border rounded hover:bg-surface-alt text-text-secondary shrink-0"
                  >
                    MD
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <h3 className="text-xs text-text-secondary font-medium">全书导出</h3>
            <button
              onClick={() => handleExportWork("txt")}
              disabled={!activeWorkId || exporting !== null}
              className={
                exporting === "TXT" ? activeClass : btnClass
              }
            >
              {exporting === "TXT" ? "导出中..." : "导出全书 → TXT（纯文本）"}
            </button>
            <button
              onClick={() => handleExportWork("md")}
              disabled={!activeWorkId || exporting !== null}
              className={
                exporting === "Markdown" ? activeClass : btnClass
              }
            >
              {exporting === "Markdown" ? "导出中..." : "导出全书 → Markdown"}
            </button>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            <h3 className="text-xs text-text-secondary font-medium">其他导出</h3>
            <button
              onClick={handleExportOutlines}
              disabled={!activeWorkId || exporting !== null}
              className={btnClass}
            >
              导出大纲 → Markdown
            </button>
            <button
              onClick={handleExportCharacters}
              disabled={!activeWorkId || exporting !== null}
              className={btnClass}
            >
              导出角色 → JSON
            </button>
          </div>
        </section>

        {/* Import section */}
        <section className="space-y-3">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            📥 导入
          </h2>
          {!activeWorkId ? (
            <p className="text-xs text-text-secondary">请先在「码字台」中选择作品</p>
          ) : (
            <div className="space-y-2">
              {/* Volume selector */}
              <div>
                <label className="text-xs text-text-secondary">导入到</label>
                <select
                  value={importVolume ?? ""}
                  onChange={(e) => setImportVolume(e.target.value || null)}
                  className="w-full text-xs px-2 py-1 bg-surface border border-border rounded text-text-primary"
                >
                  <option value="">未分类（直接章节）</option>
                  {volumes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={async () => {
                  if (!activeWorkId) return;
                  setImporting(true);
                  setImportMsg("");
                  try {
                    const { open } = await import("@tauri-apps/plugin-dialog");
                    const filePath = await open({
                      filters: [{ name: "文本", extensions: ["txt"] }],
                      multiple: false,
                    });
                    if (filePath) {
                      const count = await db.importTxt(
                        activeWorkId,
                        importVolume,
                        filePath as string,
                      );
                      setImportMsg(`成功导入 ${count} 个章节`);
                      // Refresh chapters
                      const chs = await db.listChapters(activeWorkId, null);
                      setChapters(chs);
                      const vols = await db.listVolumes(activeWorkId);
                      setVolumes(vols);
                    }
                  } catch (e: any) {
                    setImportMsg(`导入失败: ${e}`);
                  } finally {
                    setImporting(false);
                  }
                }}
                disabled={importing}
                className={btnClass}
              >
                {importing ? "导入中..." : "TXT 文件导入（按章节标记自动拆分）"}
              </button>
              <button
                onClick={async () => {
                  if (!activeWorkId) return;
                  setImporting(true);
                  setImportMsg("");
                  try {
                    const { open } = await import("@tauri-apps/plugin-dialog");
                    const filePath = await open({
                      filters: [{ name: "Markdown", extensions: ["md"] }],
                      multiple: false,
                    });
                    if (filePath) {
                      const count = await db.importMd(
                        activeWorkId,
                        importVolume,
                        filePath as string,
                      );
                      setImportMsg(`成功导入 ${count} 个章节`);
                      const chs = await db.listChapters(activeWorkId, null);
                      setChapters(chs);
                    }
                  } catch (e: any) {
                    setImportMsg(`导入失败: ${e}`);
                  } finally {
                    setImporting(false);
                  }
                }}
                disabled={importing}
                className={btnClass}
              >
                {importing ? "导入中..." : "Markdown 文件导入（按 # 标题拆分）"}
              </button>
              <button
                onClick={async () => {
                  if (!activeWorkId) return;
                  setImporting(true);
                  setImportMsg("");
                  try {
                    const { open } = await import("@tauri-apps/plugin-dialog");
                    const folderPath = await open({
                      directory: true,
                      multiple: false,
                    });
                    if (folderPath) {
                      const count = await db.importFolder(
                        activeWorkId,
                        importVolume,
                        folderPath as string,
                      );
                      setImportMsg(`成功导入 ${count} 个文件`);
                      const chs = await db.listChapters(activeWorkId, null);
                      setChapters(chs);
                    }
                  } catch (e: any) {
                    setImportMsg(`导入失败: ${e}`);
                  } finally {
                    setImporting(false);
                  }
                }}
                disabled={importing}
                className={btnClass}
              >
                {importing ? "导入中..." : "文件夹批量导入（每个文件一个章节）"}
              </button>
              {importMsg && (
                <div className="text-xs p-2 bg-surface-alt rounded text-text-secondary">
                  {importMsg}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
