'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Practitioner { id: string; name: string; }
interface BoloLookup {
  exists: boolean;
  handle: string;
  name: string | null;
  email?: string;
}

export default function NewPatientPage() {
  const router = useRouter();
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [boloStatus, setBoloStatus] = useState<'idle' | 'found' | 'not-found' | 'error'>('idle');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    handle: '',
    email: '',
    phone: '',
    practitionerId: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    insuranceCarrier: '',
    insurancePlan: '',
    insuranceGroupNo: '',
    insuranceMemberId: '',
  });

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

  const handleBoloLookup = async () => {
    if (!form.handle) return;
    setLookingUp(true);
    setBoloStatus('idle');

    try {
      const res = await fetch(`/api/bolo/lookup?handle=${encodeURIComponent(form.handle)}`);
      const data: BoloLookup = await res.json();

      if (data.exists) {
        setBoloStatus('found');
        setForm((prev) => ({
          ...prev,
          name: data.name || prev.name,
        }));
      } else {
        setBoloStatus('not-found');
      }
    } catch {
      setBoloStatus('error');
    }
    setLookingUp(false);
  };

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

  const inputClass = "w-full rounded-lg border border-[#ddd] bg-white px-3 py-2 text-sm text-[#1a1a2e] outline-none focus:border-[#1a7a70] focus:ring-1 focus:ring-[#1a7a70]";
  const labelClass = "block text-xs font-medium text-[#555] mb-1";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-[#141440]">Add Patient</h1>
      <p className="text-[#888] text-sm mb-8">Enter a Bolo handle to auto-populate patient information.</p>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">{error}</div>
        )}

        {/* Bolo Handle Lookup — the key feature */}
        <div className="rounded-xl border-2 border-[#f0a030] bg-[#fffbf5] p-5">
          <label className="block text-sm font-semibold text-[#141440] mb-2">Bolo Handle</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center rounded-lg border border-[#ddd] bg-white overflow-hidden focus-within:border-[#1a7a70]">
              <span className="px-3 text-sm text-[#999]">@</span>
              <input
                value={form.handle}
                onChange={(e) => {
                  setForm({ ...form, handle: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() });
                  setBoloStatus('idle');
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBoloLookup(); } }}
                className="flex-1 bg-transparent px-1 py-2 text-sm text-[#1a1a2e] outline-none"
                placeholder="patient_handle"
              />
            </div>
            <button
              type="button"
              onClick={handleBoloLookup}
              disabled={!form.handle || lookingUp}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #141440, #1a7a70)' }}
            >
              {lookingUp ? 'Looking up...' : 'Lookup'}
            </button>
          </div>

          {boloStatus === 'found' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[#1a7a70]">
              <span>&#10003;</span>
              <span>Found <strong>@{form.handle}</strong> on Bolo — data auto-populated</span>
            </div>
          )}
          {boloStatus === 'not-found' && (
            <div className="mt-3 text-sm text-[#f0a030]">
              Handle not found on Bolo. You can still add the patient manually.
            </div>
          )}
          {boloStatus === 'error' && (
            <div className="mt-3 text-sm text-red-500">
              Could not connect to Bolo. Enter details manually.
            </div>
          )}

          <p className="mt-2 text-xs text-[#999]">
            When the patient grants access, their demographics and insurance auto-sync. No clipboard needed.
          </p>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#141440] mb-2">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Jane Doe" required />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="jane@email.com" required />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="(555) 123-4567" />
            </div>
            <div>
              <label className={labelClass}>Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#141440] mb-2">Demographics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} placeholder="123 Main St" />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} placeholder="San Francisco" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>State</label>
                <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} placeholder="CA" />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className={inputClass} placeholder="94105" />
              </div>
            </div>
          </div>

          <h4 className="text-xs font-semibold text-[#888] mt-4">Emergency Contact</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Name</label>
              <input value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} className={inputClass} placeholder="John Doe" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} className={inputClass} placeholder="(555) 987-6543" />
            </div>
            <div>
              <label className={labelClass}>Relationship</label>
              <input value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} className={inputClass} placeholder="Spouse" />
            </div>
          </div>
        </div>

        {/* Insurance */}
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[#141440]">Insurance</h3>
            {boloStatus === 'found' && (
              <span className="text-xs text-[#1a7a70] bg-[#e8f5f0] px-2 py-1 rounded-full">Auto-synced via Bolo</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Carrier</label>
              <input value={form.insuranceCarrier} onChange={(e) => setForm({ ...form, insuranceCarrier: e.target.value })} className={inputClass} placeholder="Blue Cross Blue Shield" />
            </div>
            <div>
              <label className={labelClass}>Plan</label>
              <input value={form.insurancePlan} onChange={(e) => setForm({ ...form, insurancePlan: e.target.value })} className={inputClass} placeholder="PPO Gold" />
            </div>
            <div>
              <label className={labelClass}>Group #</label>
              <input value={form.insuranceGroupNo} onChange={(e) => setForm({ ...form, insuranceGroupNo: e.target.value })} className={inputClass} placeholder="GRP-12345" />
            </div>
            <div>
              <label className={labelClass}>Member ID</label>
              <input value={form.insuranceMemberId} onChange={(e) => setForm({ ...form, insuranceMemberId: e.target.value })} className={inputClass} placeholder="XHR-9928471" />
            </div>
          </div>
        </div>

        {/* Practitioner Assignment */}
        {practitioners.length > 0 && (
          <div className="rounded-xl border border-[#e0e0e0] bg-white p-5">
            <label className="block text-sm font-semibold text-[#141440] mb-2">Assign Primary Practitioner</label>
            <select
              value={form.practitionerId}
              onChange={(e) => setForm({ ...form, practitionerId: e.target.value })}
              className={inputClass}
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
            className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #141440, #1a7a70)' }}
          >
            {submitting ? 'Adding...' : 'Add Patient'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-[#ddd] px-6 py-2.5 text-sm text-[#888] hover:text-[#141440] transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
