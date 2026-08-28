import { NextResponse } from "next/server";
import { createRequest, listRequests } from "@/lib/requests";
import { recipientLink } from "@/lib/baseUrl";
import { shortReference } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ requests: await listRequests() });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const caseId = String(body.caseId ?? "").trim();
  const targetPhone = String(body.targetPhone ?? "").trim();
  const purpose = String(body.purpose ?? "Investigation").trim();
  const officerName = String(body.officerName ?? "").trim();
  const expiryMinutes = Number(body.expiryMinutes ?? 30);
  const singleUse = Boolean(body.singleUse);

  if (!caseId) {
    return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
  }

  try {
    const { id, token } = await createRequest({
      caseId,
      targetPhone,
      purpose,
      officerName,
      expiryMinutes,
      singleUse,
    });
    // The raw token / link is returned exactly once here.
    return NextResponse.json(
      { id, link: recipientLink(token), reference: shortReference(id) },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create request" },
      { status: 400 },
    );
  }
}
