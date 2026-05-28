import { useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: false;
  onClick: () => void;
}

interface SeparatorItem {
  separator: true;
}

export type ContextMenuItem = MenuItem | SeparatorItem;

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 32);

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[140px] bg-surface border border-border rounded shadow-lg py-1 text-sm"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 border-t border-border" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-4 ${
              item.disabled
                ? "text-text-secondary/50 cursor-not-allowed"
                : item.danger
                  ? "hover:bg-red-50 hover:text-red-600"
                  : "hover:bg-surface-alt text-text-primary"
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-text-secondary">{item.shortcut}</span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
