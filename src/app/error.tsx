'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4 text-red-400/60">!</div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-zinc-500 mb-6">{error.message || 'An unexpected error occurred.'}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-500 transition"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-6 py-2 text-sm text-zinc-400 hover:text-white transition"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
