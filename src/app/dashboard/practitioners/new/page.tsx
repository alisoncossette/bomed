'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPractitionerPage() {
  const router = useRouter();
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', handle: '', email: '', specialty: '' });

  useEffect(() => {
    fetch('/api/practices')
      .then((r) => r.json())
      .then((res) => {
        const practices = res.data || res;
        if (practices.length > 0) setPracticeId(practices[0].id);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/practitioners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, practiceId }),
    });

    if (res.ok) {
      router.push('/dashboard/practitioners');
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create practitioner');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Add Practitioner</h1>
      <p className="text-[#888] text-sm mb-8">Add a new practitioner to your practice.</p>

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
            placeholder="Dr. Sarah Johnson"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">Bolo Handle</label>
          <div className="flex items-center rounded-lg border border-[#222] bg-[#111] overflow-hidden focus-within:border-teal-500">
            <span className="px-3 text-sm text-[#555]">@</span>
            <input
              value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') })}
              className="flex-1 bg-transparent px-1 py-2 text-sm text-[#f0f0f0] outline-none"
              placeholder="dr.johnson"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-teal-500"
            placeholder="sarah@acmept.com"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">Specialty</label>
          <select
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            className="w-full rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-teal-500"
          >
            <option value="">Select specialty...</option>
            <option value="PT">Physical Therapy</option>
            <option value="Athletic Training">Athletic Training</option>
            <option value="OT">Occupational Therapy</option>
            <option value="Sports Medicine">Sports Medicine</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Practitioner'}
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