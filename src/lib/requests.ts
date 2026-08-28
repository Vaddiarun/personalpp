import { queryAll, queryOne, run } from "./db";
import { generateToken, hashToken, newId, shortReference } from "./tokens";
import { writeAudit } from "./audit";
import { normalizePhone } from "./phone";
import type {
  LocationRequestRow,
  LocationRecordRow,
  RequestStatus,
  RequestView,
  RecipientView,
} from "./types";

const EXPIRY_CHOICES = [15, 30, 60, 120] as const;
export type ExpiryMinutes = (typeof EXPIRY_CHOICES)[number];

export interface CreateRequestInput {
  caseId: string;
  targetPhone: string;
  purpose: string;
  expiryMinutes: number;
  singleUse: boolean;
  createdBy?: string;
  officerName?: string;
}

export interface CreatedRequest {
  id: string;
  token: string; // raw token — returned ONCE, never stored
}

export async function createRequest(input: CreateRequestInput): Promise<CreatedRequest> {
  const caseId = input.caseId.trim();
  const purpose = input.purpose.trim() || "Investigation";
  if (!caseId) throw new Error("caseId is required");

  const minutes = EXPIRY_CHOICES.includes(input.expiryMinutes as ExpiryMinutes)
    ? input.expiryMinutes
    : 30;

  const phone = normalizePhone(input.targetPhone || "");
  const officerName = (input.officerName || "").trim() || null;

  const token = generateToken();
  const id = newId("lr");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + minutes * 60_000);

  await run(
    `INSERT INTO location_requests
       (id, case_id, target_e164, target_raw, purpose, token_hash, single_use, status, created_at, expires_at, created_by, officer_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`,
    id,
    caseId,
    phone.e164,
    phone.raw || null,
    purpose,
    hashToken(token),
    input.singleUse ? 1 : 0,
    now.toISOString(),
    expiresAt.toISOString(),
    input.createdBy || "investigator",
    officerName,
  );

  await writeAudit({
    action: "REQUEST_CREATED",
    caseId,
    target: id,
    detail: {
      targetE164: phone.e164,
      phoneValid: phone.valid,
      expiresAt: expiresAt.toISOString(),
      singleUse: input.singleUse,
      purpose,
    },
  });

  return { id, token };
}

export function getRequestRow(id: string): Promise<LocationRequestRow | undefined> {
  return queryOne<LocationRequestRow>(`SELECT * FROM location_requests WHERE id = ?`, id);
}

export function getRequestRowByToken(token: string): Promise<LocationRequestRow | undefined> {
  return queryOne<LocationRequestRow>(
    `SELECT * FROM location_requests WHERE token_hash = ?`,
    hashToken(token),
  );
}

export async function countRecords(requestId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM location_records WHERE request_id = ?`,
    requestId,
  );
  return Number(r?.n ?? 0);
}

function isExpired(row: LocationRequestRow): boolean {
  return Date.now() > new Date(row.expires_at).getTime();
}

/**
 * Lazily transition a request to EXPIRED the first time we notice the deadline
 * has passed, and emit the audit event exactly once.
 */
export async function refreshExpiry(row: LocationRequestRow): Promise<LocationRequestRow> {
  if (row.status !== "EXPIRED" && isExpired(row)) {
    await run(`UPDATE location_requests SET status = 'EXPIRED' WHERE id = ?`, row.id);
    await writeAudit({ action: "REQUEST_EXPIRED", caseId: row.case_id, target: row.id });
    return { ...row, status: "EXPIRED" };
  }
  return row;
}

/** Whether this request may still accept a new location fix from the recipient. */
export async function acceptsData(row: LocationRequestRow): Promise<boolean> {
  if (isExpired(row)) return false;
  if (row.status === "EXPIRED") return false;
  if (row.single_use && (row.status === "USED" || (await countRecords(row.id)) > 0)) return false;
  return true;
}

export async function setStatus(row: LocationRequestRow, status: RequestStatus): Promise<void> {
  const terminal: RequestStatus[] = ["EXPIRED", "USED"];
  if (terminal.includes(row.status)) return;
  await run(`UPDATE location_requests SET status = ? WHERE id = ?`, status, row.id);
}

export async function toRequestView(rowInput: LocationRequestRow): Promise<RequestView> {
  const row = await refreshExpiry(rowInput);
  return {
    id: row.id,
    caseId: row.case_id,
    targetE164: row.target_e164,
    targetRaw: row.target_raw,
    purpose: row.purpose,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    singleUse: !!row.single_use,
    createdBy: row.created_by,
    officerName: row.officer_name,
    reference: shortReference(row.id),
    isExpired: isExpired(row),
    locationCount: await countRecords(row.id),
  };
}

export async function toRecipientView(rowInput: LocationRequestRow): Promise<RecipientView> {
  const row = await refreshExpiry(rowInput);
  const canAccept = await acceptsData(row);
  let reason: RecipientView["reason"];
  if (!canAccept) reason = isExpired(row) || row.status === "EXPIRED" ? "expired" : "used";
  return {
    purpose: row.purpose,
    caseRef: row.case_id,
    reference: shortReference(row.id),
    officerName: row.officer_name,
    status: row.status,
    expiresAt: row.expires_at,
    acceptsData: canAccept,
    reason,
  };
}

export async function listRequests(limit = 100): Promise<RequestView[]> {
  const rows = await queryAll<LocationRequestRow>(
    `SELECT * FROM location_requests ORDER BY created_at DESC LIMIT ?`,
    limit,
  );
  return Promise.all(rows.map(toRequestView));
}

/** Get (or open) the single recipient session for a request. */
export async function ensureSession(requestId: string, permissionStatus: string): Promise<string> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM location_sessions WHERE request_id = ? ORDER BY started_at LIMIT 1`,
    requestId,
  );
  if (existing) {
    await run(
      `UPDATE location_sessions SET permission_status = ? WHERE id = ?`,
      permissionStatus,
      existing.id,
    );
    return existing.id;
  }
  const id = newId("ls");
  await run(
    `INSERT INTO location_sessions (id, request_id, started_at, permission_status)
     VALUES (?, ?, ?, ?)`,
    id,
    requestId,
    new Date().toISOString(),
    permissionStatus,
  );
  return id;
}

export interface IncomingFix {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: string | null;
}

export async function recordFix(
  row: LocationRequestRow,
  fix: IncomingFix,
): Promise<LocationRecordRow> {
  const sessionId = await ensureSession(row.id, "granted");
  const id = newId("rec");
  const receivedAt = new Date().toISOString();
  const ts = fix.timestamp ? new Date(fix.timestamp).toISOString() : receivedAt;

  await run(
    `INSERT INTO location_records
       (id, session_id, request_id, ts, received_at, latitude, longitude, accuracy, source, provider, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BROWSER_GEOLOCATION', 'W3C_GEOLOCATION_API', NULL)`,
    id,
    sessionId,
    row.id,
    ts,
    receivedAt,
    fix.latitude,
    fix.longitude,
    fix.accuracy ?? null,
  );

  await setStatus(row, "RECEIVED");
  if (row.single_use) {
    await run(`UPDATE location_requests SET status = 'USED' WHERE id = ?`, row.id);
  }

  await writeAudit({
    action: "LOCATION_RECEIVED",
    caseId: row.case_id,
    target: row.id,
    detail: {
      recordId: id,
      accuracy: fix.accuracy ?? null,
      source: "BROWSER_GEOLOCATION",
      ts,
    },
  });

  return (await queryOne<LocationRecordRow>(
    `SELECT * FROM location_records WHERE id = ?`,
    id,
  ))!;
}

export function listRecords(requestId: string): Promise<LocationRecordRow[]> {
  return queryAll<LocationRecordRow>(
    `SELECT * FROM location_records WHERE request_id = ? ORDER BY ts ASC`,
    requestId,
  );
}

export async function dashboardStats() {
  const active =
    (await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM location_requests
       WHERE status NOT IN ('EXPIRED','USED') AND expires_at > ?`,
      new Date().toISOString(),
    ))?.n ?? 0;
  const total = (await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM location_requests`))?.n ?? 0;
  const records = (await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM location_records`))?.n ?? 0;
  const audits = (await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM audit_logs`))?.n ?? 0;
  return {
    active: Number(active),
    total: Number(total),
    records: Number(records),
    audits: Number(audits),
  };
}

export { EXPIRY_CHOICES };
