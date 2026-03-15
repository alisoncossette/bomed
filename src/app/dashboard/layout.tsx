'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/patients', label: 'Patients' },
  { href: '/dashboard/practitioners', label: 'Practitioners' },
  { href: '/dashboard/appointments', label: 'Appointments' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0]">
      <nav className="border-b border-[#1a1a1a] px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 120 120" fill="none">
              <path d="M60 8 L108 28 V72 Q108 108 60 118 Q12 108 12 72 V28 Z"
                stroke="#00c9a7" strokeWidth="3" fill="rgba(0,201,167,0.04)"/>
              <rect x="48" y="38" width="24" height="44" rx="3" fill="rgba(0,201,167,0.15)" stroke="#00c9a7" strokeWidth="2"/>
              <rect x="38" y="48" width="44" height="24" rx="3" fill="rgba(0,201,167,0.15)" stroke="#00c9a7" strokeWidth="2"/>
            </svg>
            <span className="text-lg font-bold">BoMed</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition ${isActive(link.href) ? 'text-white font-medium' : 'text-[#888] hover:text-white'}`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/dashboard/schedule" className="text-teal-400 hover:text-teal-300 transition font-medium">
              + Schedule
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 text-zinc-400 hover:text-white"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              {menuOpen ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="sm:hidden mt-4 pb-2 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2 px-2 rounded text-sm transition ${isActive(link.href) ? 'text-white bg-zinc-800' : 'text-[#888] hover:text-white'}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard/schedule"
              onClick={() => setMenuOpen(false)}
              className="block py-2 px-2 rounded text-sm text-teal-400 hover:text-teal-300 font-medium"
            >
              + Schedule
            </Link>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
