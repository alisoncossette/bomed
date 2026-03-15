'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Practitioner {
  id: string;
  name: string;
  handle: string;
  email: string;
  specialty: string | null;
  isActive: boolean;
}

interface ScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

interface TimeOff {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  status: string;
  type: string;
  patient: { name: string; handle: string | null };
}

export default function PractitionerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/practitioners/${id}`).then((r) => r.json()),
      fetch(`/api/practitioners/${id}/schedule`).then((r) => r.json()),
      fetch(`/api/practitioners/${id}/time-off?upcoming=true`).then((r) => r.json()),
      fetch(`/api/appointments?practitionerId=${id}&upcoming=true`).then((r) => r.json()),
    ])
      .then(([prac, sched, off, appts]) => {
        setPractitioner(prac);
        setSchedule(sched.data || sched);
        setTimeOffs(off.data || off);
        setAppointments((appts.data || appts).slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-zinc-500 py-8">Loading...</p>;
  if (!practitioner) return <p className="text-sm text-red-400 py-8">Practitioner not found</p>;

  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-500/15 text-yellow-400',
    CONFIRMED: 'bg-teal-500/15 text-teal-400',
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/dashboard/practitioners" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
          &larr; Practitioners
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">{practitioner.name}</h1>
          <span className="text-teal-400 text-sm">@{practitioner.handle}</span>
          {practitioner.isActive ? (
            <span className="text-green-400 text-xs font-medium bg-green-500/10 rounded-full px-2 py-0.5">Active</span>
          ) : (
            <span className="text-red-400 text-xs font-medium bg-red-500/10 rounded-full px-2 py-0.5">Inactive</span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          {practitioner.specialty || 'No specialty'} &middot; {practitioner.email}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Schedule */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Weekly Schedule</h2>
          {schedule.length === 0 ? (
            <p className="text-xs text-zinc-600">No schedule configured</p>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                const entry = schedule.find((s) => s.dayOfWeek === dow);
                return (
                  <div key={dow} className="flex items-center justify-between text-sm">
                    <span className={`w-10 ${entry ? 'text-zinc-300' : 'text-zinc-600'}`}>{DAY_NAMES[dow]}</span>
                    {entry ? (
                      <span className="text-zinc-400 text-xs">
                        {entry.startTime}&ndash;{entry.endTime}
                        {entry.breakStart && entry.breakEnd && (
                          <span className="text-zinc-600 ml-1">(break {entry.breakStart}&ndash;{entry.breakEnd})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-xs">Off</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Time Off */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Upcoming Time Off</h2>
          {timeOffs.length === 0 ? (
            <p className="text-xs text-zinc-600">No upcoming time off</p>
          ) : (
            <div className="space-y-3">
              {timeOffs.map((t) => (
                <div key={t.id} className="text-sm">
                  <p className="text-zinc-300">
                    {new Date(t.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    &ndash;
                    {new Date(t.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {t.reason && <p className="text-xs text-zinc-600">{t.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-xs text-zinc-600">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200">{a.patient.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusColor[a.status] || 'bg-zinc-700 text-zinc-400'}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {new Date(a.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' '}
                    {new Date(a.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {' '}· {a.duration}min · {a.type.replace(/_/g, ' ')}
                  </p>
                </div>
              ))}
            </div>
          )}
          <Link
            href={`/dashboard/appointments?practitionerId=${id}`}
            className="block mt-4 text-xs text-teal-400 hover:text-teal-300 transition"
          >
            View all appointments &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
