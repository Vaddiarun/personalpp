import type { RequestStatus } from "@/lib/types";

const STYLES: Record<RequestStatus, string> = {
  PENDING: "bg-slate-700 text-slate-200",
  OPENED: "bg-amber-500/20 text-amber-300",
  GRANTED: "bg-sky-500/20 text-sky-300",
  DENIED: "bg-rose-500/20 text-rose-300",
  RECEIVED: "bg-emerald-500/20 text-emerald-300",
  USED: "bg-emerald-500/20 text-emerald-300",
  EXPIRED: "bg-slate-800 text-slate-400",
};

const LABELS: Record<RequestStatus, string> = {
  PENDING: "Link not opened",
  OPENED: "Link opened",
  GRANTED: "Permission granted",
  DENIED: "Declined",
  RECEIVED: "Location received",
  USED: "Used (single-use)",
  EXPIRED: "Expired",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`pill ${STYLES[status]}`}>{LABELS[status]}</span>;
}
