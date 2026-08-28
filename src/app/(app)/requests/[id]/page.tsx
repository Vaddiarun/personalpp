"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapView, type MapPoint } from "@/components/MapView";
import { StatusTimeline } from "@/components/StatusTimeline";
import { StatusBadge } from "@/components/StatusBadge";
import type { RequestView, LocationRecordRow } from "@/lib/types";

interface Payload {
  request: RequestView;
  records: LocationRecordRow[];
}

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replayIdx, setReplayIdx] = useState<number>(-1); // -1 => show all
  const [playing, setPlaying] = useState(false);
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/location-requests/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
      const json: Payload = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // poll while the request is still live
  useEffect(() => {
    const active = data && !data.request.isExpired && data.request.status !== "USED";
    if (!active) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [data, load]);

  // 1s clock for the expiry countdown
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const records = data?.records ?? [];

  // replay auto-advance
  useEffect(() => {
    if (!playing) return;
    if (records.length === 0) return;
    const t = setInterval(() => {
      setReplayIdx((i) => {
        const next = (i < 0 ? 0 : i) + 1;
        if (next >= records.length) {
          setPlaying(false);
          return records.length - 1;
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(t);
  }, [playing, records.length]);

  const visible = replayIdx < 0 ? records : records.slice(0, replayIdx + 1);
  const points: MapPoint[] = visible.map((r) => ({
    id: r.id,
    latitude: r.latitude,
    longitude: r.longitude,
    accuracy: r.accuracy,
    ts: r.ts,
  }));

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId],
  );

  async function navigate(r: LocationRecordRow) {
    fetch(`/api/location-requests/${id}/navigate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ latitude: r.latitude, longitude: r.longitude, recordId: r.id }),
    }).catch(() => {});
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`,
      "_blank",
      "noreferrer",
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-accent">
          &larr; Dashboard
        </Link>
        <div className="card text-rose-400">{error}</div>
      </div>
    );
  }
  if (!data) return <div className="text-slate-400">Loading…</div>;

  const req = data.request;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-accent">
            &larr; Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{req.caseId}</h1>
          <p className="text-sm text-slate-400">
            {req.purpose}
            {req.officerName ? ` · ${req.officerName}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Verification reference:{" "}
            <span className="font-mono font-semibold text-slate-300">{req.reference}</span>
          </p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="label">Target (records only)</div>
          <div className="font-mono text-sm">{req.targetE164 ?? req.targetRaw ?? "—"}</div>
        </div>
        <div className="card">
          <div className="label">Expires</div>
          <div className="text-sm">
            {req.isExpired ? (
              <span className="text-slate-400">Expired</span>
            ) : (
              <span className="text-emerald-300">{timeLeft(req.expiresAt)} left</span>
            )}
          </div>
        </div>
        <div className="card">
          <div className="label">Mode</div>
          <div className="text-sm">{req.singleUse ? "Single-use" : "Multiple fixes"}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-edge">
            <MapView
              points={points}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="h-[440px] w-full"
            />
          </div>

          {records.length > 0 && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="label mb-0">Replay ({records.length} fixes)</div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost px-3 py-1 text-xs"
                    onClick={() => {
                      setReplayIdx(0);
                      setPlaying(true);
                    }}
                  >
                    ▶ Play
                  </button>
                  <button
                    className="btn-ghost px-3 py-1 text-xs"
                    onClick={() => {
                      setPlaying(false);
                      setReplayIdx(-1);
                    }}
                  >
                    Show all
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={records.length - 1}
                value={replayIdx < 0 ? records.length - 1 : replayIdx}
                onChange={(e) => {
                  setPlaying(false);
                  setReplayIdx(Number(e.target.value));
                }}
                className="w-full"
              />
              <div className="text-xs text-slate-400">
                {(() => {
                  const i = replayIdx < 0 ? records.length - 1 : replayIdx;
                  return `Fix ${i + 1}: ${new Date(records[i].ts).toLocaleString()}`;
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="label">Progress</div>
            <StatusTimeline status={req.status} count={req.locationCount} />
          </div>

          <div className="card">
            <div className="label">Location fixes</div>
            {records.length === 0 ? (
              <p className="text-sm text-slate-400">
                Waiting for the recipient to open the link and share their location…
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {records.map((r, i) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left ${
                        r.id === selectedId ? "bg-accent/20" : "hover:bg-panel"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span>#{i + 1}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(r.ts).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                        {r.accuracy ? ` · ±${Math.round(r.accuracy)} m` : ""}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected && (
            <div className="card space-y-3">
              <div className="label">Selected fix</div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Coordinates</dt>
                  <dd className="font-mono text-xs">
                    {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Accuracy</dt>
                  <dd>{selected.accuracy ? `±${Math.round(selected.accuracy)} m` : "unknown"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Source</dt>
                  <dd>Browser geolocation</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Device time</dt>
                  <dd className="text-xs">{new Date(selected.ts).toLocaleString()}</dd>
                </div>
              </dl>
              <button onClick={() => navigate(selected)} className="btn w-full">
                Navigate (open in Google Maps)
              </button>
              <p className="text-[11px] text-slate-500">
                Navigation targets the reported/estimated location, not necessarily the
                person&apos;s exact position.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
