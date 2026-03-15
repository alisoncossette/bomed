import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4 text-zinc-700 font-bold">404</div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-sm text-zinc-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-500 transition inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
