import { NextResponse } from "next/server";
import {
  getRequestRowByToken,
  acceptsData,
  recordFix,
  refreshExpiry,
  setStatus,
} from "@/lib/requests";
import { writeAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

interface Body {
  latitude?: unknown;
  longitude?: unknown;
  accuracy?: unknown;
  timestamp?: unknown;
  permission?: unknown; // "granted" | "denied"
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const ip = clientIp(req);
  if (!rateLimit(`loc:${params.token}`, 120, 60_000) || !rateLimit(`loc-ip:${ip}`, 240, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rowRaw = getRequestRowByToken(params.token);
  if (!rowRaw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = refreshExpiry(rowRaw);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Recipient explicitly declined, or the browser denied permission.
  if (body.permission === "denied") {
    setStatus(row, "DENIED");
    writeAudit({ action: "PERMISSION_DENIED", caseId: row.case_id, target: row.id });
    return NextResponse.json({ ok: true, recorded: false });
  }

  // Acceptance-criterion: expired / used requests stop accepting new data.
  if (!acceptsData(row)) {
    const expired = row.status === "EXPIRED" || Date.now() > new Date(row.expires_at).getTime();
    return NextResponse.json(
      { error: expired ? "This request has expired." : "This request has already been used." },
      { status: expired ? 410 : 409 },
    );
  }

  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  const accuracy = Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null;
  const timestamp = typeof body.timestamp === "string" ? body.timestamp : null;

  // First successful fix implies permission was granted.
  if (row.status === "OPENED" || row.status === "PENDING") {
    writeAudit({ action: "PERMISSION_GRANTED", caseId: row.case_id, target: row.id });
  }

  const rec = recordFix(row, { latitude: lat, longitude: lng, accuracy, timestamp });

  return NextResponse.json({
    ok: true,
    recorded: true,
    record: { id: rec.id, ts: rec.ts, accuracy: rec.accuracy },
  });
}
