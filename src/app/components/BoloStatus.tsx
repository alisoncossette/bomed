'use client';

import { useEffect, useState } from 'react';

type Status = 'checking' | 'connected' | 'error';

export default function BoloStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [practice, setPractice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/relay/inbox')
      .then((r) => {
        if (r.ok) {
          setStatus('connected');
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));

    fetch('/api/practices')
      .then((r) => r.json())
      .then((data) => {
        if (data[0]?.handle) setPractice(`@${data[0].handle}`);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            status === 'connected'
              ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]'
              : status === 'error'
              ? 'bg-red-400'
              : 'bg-yellow-400 animate-pulse'
          }`}
        />
        <span className="text-[#888]">Bolo</span>
      </div>
      {status === 'connected' && (
        <span className="text-green-400 text-xs font-medium">Connected</span>
      )}
      {status === 'error' && (
        <span className="text-red-400 text-xs">Disconnected</span>
      )}
      {status === 'checking' && (
        <span className="text-yellow-400 text-xs">Checking...</span>
      )}
      {practice && (
        <span className="text-teal-400 text-xs ml-auto">{practice}</span>
      )}
    </div>
  );
}
