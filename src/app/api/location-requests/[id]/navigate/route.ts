import { NextResponse } from "next/server";
import { getRequestRow } from "@/lib/requests";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Logged when the investigator opens external navigation to a reported point. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const row = getRequestRow(params.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let detail: Record<string, unknown> = {};
  try {
    detail = (await req.json()) as Record<string, unknown>;
  } catch {
    /* body optional */
  }

  writeAudit({
    action: "NAVIGATE",
    caseId: row.case_id,
    target: row.id,
    detail: {
      latitude: detail.latitude ?? null,
      longitude: detail.longitude ?? null,
      recordId: detail.recordId ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}
