import { NextResponse } from "next/server";
import { getRequestRow, toRequestView, listRecords } from "@/lib/requests";

export const dynamic = "force-dynamic";

/** Lightweight polling endpoint for the investigator detail map. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = getRequestRow(params.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const view = toRequestView(row);
  return NextResponse.json({
    status: view.status,
    isExpired: view.isExpired,
    locationCount: view.locationCount,
    records: listRecords(row.id).map((r) => ({
      id: r.id,
      ts: r.ts,
      receivedAt: r.received_at,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy,
      source: r.source,
    })),
  });
}
