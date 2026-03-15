'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Practitioner { id: string; name: string; specialty: string | null; }
interface Patient { id: string; name: string; handle: string | null; }

export default function SchedulePage() {
  const router = useRouter();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    practitionerId: '',
    patientId: '',
    date: '',
    time: '',
    duration: '30',
    type: 'PT_SESSION',
    notes: '',
    recurring: false,
    recurringWeeks: '4',
  });

  useEffect(() => {
    fetch('/api/practices')
      .then((r) => r.json())
      .then((res) => {
        const practices = res.data || res;
        if (practices.length > 0) {
          setPracticeId(practices[0].id);
          return Promise.all([
            fetch(`/api/practitioners?practiceId=${practices[0].id}`).then((r) => r.json()),
            fetch(`/api/patients?practiceId=${practices[0].id}`).then((r) => r.json()),
          ]);
        }
        return null;
      })
      .then((results) => {
        if (results) {
          setPractitioners(results[0].data || results[0]);
          setPatients(results[1].data || results[1]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) return;
    setSubmitting(true);
    setError('');

    const dateTime = new Date(`${form.date}T${form.time}`).toISOString();

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        practiceId,
        practitionerId: form.practitionerId,
        patientId: form.patientId,
        dateTime,
        duration: parseInt(form.duration),
        type: form.type,
        notes: form.notes || undefined,
        recurring: form.recurring,
        recurringWeeks: form.recurring ? parseInt(form.recurringWeeks) : undefined,
      }),
    });

    if (res.ok) {
      router.push('/dashboard/appointments');
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to schedule appointment');
    }
    setSubmitting(false);
  };

  if (loading) return <p className="text-sm text-zinc-500">Loading...</p>;

  const needsSetup = practitioners.length === 0 || patients.length === 0;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Schedule Appointment</h1>
      <p className="mb-8 text-sm text-zinc-500">Create a new appointment request</p>

      {needsSetup ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-sm text-zinc-400">
            You need at least one practitioner and one patient before scheduling.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            {practitioners.length === 0 && (
              <a href="/dashboard/practitioners" className="text-sm text-teal-400 hover:underline">Add Practitioner</a>
            )}
            {patients.length === 0 && (
              <a href="/dashboard/patients" className="text-sm text-teal-400 hover:underline">Add Patient</a>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Practitioner</label>
              <select
                value={form.practitionerId}
                onChange={(e) => setForm({ ...form, practitionerId: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500"
                required
              >
                <option value="">Select...</option>
                {practitioners.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` (${p.specialty})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Patient</label>
              <select
                value={form.patientId}
                onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500"
                required
              >
                <option value="">Select...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.handle ? ` (@${p.handle})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Duration (min)</label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500"
              >
                <option value="PT_SESSION">PT Session</option>
                <option value="EVALUATION">Evaluation</option>
                <option value="FOLLOW_UP">Follow-Up</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-teal-500 focus:ring-teal-500"
                />
                Weekly recurring
              </label>
              {form.recurring && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={form.recurringWeeks}
                    onChange={(e) => setForm({ ...form, recurringWeeks: e.target.value })}
                    className="w-16 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-teal-500"
                  />
                  <span className="text-xs text-zinc-500">weeks</span>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-zinc-400">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500 disabled:opacity-50"
          >
            {submitting ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
        </form>
      )}
    </div>
  );
}
