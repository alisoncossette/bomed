import { prisma } from '@/lib/prisma';
import BoloStatus from '@/app/components/BoloStatus';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [appointmentCount, patientCount, practitionerCount, todayAppointments] = await Promise.all([
    prisma.appointment.count(),
    prisma.patient.count(),
    prisma.practitioner.count(),
    prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      include: { patient: true, practitioner: true },
      orderBy: { dateTime: 'asc' },
      take: 10,
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <BoloStatus />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Patients" value={patientCount} color="teal" />
        <StatCard label="Practitioners" value={practitionerCount} color="blue" />
        <StatCard label="Total Appointments" value={appointmentCount} color="violet" />
      </div>

      {/* Today's appointments */}
      <h2 className="text-lg font-semibold mb-4">Today&apos;s Schedule</h2>
      {todayAppointments.length === 0 ? (
        <div className="rounded-lg border border-[#1a1a1a] p-8 text-center text-[#555]">
          No appointments scheduled for today.
        </div>
      ) : (
        <div className="rounded-lg border border-[#1a1a1a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#111] text-[#888]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Patient</th>
                <th className="text-left px-4 py-3 font-medium">Practitioner</th>
                <th className="text-left px-4 py-3 font-medium">Duration</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayAppointments.map((apt) => (
                <tr key={apt.id} className="border-t border-[#1a1a1a]">
                  <td className="px-4 py-3">{new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3">{apt.patient.name}</td>
                  <td className="px-4 py-3">{apt.practitioner.name}</td>
                  <td className="px-4 py-3">{apt.duration} min</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={apt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    teal: 'text-teal-400 border-teal-400/20',
    blue: 'text-blue-400 border-blue-400/20',
    violet: 'text-violet-400 border-violet-400/20',
  };
  return (
    <div className={`rounded-lg border ${colors[color] || 'border-[#1a1a1a]'} bg-[#111] p-6`}>
      <div className={`text-3xl font-bold ${colors[color]?.split(' ')[0]}`}>{value}</div>
      <div className="text-sm text-[#888] mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    CONFIRMED: 'bg-green-500/10 text-green-400 border-green-500/20',
    DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
    CANCELLED: 'bg-[#222] text-[#555] border-[#333]',
    COMPLETED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
}
