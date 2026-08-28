"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyLink } from "@/components/CopyLink";

const EXPIRY_OPTIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [caseId, setCaseId] = useState("CYBER-2026-00124");
  const [targetPhone, setTargetPhone] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [purpose, setPurpose] = useState("Investigation");
  const [expiryMinutes, setExpiryMinutes] = useState(30);
  const [singleUse, setSingleUse] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; link: string; reference: string } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/location-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caseId,
          targetPhone,
          officerName,
          purpose,
          expiryMinutes,
          singleUse,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create request");
      setCreated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-bold">Location request created</h1>
        <div className="card space-y-2">
          <div className="label mb-0">Verification reference</div>
          <div className="font-mono text-2xl font-bold tracking-widest text-accent">
            {created.reference}
          </div>
          <p className="text-xs text-slate-400">
            Read this to the recipient so they can confirm it matches the code on the page before
            they share anything.
          </p>
        </div>
        <div className="card space-y-4">
          <CopyLink link={created.link} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push(`/requests/${created.id}`)} className="btn">
            Open request &amp; track location
          </button>
          <button
            onClick={() => {
              setCreated(null);
              setTargetPhone("");
            }}
            className="btn-ghost"
          >
            Create another
          </button>
        </div>
        <p className="text-xs text-amber-300/80">
          This link is shown once. If you lose it, revoke this request by letting it expire and
          create a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/" className="text-sm text-accent">
          &larr; Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">New Location Request</h1>
      </div>

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="caseId">
            Case ID
          </label>
          <input
            id="caseId"
            className="input"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="phone">
            Target phone (normalized to E.164, stored server-side only)
          </label>
          <input
            id="phone"
            className="input"
            placeholder="+91 98765 43210"
            value={targetPhone}
            onChange={(e) => setTargetPhone(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            For your records. It never appears in the recipient link.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="officer">
            Investigating officer (shown to the recipient)
          </label>
          <input
            id="officer"
            className="input"
            placeholder="e.g. Insp. A. Sharma, Cyber Cell"
            value={officerName}
            onChange={(e) => setOfficerName(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="purpose">
            Purpose
          </label>
          <input
            id="purpose"
            className="input"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="expiry">
            Link expiry
          </label>
          <select
            id="expiry"
            className="input"
            value={expiryMinutes}
            onChange={(e) => setExpiryMinutes(Number(e.target.value))}
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={singleUse}
            onChange={(e) => setSingleUse(e.target.checked)}
          />
          Single-use (stop accepting data after the first location fix)
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button type="submit" disabled={submitting} className="btn">
          {submitting ? "Creating…" : "Generate Link"}
        </button>
      </form>
    </div>
  );
}
