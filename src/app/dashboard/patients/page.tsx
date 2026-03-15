'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DataView from '@/app/components/DataView';

type Patient = {
  id: string;
  name: string;
  handle: string | null;
  email: string;
  phone: string | null;
  calendarConnected: boolean;
  practitioners: { practitioner: { name: string; handle: string } }[];
  _count: { appointments: number };
  // Demographics
  dateOfBirth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  // Insurance
  insuranceCarrier: string | null;
  insurancePlan: string | null;
  insuranceGroupNo: string | null;
  insuranceMemberId: string | null;
  insuranceVerified: boolean;
  insuranceVerifiedAt: string | null;
  // Sync
  demographicsGranted: boolean;
  insuranceGranted: boolean;
  boloSyncedAt: string | null;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/patients')
      .then((r) => r.json())
      .then((res) => setPatients(res.data || res))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (patient: Patient) => {
    if (!confirm(`Remove ${patient.name}?`)) return;
    await fetch(`/api/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ practiceId: undefined }),
    });
    setPatients((prev) => prev.filter((p) => p.id !== patient.id));
  };

  const handleSync = async (patientId: string) => {
    setSyncing(patientId);
    try {
      await fetch(`/api/patients/${patientId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' }),
      });

      // Check for responses after a short delay
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/patients/${patientId}/sync`);
      const data = await res.json();

      if (data.updated && data.patient) {
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? { ...p, ...data.patient } : p)),
        );
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString();
  };

  if (loading) {
    return <div className="text-[#555] text-sm py-8">Loading patients...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Link
          href="/dashboard/patients/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition"
        >
          + Add Patient
        </Link>
      </div>

      <DataView
        data={patients}
        keyExtractor={(p) => p.id}
        onDelete={handleDelete}
        deleteLabel="Remove"
        emptyMessage="No patients yet. Add your first patient to get started."
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (p) => (
              <button
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="font-medium hover:text-teal-400 transition text-left"
              >
                {p.name}
              </button>
            ),
          },
          {
            key: 'handle',
            label: 'Handle',
            render: (p) =>
              p.handle ? (
                <span className="text-teal-400">@{p.handle}</span>
              ) : (
                <span className="text-[#555]">none</span>
              ),
            filterFn: (p, v) => (p.handle || '').toLowerCase().includes(v.toLowerCase()),
          },
          {
            key: 'insurance',
            label: 'Insurance',
            render: (p) =>
              p.insuranceCarrier ? (
                <div className="flex items-center gap-2">
                  <span className="text-[#888] text-xs">{p.insuranceCarrier}</span>
                  {p.insuranceVerified ? (
                    <span className="text-green-400 text-xs font-medium">Verified</span>
                  ) : (
                    <span className="text-amber-400 text-xs">Unverified</span>
                  )}
                </div>
              ) : (
                <span className="text-[#555] text-xs">No insurance on file</span>
              ),
            filterFn: (p, v) => (p.insuranceCarrier || '').toLowerCase().includes(v.toLowerCase()),
          },
          {
            key: 'practitioner',
            label: 'Practitioner',
            render: (p) =>
              p.practitioners[0]?.practitioner.name || (
                <span className="text-[#555]">unassigned</span>
              ),
            filterFn: (p, v) =>
              (p.practitioners[0]?.practitioner.name || 'unassigned')
                .toLowerCase()
                .includes(v.toLowerCase()),
          },
          {
            key: 'sync',
            label: 'Data Sync',
            render: (p) => {
              if (!p.handle) return <span className="text-[#333] text-xs">No handle</span>;
              const hasData = p.demographicsGranted || p.insuranceGranted;
              return (
                <div className="flex items-center gap-2">
                  {hasData ? (
                    <span className="text-green-400 text-xs font-medium">Synced</span>
                  ) : (
                    <span className="text-[#555] text-xs">Not synced</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSync(p.id); }}
                    disabled={syncing === p.id}
                    className="text-xs text-teal-400 hover:text-teal-300 transition disabled:opacity-50"
                  >
                    {syncing === p.id ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              );
            },
          },
          {
            key: 'appointments',
            label: 'Appts',
            render: (p) => <span className="text-[#888]">{p._count.appointments}</span>,
          },
        ]}
        cardRender={(p) => (
          <div className="rounded-lg border border-[#1a1a1a] bg-[#111] p-4">
            <div className="font-medium mb-1">{p.name}</div>
            {p.handle && <div className="text-teal-400 text-sm mb-2">@{p.handle}</div>}
            <div className="text-[#888] text-xs mb-1">{p.email}</div>
            {p.phone && <div className="text-[#888] text-xs mb-2">{p.phone}</div>}

            {p.insuranceCarrier ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[#888]">{p.insuranceCarrier}</span>
                {p.insuranceVerified ? (
                  <span className="text-green-400 text-xs font-medium">Verified</span>
                ) : (
                  <span className="text-amber-400 text-xs">Unverified</span>
                )}
              </div>
            ) : (
              <div className="text-[#444] text-xs mb-2">No insurance on file</div>
            )}

            {(p.address || p.city) && (
              <div className="text-[#555] text-xs mb-2">
                {[p.address, p.city, p.state, p.zip].filter(Boolean).join(', ')}
              </div>
            )}

            <div className="flex items-center justify-between text-xs mt-3">
              <span className="text-[#555]">
                {p.practitioners[0]?.practitioner.name || 'Unassigned'}
              </span>
              <span className="text-[#555]">{p._count.appointments} appts</span>
            </div>

            {p.handle && (
              <div className="mt-3 pt-3 border-t border-[#1a1a1a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {p.demographicsGranted && <span className="text-green-400/60 text-xs">Demo</span>}
                  {p.insuranceGranted && <span className="text-green-400/60 text-xs">Ins</span>}
                  {p.calendarConnected && <span className="text-green-400/60 text-xs">Cal</span>}
                </div>
                <button
                  onClick={() => handleSync(p.id)}
                  disabled={syncing === p.id}
                  className="text-xs text-teal-400 hover:text-teal-300 transition disabled:opacity-50"
                >
                  {syncing === p.id ? 'Syncing...' : 'Sync via Bolo'}
                </button>
              </div>
            )}
          </div>
        )}
      />

      {/* Expanded patient detail modal */}
      {expandedId && (() => {
        const p = patients.find((pt) => pt.id === expandedId);
        if (!p) return null;
        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setExpandedId(null)}>
            <div className="bg-[#111] border border-[#222] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{p.name}</h2>
                  {p.handle && <div className="text-teal-400 text-sm">@{p.handle}</div>}
                </div>
                <button onClick={() => setExpandedId(null)} className="text-[#555] hover:text-white text-xl">&times;</button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Contact */}
                <div>
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wide mb-3">Contact</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-[#555]">Email:</span> {p.email}</div>
                    <div><span className="text-[#555]">Phone:</span> {p.phone || '--'}</div>
                    {p.dateOfBirth && <div><span className="text-[#555]">DOB:</span> {formatDate(p.dateOfBirth)}</div>}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wide mb-3">Address</h3>
                  {p.address ? (
                    <div className="text-sm space-y-1">
                      <div>{p.address}</div>
                      <div>{[p.city, p.state, p.zip].filter(Boolean).join(', ')}</div>
                    </div>
                  ) : (
                    <div className="text-[#555] text-sm">No address on file</div>
                  )}
                </div>

                {/* Emergency Contact */}
                <div>
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wide mb-3">Emergency Contact</h3>
                  {p.emergencyName ? (
                    <div className="text-sm space-y-1">
                      <div>{p.emergencyName} {p.emergencyRelation && <span className="text-[#555]">({p.emergencyRelation})</span>}</div>
                      <div className="text-[#888]">{p.emergencyPhone || '--'}</div>
                    </div>
                  ) : (
                    <div className="text-[#555] text-sm">No emergency contact on file</div>
                  )}
                </div>

                {/* Insurance */}
                <div>
                  <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wide mb-3">
                    Insurance
                    {p.insuranceVerified && <span className="ml-2 text-green-400 text-xs font-medium normal-case">Verified</span>}
                  </h3>
                  {p.insuranceCarrier ? (
                    <div className="text-sm space-y-1">
                      <div className="font-medium">{p.insuranceCarrier}</div>
                      {p.insurancePlan && <div className="text-[#888]">{p.insurancePlan}</div>}
                      {p.insuranceGroupNo && <div><span className="text-[#555]">Group:</span> {p.insuranceGroupNo}</div>}
                      {p.insuranceMemberId && <div><span className="text-[#555]">Member ID:</span> {p.insuranceMemberId}</div>}
                      {p.insuranceVerifiedAt && (
                        <div className="text-xs text-[#555] mt-2">
                          Verified {formatDate(p.insuranceVerifiedAt)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[#555] text-sm">No insurance on file</div>
                  )}
                </div>
              </div>

              {/* Sync section */}
              {p.handle && (
                <div className="mt-6 pt-4 border-t border-[#1a1a1a]">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-[#555]">Bolo sync: </span>
                      <span className="text-[#888]">
                        {p.boloSyncedAt ? `Last synced ${formatDate(p.boloSyncedAt)}` : 'Never synced'}
                      </span>
                      <div className="flex gap-3 mt-1">
                        {p.demographicsGranted && <span className="text-green-400/80 text-xs">Demographics granted</span>}
                        {p.insuranceGranted && <span className="text-green-400/80 text-xs">Insurance granted</span>}
                        {p.calendarConnected && <span className="text-green-400/80 text-xs">Calendar connected</span>}
                        {!p.demographicsGranted && !p.insuranceGranted && !p.calendarConnected && (
                          <span className="text-[#555] text-xs">No grants yet</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSync(p.id)}
                      disabled={syncing === p.id}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 transition disabled:opacity-50"
                    >
                      {syncing === p.id ? 'Syncing...' : 'Sync via Bolo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}