import { useAppStore } from "./stores/appStore";
import { AppLayout } from "./components/layout/AppLayout";

function App() {
  const theme = useAppStore((s) => s.theme);

  return (
    <div data-theme={theme} className="h-screen w-screen overflow-hidden">
      <AppLayout />
    </div>
  );
}

export default App;
