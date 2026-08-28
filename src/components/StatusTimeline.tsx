import type { RequestStatus } from "@/lib/types";

const STEPS: { key: string; label: string; done: (s: RequestStatus, count: number) => boolean }[] = [
  { key: "created", label: "Request created", done: () => true },
  {
    key: "opened",
    label: "Link opened by recipient",
    done: (s) => ["OPENED", "GRANTED", "DENIED", "RECEIVED", "USED"].includes(s),
  },
  {
    key: "permission",
    label: "Location permission answered",
    done: (s) => ["GRANTED", "DENIED", "RECEIVED", "USED"].includes(s),
  },
  { key: "received", label: "Location received", done: (_s, c) => c > 0 },
];

export function StatusTimeline({ status, count }: { status: RequestStatus; count: number }) {
  const denied = status === "DENIED";
  return (
    <ol className="space-y-3">
      {STEPS.map((step) => {
        const isDone = step.done(status, count);
        const isDenied = denied && step.key === "permission";
        return (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${
                isDenied
                  ? "bg-rose-500 text-white"
                  : isDone
                    ? "bg-emerald-500 text-white"
                    : "border border-edge text-slate-500"
              }`}
            >
              {isDenied ? "✕" : isDone ? "✓" : ""}
            </span>
            <span className={isDone || isDenied ? "text-slate-200" : "text-slate-500"}>
              {isDenied ? "Recipient declined location sharing" : step.label}
            </span>
          </li>
        );
      })}
      {status === "EXPIRED" && (
        <li className="flex items-center gap-3 text-sm">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-700 text-[11px] text-white">
            ⌛
          </span>
          <span className="text-slate-300">Request expired — no longer accepting data</span>
        </li>
      )}
    </ol>
  );
}
