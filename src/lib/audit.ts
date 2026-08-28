import { run, queryAll } from "./db";
import { newId } from "./tokens";
import type { AuditRow } from "./types";

export type AuditAction =
  | "REQUEST_CREATED"
  | "LINK_OPENED"
  | "PERMISSION_GRANTED"
  | "PERMISSION_DENIED"
  | "LOCATION_RECEIVED"
  | "LIVE_SHARING_STARTED"
  | "LIVE_SHARING_STOPPED"
  | "REQUEST_EXPIRED"
  | "REQUEST_VIEWED"
  | "NAVIGATE";

interface WriteAuditInput {
  action: AuditAction;
  actor?: string;
  caseId?: string | null;
  target?: string | null;
  detail?: Record<string, unknown>;
}

/** Append-only. There is deliberately no update/delete path for audit_logs. */
export async function writeAudit({
  action,
  actor = "investigator",
  caseId = null,
  target = null,
  detail,
}: WriteAuditInput): Promise<void> {
  await run(
    `INSERT INTO audit_logs (id, ts, actor, case_id, action, target, detail_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId("aud"),
    new Date().toISOString(),
    actor,
    caseId,
    action,
    target,
    detail ? JSON.stringify(detail) : null,
  );
}

export function listAudit(limit = 200): Promise<AuditRow[]> {
  return queryAll<AuditRow>(`SELECT * FROM audit_logs ORDER BY ts DESC LIMIT ?`, limit);
}
