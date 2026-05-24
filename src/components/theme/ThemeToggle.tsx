import { useAppStore } from "../../stores/appStore";
import type { Theme } from "../../types";

const themes: { key: Theme; label: string; icon: string }[] = [
  { key: "light", label: "浅色", icon: "☀" },
  { key: "dark", label: "暗色", icon: "🌙" },
  { key: "eye-care", label: "护眼", icon: "👁" },
];

export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const cycle = () => {
    const idx = themes.findIndex((t) => t.key === theme);
    setTheme(themes[(idx + 1) % themes.length].key);
  };

  const current = themes.find((t) => t.key === theme)!;

  return (
    <button
      onClick={cycle}
      className="px-2 py-1 text-xs rounded border border-border hover:bg-surface-alt transition-colors"
      title={`当前: ${current.label}`}
    >
      {current.icon} {current.label}
    </button>
  );
}
