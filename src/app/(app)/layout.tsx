import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-edge bg-panel/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
              IX
            </span>
            InvestigateX
          </Link>
          <nav className="flex gap-4 text-sm text-slate-300">
            <Link href="/" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/requests/new" className="hover:text-white">
              New Request
            </Link>
            <Link href="/audit" className="hover:text-white">
              Audit
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-500">
        Authorized investigative use only. Every sensitive action is logged. Browser-reported
        locations are estimates, not exact positions.
      </footer>
    </div>
  );
}
