import { headers } from "next/headers";

/**
 * Base URL for building the recipient link. Prefers an explicit
 * NEXT_PUBLIC_BASE_URL (set this to your tunnel/LAN address), otherwise
 * reconstructs it from the incoming request headers.
 */
export function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "http");
  return `${proto}://${host}`;
}

export function recipientLink(token: string, base?: string): string {
  return `${(base ?? getBaseUrl()).replace(/\/$/, "")}/l/${token}`;
}
