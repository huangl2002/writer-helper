import { useAppStore } from "./stores/appStore";
import { MainLayout } from "./components/layout/MainLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  const theme = useAppStore((s) => s.theme);

  return (
    <ErrorBoundary>
      <div data-theme={theme} className="h-screen w-screen overflow-hidden">
        <MainLayout />
      </div>
    </ErrorBoundary>
  );
}

export default App;
