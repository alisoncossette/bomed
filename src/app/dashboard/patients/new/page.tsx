'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Practitioner { id: string; name: string; }

export default function NewPatientPage() {
  const router = useRouter();
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', handle: '', email: '', phone: '', practitionerId: '' });

  useEffect(() => {
    fetch('/api/practices')
      .then((r) => r.json())
      .then((res) => {
        const practices = res.data || res;
        if (practices.length > 0) {
          setPracticeId(practices[0].id);
          return fetch(`/api/practitioners?practiceId=${practices[0].id}`).then((r) => r.json());
        }
        return { data: [] };
      })
      .then((res) => setPractitioners(res.data || res));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, practiceId }),
    });

    if (res.ok) {
      router.push('/dashboard/patients');
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to add patient');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Add Patient</h1>
      <p className="text-[#888] text-sm mb-8">Register a new patient at your practice.</p>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">{error}</div>
        )}
        <div>
          <label className="block text-xs text-[#888] mb-1">Full Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-teal-500"
            placeholder="Jane Doe"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">Bolo Handle (optional)</label>
          <div className="flex items-center rounded-lg border border-[#222] bg-[#111] overflow-hidden focus-within:border-teal-500">
            <span className="px-3 text-sm text-[#555]">@</span>
            <input
              value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') })}
              className="flex-1 bg-transparent px-1 py-2 text-sm text-[#f0f0f0] outline-none"
              placeholder="jane.doe"
            />
          </div>
          <p className="mt-1 text-xs text-[#555]">If the patient has a Bolo handle, they can receive appointment requests via their agent.</p>
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-teal-500"
            placeholder="jane@email.com"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">Phone (optional)</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-teal-500"
            placeholder="(555) 123-4567"
          />
        </div>
        {practitioners.length > 0 && (
          <div>
            <label className="block text-xs text-[#888] mb-1">Assign Primary Practitioner</label>
            <select
              value={form.practitionerId}
              onChange={(e) => setForm({ ...form, practitionerId: e.target.value })}
              className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-teal-500"
            >
              <option value="">No primary practitioner</option>
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Patient'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-[#222] px-6 py-2 text-sm text-[#888] hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}