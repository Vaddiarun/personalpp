import Link from "next/link";
import { dashboardStats, listRequests } from "@/lib/requests";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function Dashboard() {
  const stats = dashboardStats();
  const requests = listRequests(15);

  const cards = [
    { label: "Active Requests", value: stats.active },
    { label: "Total Requests", value: stats.total },
    { label: "Location Records", value: stats.records },
    { label: "Audit Events", value: stats.audits },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Create a consent-based location request, share the link, and track responses.
          </p>
        </div>
        <Link href="/requests/new" className="btn">
          + New Location Request
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Requests</h2>
        {requests.length === 0 ? (
          <div className="card text-sm text-slate-400">
            No requests yet. Create one to get started.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-edge">
            <table className="w-full text-sm">
              <thead className="bg-panel text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2">Case</th>
                  <th className="px-4 py-2">Target</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Fixes</th>
                  <th className="px-4 py-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-edge hover:bg-panel/60">
                    <td className="px-4 py-2">
                      <Link href={`/requests/${r.id}`} className="font-medium text-accent">
                        {r.caseId}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-300">
                      {r.targetE164 ?? r.targetRaw ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2">{r.locationCount}</td>
                    <td className="px-4 py-2 text-xs text-slate-400">{fmt(r.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
