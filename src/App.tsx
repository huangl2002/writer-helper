import { useEffect, useState } from "react";
import { useAppStore } from "./stores/appStore";
import { MainLayout } from "./components/layout/MainLayout";
import { ToastContainer } from "./components/common/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ModalProvider } from "./components/common/Modal";
import { QuickSearch } from "./components/common/QuickSearch";
import * as db from "./lib/db";

function App() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [showSearch, setShowSearch] = useState(false);

  // Restore persisted theme on startup
  useEffect(() => {
    db.getSetting("theme").then((v) => {
      if (v === "light" || v === "dark" || v === "eye-care") {
        setTheme(v);
      }
    }).catch(() => {});
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <ErrorBoundary>
      <ModalProvider>
        <div data-theme={theme} className="h-screen w-screen overflow-hidden">
          <MainLayout />
          <ToastContainer />
          <QuickSearch visible={showSearch} onClose={() => setShowSearch(false)} />
        </div>
      </ModalProvider>
    </ErrorBoundary>
  );
}

export default App;
