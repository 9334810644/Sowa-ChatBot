import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0c] text-white p-6 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-5-5 5-5M2 3h20v18H2zM2 11h20M2 15h20"/></svg>
          </div>
          <h2 className="text-2xl font-serif mb-4">Sowa AI has encountered a neural glitch</h2>
          <p className="text-white/60 mb-8 max-w-md">
            The neural pathway crashed unexpectedly. This usually happens if there's a connection issue or an invalid API response.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left font-mono text-xs w-full max-w-xl overflow-auto max-h-48 text-red-400">
            {this.state.error?.toString()}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all active:scale-95 border border-white/20"
            >
              Clear Cache
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform active:scale-95"
            >
              Re-sync Sowa AI
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
