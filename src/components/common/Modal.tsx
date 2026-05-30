import { useState, useCallback, createContext, useContext, type ReactNode } from "react";

interface ModalState {
  type: "prompt" | "confirm";
  title: string;
  defaultValue?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any) => void;
}

interface ModalContextValue {
  modalPrompt: (title: string, defaultValue?: string) => Promise<string | null>;
  modalConfirm: (title: string) => Promise<boolean>;
}

const ModalCtx = createContext<ModalContextValue | null>(null);

export function useModal() {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const modalPrompt = useCallback(
    (title: string, defaultValue = "") =>
      new Promise<string | null>((resolve) => {
        setModal({ type: "prompt", title, defaultValue, resolve });
      }),
    [],
  );

  const modalConfirm = useCallback(
    (title: string) =>
      new Promise<boolean>((resolve) => {
        setModal({ type: "confirm", title, resolve });
      }),
    [],
  );

  const close = (value: string | boolean | null) => {
    modal?.resolve(value);
    setModal(null);
  };

  return (
    <ModalCtx.Provider value={{ modalPrompt, modalConfirm }}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => close(null)}>
          <div
            className="bg-surface border border-border rounded-xl shadow-xl p-5 w-80 max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-text-primary mb-3">{modal.title}</p>
            {modal.type === "prompt" ? (
              <>
                <input
                  autoFocus
                  type="text"
                  defaultValue={modal.defaultValue}
                  className="w-full px-2 py-1 text-sm bg-surface-alt border border-border rounded text-text-primary focus:border-accent focus:outline-none mb-3"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") close((e.target as HTMLInputElement).value);
                    if (e.key === "Escape") close(null);
                  }}
                  id="modal-input"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => close(null)}
                    className="px-3 py-1 text-sm border border-border rounded hover:bg-surface-alt text-text-primary"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      const input = document.getElementById("modal-input") as HTMLInputElement;
                      close(input?.value || "");
                    }}
                    className="px-3 py-1 text-sm bg-accent text-white rounded hover:opacity-90"
                  >
                    确认
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => close(false)}
                  className="px-3 py-1 text-sm border border-border rounded hover:bg-surface-alt text-text-primary"
                >
                  取消
                </button>
                <button
                  onClick={() => close(true)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:opacity-90"
                >
                  确认
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalCtx.Provider>
  );
}
