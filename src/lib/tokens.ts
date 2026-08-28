import { randomBytes, createHash, randomUUID } from "node:crypto";

/** URL-safe, high-entropy token for the recipient link (32 bytes → 43 chars). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only the hash is stored; the raw token lives only in the link. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/**
 * Short, human-readable reference derived from the request id (e.g. "K7M-3QP4").
 * The officer can read this to the recipient so they can confirm the two match.
 */
export function shortReference(id: string): string {
  const hex = createHash("sha256").update(id).digest("hex");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let out = "";
  for (let i = 0; i < 7; i++) {
    out += alphabet[parseInt(hex.slice(i * 2, i * 2 + 2), 16) % alphabet.length];
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}
