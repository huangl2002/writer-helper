export function HelperPanel() {
  return (
    <div className="flex flex-col h-full p-3 gap-2">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
        辅助面板
      </h2>
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        后续功能将在此显示（大纲、角色、AI 对话等）
      </div>
    </div>
  );
}
