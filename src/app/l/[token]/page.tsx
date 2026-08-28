"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getAgency } from "@/lib/agency";
import type { RecipientView } from "@/lib/types";

type Phase = "loading" | "intro" | "sharing" | "done" | "declined" | "error" | "closed";

const agency = getAgency();

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <span className="text-2xl leading-none">{agency.emblem}</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{agency.name}</div>
            <div className="text-xs text-slate-300">{agency.unit}</div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-lg px-5 py-6">{children}</div>
      <div className="mx-auto max-w-lg px-5 pb-10 text-center text-xs text-slate-400">
        Official request. Do not share this link with anyone else.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default function RecipientPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<RecipientView | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string>("");
  const [live, setLive] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    fetch(`/api/l/${token}`, { cache: "no-store" })
      .then(async (r) => {
        const data: RecipientView = await r.json();
        setView(data);
        if (!r.ok || data.reason === "not_found") {
          setPhase("closed");
          setMessage("This link is not valid. It may have been mistyped or already closed.");
        } else if (!data.acceptsData) {
          setPhase("closed");
          setMessage(
            data.reason === "expired"
              ? "This request has expired. Please contact the investigating officer if you still need to respond."
              : "This request has already been completed. Nothing further is needed.",
          );
        } else {
          setPhase("intro");
        }
      })
      .catch(() => {
        setPhase("error");
        setMessage("Could not reach the server. Check your connection and reload the page.");
      });
  }, [token]);

  const send = useCallback(
    async (pos: GeolocationPosition) => {
      const res = await fetch(`/api/l/${token}/location`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString(),
        }),
      });
      if (res.ok) {
        setLastSent(new Date().toLocaleTimeString());
      } else if (res.status === 410 || res.status === 409) {
        stopLive();
        const d = await res.json().catch(() => ({}));
        setPhase("closed");
        setMessage(d.error || "This request is no longer active.");
      }
    },
    [token],
  );

  function stopLive() {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setLive(false);
  }

  async function reportDenied() {
    await fetch(`/api/l/${token}/location`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permission: "denied" }),
    }).catch(() => {});
  }

  function decline() {
    reportDenied();
    setPhase("declined");
  }

  function share() {
    if (!("geolocation" in navigator)) {
      setPhase("error");
      setMessage("This browser does not support location sharing.");
      return;
    }
    setPhase("sharing");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await send(pos);
        setPhase("done");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reportDenied();
          setPhase("declined");
        } else {
          setPhase("error");
          setMessage(
            err.message ||
              "Could not determine your location. Move to an open area and try again.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  function startLive() {
    if (!("geolocation" in navigator)) return;
    setLive(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => send(pos),
      () => stopLive(),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
  }

  useEffect(() => () => stopLive(), []);

  const expiryText = view ? new Date(view.expiresAt).toLocaleString() : "";

  return (
    <Shell>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {phase === "loading" && <p className="text-slate-500">Loading request…</p>}

        {(phase === "closed" || phase === "error") && (
          <div className="space-y-3 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl">
              {phase === "error" ? "⚠️" : "🔒"}
            </div>
            <h1 className="text-lg font-bold">
              {phase === "error" ? "Something went wrong" : "This link is closed"}
            </h1>
            <p className="text-sm text-slate-600">{message}</p>
          </div>
        )}

        {phase === "declined" && (
          <div className="space-y-3 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl">
              ✋
            </div>
            <h1 className="text-lg font-bold">No location was shared</h1>
            <p className="text-sm text-slate-600">
              You chose not to share your location. Nothing has been sent. You can close this page.
            </p>
          </div>
        )}

        {phase === "intro" && view && (
          <div className="space-y-5">
            <div>
              <h1 className="text-xl font-bold">Location verification request</h1>
              <p className="mt-1 text-sm text-slate-600">
                An investigating officer has asked you to confirm your current location as part of
                an official inquiry.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-2 ring-1 ring-slate-200">
              <Row label="Case" value={view.caseRef} />
              {view.officerName && <Row label="Officer" value={view.officerName} />}
              <Row label="Purpose" value={view.purpose} />
              <Row label="Reference" value={view.reference} />
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <p className="font-medium text-slate-800">What will be shared, only if you allow it:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Your device&apos;s current coordinates and their accuracy</li>
                <li>The time the reading was taken</li>
              </ul>
              <p>{agency.privacyNote}</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              {agency.verifyNote}
              {agency.verifyPhone && (
                <>
                  {" "}
                  Verify by calling{" "}
                  <a href={`tel:${agency.verifyPhone}`} className="font-semibold underline">
                    {agency.verifyPhone}
                  </a>{" "}
                  and quoting reference <span className="font-mono font-semibold">{view.reference}</span>.
                </>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={share}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Share my location
              </button>
              <button
                onClick={decline}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Not now
              </button>
            </div>
            <p className="text-center text-xs text-slate-400">
              Your browser will ask for permission next. This link expires {expiryText}.
            </p>
          </div>
        )}

        {phase === "sharing" && (
          <div className="space-y-3 py-4 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <p className="text-sm text-slate-600">
              Waiting for your browser&apos;s location permission… please tap <b>Allow</b>.
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl">
                ✓
              </div>
              <h1 className="text-lg font-bold text-emerald-700">Location shared</h1>
              <p className="text-sm text-slate-600">
                Thank you. Your location has been sent to the investigating officer
                {lastSent ? ` at ${lastSent}` : ""}.
              </p>
            </div>

            {view && !view.reason && (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                {live ? (
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-medium text-emerald-700">Live location is on</p>
                    <p className="text-xs text-slate-500">Last update: {lastSent ?? "—"}</p>
                    <button
                      onClick={stopLive}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Stop sharing
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-slate-500">
                      If the officer asked you to stay reachable, you can keep sharing your
                      location until you stop it.
                    </p>
                    <button
                      onClick={startLive}
                      className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Keep sharing live location
                    </button>
                  </div>
                )}
              </div>
            )}
            <p className="text-center text-xs text-slate-400">You may now close this page.</p>
          </div>
        )}
      </div>
    </Shell>
  );
}
