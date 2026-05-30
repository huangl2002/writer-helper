import { useEffect } from "react";
import { useAppStore } from "./stores/appStore";
import { MainLayout } from "./components/layout/MainLayout";
import { ToastContainer } from "./components/common/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ModalProvider } from "./components/common/Modal";
import * as db from "./lib/db";

function App() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Restore persisted theme on startup
  useEffect(() => {
    db.getSetting("theme").then((v) => {
      if (v === "light" || v === "dark" || v === "eye-care") {
        setTheme(v);
      }
    }).catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ModalProvider>
        <div data-theme={theme} className="h-screen w-screen overflow-hidden">
          <MainLayout />
          <ToastContainer />
        </div>
      </ModalProvider>
    </ErrorBoundary>
  );
}

export default App;
