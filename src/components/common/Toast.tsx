import { useAppStore } from "../../stores/appStore";

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const colors = {
          success: "bg-green-600 text-white",
          error: "bg-red-600 text-white",
          info: "bg-accent text-white",
        };
        return (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-sm pointer-events-auto cursor-pointer ${colors[t.type]}`}
            onClick={() => removeToast(t.id)}
          >
            {t.text}
          </div>
        );
      })}
    </div>
  );
}
