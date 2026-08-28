"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 220, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link]);

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `Location request: ${link}`,
  )}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked on http origins */
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="label">Recipient link (does not contain the phone number)</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input readOnly value={link} className="input font-mono text-xs" />
          <button type="button" onClick={copy} className="btn-ghost whitespace-nowrap">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {qr && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qr}
            alt="QR code for the recipient link"
            className="rounded-lg border border-edge bg-white p-2"
            width={140}
            height={140}
          />
        )}
        <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost">
          Open WhatsApp to send
        </a>
      </div>
      <p className="text-xs text-slate-500">
        Send this link to the recipient yourself. They must open it and explicitly grant their
        browser&apos;s location permission for any location to be collected.
      </p>
    </div>
  );
}
