export type RequestStatus =
  | "PENDING" // created, link not opened yet
  | "OPENED" // recipient opened the link
  | "GRANTED" // recipient granted browser location permission
  | "DENIED" // recipient declined / browser denied
  | "RECEIVED" // at least one location fix stored
  | "USED" // single-use request that has already delivered a fix
  | "EXPIRED"; // past expiry

export interface LocationRequestRow {
  id: string;
  case_id: string;
  target_e164: string | null;
  target_raw: string | null;
  purpose: string;
  token_hash: string;
  single_use: number; // 0 | 1
  status: RequestStatus;
  created_at: string;
  expires_at: string;
  created_by: string;
  officer_name: string | null;
}

export interface LocationSessionRow {
  id: string;
  request_id: string;
  started_at: string;
  ended_at: string | null;
  permission_status: string;
}

export interface LocationRecordRow {
  id: string;
  session_id: string;
  request_id: string;
  ts: string; // ISO instant the fix was taken (from the device)
  received_at: string; // ISO instant the server stored it
  latitude: number;
  longitude: number;
  accuracy: number | null; // metres
  source: string; // BROWSER_GEOLOCATION
  provider: string; // W3C_GEOLOCATION_API
  metadata_json: string | null;
}

export interface AuditRow {
  id: string;
  ts: string;
  actor: string;
  case_id: string | null;
  action: string;
  target: string | null;
  detail_json: string | null;
}

/** Shape returned to the investigator UI (safe to render). */
export interface RequestView {
  id: string;
  caseId: string;
  targetE164: string | null;
  targetRaw: string | null;
  purpose: string;
  status: RequestStatus;
  createdAt: string;
  expiresAt: string;
  singleUse: boolean;
  createdBy: string;
  officerName: string | null;
  reference: string;
  isExpired: boolean;
  locationCount: number;
}

/** Shape returned to the recipient page — deliberately minimal, never includes the phone number. */
export interface RecipientView {
  purpose: string;
  caseRef: string;
  reference: string;
  officerName: string | null;
  status: RequestStatus;
  expiresAt: string;
  acceptsData: boolean;
  reason?: "expired" | "used" | "not_found";
}
