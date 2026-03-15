'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  status: string;
  type: string;
  notes: string | null;
  practitioner: { name: string; handle: string; specialty: string | null };
  patient: { name: string; handle: string | null; email: string };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    const params = new URLSearchParams();
    if (filter === 'upcoming') params.set('upcoming', 'true');
    else if (filter !== 'all') params.set('status', filter);

    fetch(`/api/appointments?${params}`)
      .then((r) => r.json())
      .then((data) => { setAppointments(data.data || data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleAction = async (id: string, confirmed: boolean) => {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: confirmed ? 'CONFIRMED' : 'DECLINED' }),
    });
    load();
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
    load();
  };

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-500/15 text-yellow-400',
    CONFIRMED: 'bg-teal-500/15 text-teal-400',
    DECLINED: 'bg-red-500/15 text-red-400',
    CANCELLED: 'bg-zinc-500/15 text-zinc-400',
    COMPLETED: 'bg-blue-500/15 text-blue-400',
  };

  const filters = ['all', 'upcoming', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-zinc-500">{appointments.length} total</p>
        </div>
        <Link
          href="/dashboard/schedule"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-500"
        >
          + Schedule
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => { setLoading(true); setFilter(f); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f ? 'bg-teal-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-sm text-zinc-500">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-zinc-100">
                      {apt.patient.name}
                      {apt.patient.handle && <span className="ml-1 text-xs text-zinc-500">@{apt.patient.handle}</span>}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[apt.status] || ''}`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    with {apt.practitioner.name} · {apt.type.replace(/_/g, ' ')} · {apt.duration} min
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {new Date(apt.dateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {' at '}
                    {new Date(apt.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {apt.notes && <p className="mt-2 text-xs text-zinc-600">{apt.notes}</p>}
                </div>
                <div className="flex gap-2">
                  {apt.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleAction(apt.id, true)} className="rounded-lg bg-teal-600/20 px-3 py-1 text-xs text-teal-400 hover:bg-teal-600/30">
                        Confirm
                      </button>
                      <button onClick={() => handleAction(apt.id, false)} className="rounded-lg bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600/30">
                        Decline
                      </button>
                    </>
                  )}
                  {(apt.status === 'PENDING' || apt.status === 'CONFIRMED') && (
                    <button onClick={() => handleCancel(apt.id)} className="rounded-lg bg-zinc-700/50 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
