import { NextResponse } from "next/server";
import { getRequestRowByToken, toRecipientView, setStatus } from "@/lib/requests";
import { writeAudit } from "@/lib/audit";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import type { RecipientView } from "@/lib/types";

export const dynamic = "force-dynamic";

const NOT_FOUND: RecipientView = {
  purpose: "",
  caseRef: "",
  reference: "",
  officerName: null,
  status: "EXPIRED",
  expiresAt: new Date(0).toISOString(),
  acceptsData: false,
  reason: "not_found",
};

export async function GET(req: Request, { params }: { params: { token: string } }) {
  if (!rateLimit(`view:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const row = getRequestRowByToken(params.token);
  if (!row) {
    // Do not leak whether a token ever existed.
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  // First open moves PENDING → OPENED and logs it.
  if (row.status === "PENDING") {
    setStatus(row, "OPENED");
    writeAudit({ action: "LINK_OPENED", caseId: row.case_id, target: row.id });
  }

  return NextResponse.json(toRecipientView(row));
}
