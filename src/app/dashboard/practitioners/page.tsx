'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DataView from '@/app/components/DataView';

type Practitioner = {
  id: string;
  name: string;
  handle: string;
  email: string;
  specialty: string | null;
  isActive: boolean;
  _count: { appointments: number; patients: number };
};

export default function PractitionersPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/practitioners')
      .then((r) => r.json())
      .then((res) => setPractitioners(res.data || res))
      .finally(() => setLoading(false));
  }, []);

  const handleDeactivate = async (practitioner: Practitioner) => {
    if (!confirm(`Deactivate ${practitioner.name}?`)) return;
    await fetch(`/api/practitioners/${practitioner.id}`, { method: 'DELETE' });
    setPractitioners((prev) => prev.filter((p) => p.id !== practitioner.id));
  };

  if (loading) {
    return <div className="text-[#555] text-sm py-8">Loading practitioners...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Practitioners</h1>
        <Link
          href="/dashboard/practitioners/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition"
        >
          + Add Practitioner
        </Link>
      </div>

      <DataView
        data={practitioners}
        keyExtractor={(p) => p.id}
        onDelete={handleDeactivate}
        deleteLabel="Deactivate"
        emptyMessage="No practitioners yet. Add your first practitioner to get started."
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (p) => (
              <Link href={`/dashboard/practitioners/${p.id}`} className="font-medium hover:text-teal-400 transition">
                {p.name}
              </Link>
            ),
          },
          {
            key: 'handle',
            label: 'Handle',
            render: (p) => <span className="text-teal-400">@{p.handle}</span>,
          },
          {
            key: 'email',
            label: 'Email',
            render: (p) => <span className="text-[#888]">{p.email}</span>,
          },
          {
            key: 'specialty',
            label: 'Specialty',
            render: (p) => p.specialty || <span className="text-[#555]">--</span>,
            filterFn: (p, v) => (p.specialty || '').toLowerCase().includes(v.toLowerCase()),
          },
          {
            key: 'patients',
            label: 'Patients',
            render: (p) => <span className="text-[#888]">{p._count.patients}</span>,
          },
          {
            key: 'appointments',
            label: 'Appts',
            render: (p) => <span className="text-[#888]">{p._count.appointments}</span>,
          },
          {
            key: 'status',
            label: 'Status',
            render: (p) =>
              p.isActive ? (
                <span className="text-green-400 text-xs font-medium">Active</span>
              ) : (
                <span className="text-red-400 text-xs">Inactive</span>
              ),
            filterFn: (p, v) => {
              const status = p.isActive ? 'active' : 'inactive';
              return status.includes(v.toLowerCase());
            },
          },
        ]}
        cardRender={(p) => (
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-4">
            <div className="font-medium mb-1">{p.name}</div>
            <div className="text-teal-400 text-sm mb-1">@{p.handle}</div>
            {p.specialty && <div className="text-xs text-[#888] mb-3">{p.specialty}</div>}
            <div className="text-[#888] text-xs mb-3">{p.email}</div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#555]">{p._count.patients} patients</span>
              <span className="text-[#555]">{p._count.appointments} appts</span>
            </div>
            <div className="mt-2">
              {p.isActive ? (
                <span className="text-green-400 text-xs font-medium">Active</span>
              ) : (
                <span className="text-red-400 text-xs">Inactive</span>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}