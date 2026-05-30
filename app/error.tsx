"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center text-white px-6">
      <div className="text-center max-w-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-red-900/50 bg-red-950/30">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-base font-bold mb-1">Something went wrong</h2>
        <p className="text-[#4e4e63] text-sm mb-6">
          {error.message || "An unexpected error occurred. Try refreshing or going back to the dashboard."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg border border-[#1e1e2e] bg-[#111118] px-4 py-2 text-sm text-white hover:border-[#00fff9]/40 hover:text-[#00fff9] transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-[#00fff9]/30 bg-[#00fff9]/10 px-4 py-2 text-sm text-[#00fff9] hover:bg-[#00fff9]/20 transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
