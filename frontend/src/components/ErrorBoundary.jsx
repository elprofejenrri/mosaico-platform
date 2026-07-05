import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Mosaico UI error", { error, errorInfo });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-[#FBF7EE] px-6 py-24 text-[#1F3B6E]">
        <section className="mx-auto max-w-xl rounded-lg border border-[#EFE4D0] bg-white p-6 shadow-sm" role="alert" aria-live="assertive">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#FFF0E6] p-2 text-[#E8704C]">
              <AlertTriangle size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-2xl">Something went wrong</h1>
              <p className="mt-2 text-sm text-[#5C6680]">The page could not finish loading. Your data was not changed.</p>
            </div>
          </div>
          <Button className="mt-5 bg-[#1F3B6E] text-white" onClick={() => window.location.reload()}>Reload</Button>
        </section>
      </main>
    );
  }
}
