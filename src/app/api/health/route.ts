import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostics — safe to expose: it never returns secret values,
 * only whether they are present. Hit this first when the site 500s.
 */
export async function GET() {
  const url = process.env.TURSO_DATABASE_URL?.trim() || "";
  let urlInfo: { scheme?: string; host?: string } = {};
  try {
    if (url) {
      const u = new URL(url.replace(/^libsql:\/\//i, "https://"));
      urlInfo = { scheme: url.split("://")[0], host: u.host };
    }
  } catch {
    urlInfo = { scheme: "unparseable" };
  }

  const env = {
    node: process.version,
    onVercel: !!process.env.VERCEL,
    hasTursoUrl: !!url,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN?.trim(),
    tursoUrl: urlInfo,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || null,
  };

  try {
    const rows = await queryAll<{ ok: number }>("SELECT 1 AS ok");
    return NextResponse.json({ status: "ok", db: rows[0]?.ok === 1 ? "reachable" : "unexpected", env });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        error: err instanceof Error ? err.message : String(err),
        env,
      },
      { status: 200 },
    );
  }
}
