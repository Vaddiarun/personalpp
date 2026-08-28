import { NextResponse } from "next/server";
import { getRequestRow, toRequestView, listRecords } from "@/lib/requests";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = await getRequestRow(params.id);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    request: await toRequestView(row),
    records: await listRecords(row.id),
  });
}
