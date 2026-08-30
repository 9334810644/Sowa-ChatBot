import MayaAssistant from "./components/MayaAssistant";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      <ErrorBoundary>
        <MayaAssistant />
      </ErrorBoundary>
    </div>
  );
}
