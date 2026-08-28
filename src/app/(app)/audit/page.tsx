import Link from "next/link";
import { listAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  REQUEST_CREATED: "text-sky-300",
  LINK_OPENED: "text-amber-300",
  PERMISSION_GRANTED: "text-emerald-300",
  PERMISSION_DENIED: "text-rose-300",
  LOCATION_RECEIVED: "text-emerald-300",
  REQUEST_EXPIRED: "text-slate-400",
  NAVIGATE: "text-violet-300",
};

export default async function AuditPage() {
  const events = await listAudit(500);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-accent">
          &larr; Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-slate-400">
          Append-only record of every sensitive action. {events.length} events.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-edge">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Case</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-edge align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-400">
                  {new Date(e.ts).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-xs">{e.actor}</td>
                <td className={`px-4 py-2 text-xs font-semibold ${ACTION_STYLE[e.action] ?? ""}`}>
                  {e.action}
                </td>
                <td className="px-4 py-2 text-xs">{e.case_id ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                  {e.target ?? "—"}
                </td>
                <td className="px-4 py-2 font-mono text-[11px] text-slate-500">
                  {e.detail_json ?? ""}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
