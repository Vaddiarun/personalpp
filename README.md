# InvestigateX — Consent-Based Location Request (focused MVP)

A single Next.js app for the one flow from the PRD that can genuinely work today:

> Investigator generates a location-request link → sends it to the recipient over WhatsApp →
> recipient opens it, taps **Share Location**, the browser asks permission → if granted, the
> coordinates come back → investigator sees the point on a map and can **navigate** to it.

The telecom / subscriber / SIM / IMEI / CDR / BTS parts of the PRD require authorized
government/telecom integrations with no public API and are **not** included.

## What's built

| Screen | Path | Purpose |
|---|---|---|
| Dashboard | `/` | Counts + recent requests |
| New Request | `/requests/new` | Create a request, get the link + QR + "open WhatsApp" |
| Request detail | `/requests/[id]` | Status timeline, live map, replay slider, per-fix **Navigate** |
| Recipient page | `/l/[token]` | Official-style consent UI (agency letterhead, case + officer + verification reference, plain-language explanation), real W3C geolocation, optional live sharing |
| Audit log | `/audit` | Append-only record of every sensitive action |

Storage: libSQL — a hosted [Turso](https://turso.tech) database in production (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`), or a local `data/investigatex.db` file for dev when those vars are unset. See `.env.example`.
Maps: MapLibre GL + OpenStreetMap tiles (no API key). Phone normalization: `libphonenumber-js`.

## Run

```bash
npm install
cp .env.example .env      # optional — edit NEXT_PUBLIC_BASE_URL
npm run dev                # binds 0.0.0.0:3000
```

Open `http://localhost:3000`.

## Getting a real location from a phone — important

The browser Geolocation API only runs on a **secure context**: `https://` **or** `http://localhost`.

- **Desktop, same machine:** works at `http://localhost:3000`.
- **Phone on the same Wi-Fi via `http://<LAN-IP>:3000`:** the investigator screens work, but the
  **recipient page will not be able to read location** — mobile browsers block geolocation on
  plain-HTTP origins.
- **To test end-to-end with a real phone**, expose the app over HTTPS with a tunnel and point
  `NEXT_PUBLIC_BASE_URL` at it so the generated links use that origin:

  ```bash
  # example — Cloudflare quick tunnel
  cloudflared tunnel --url http://localhost:3000
  # then in .env:
  NEXT_PUBLIC_BASE_URL=https://<the-generated-subdomain>.trycloudflare.com
  ```

  Restart `npm run dev` after changing `.env`. Now create a request, copy the `https://…/l/<token>`
  link, and send it over WhatsApp.

## Recipient consent page

Designed to look like a genuine official request so people are comfortable responding — **not**
disguised as something else. It shows:

- Your unit's letterhead (set `NEXT_PUBLIC_AGENCY_*` in `.env` — name, unit, emblem, a verify
  phone number)
- The case number, investigating officer, purpose, and a short **verification reference**
  (e.g. `Z98-SBM7`) that the officer reads to the recipient so they can confirm the two match
- Exactly what is collected (coordinates + accuracy + time) and that nothing is sent unless they
  tap **Allow**
- A "if unsure, call to verify" panel

The verification reference is also shown to you on the request's detail page and right after you
create it.

## The flow

1. **New Request** → enter Case ID, target phone (stored normalized, *never* put in the link),
   purpose, expiry (15 / 30 / 60 / 120 min), single-use toggle → **Generate Link**.
2. The link (`/l/<token>`) + QR + "Open WhatsApp to send" are shown **once**. Send it yourself.
3. Recipient opens it → sees purpose only → **Share Location** → browser permission prompt →
   on allow, the fix is posted over TLS and stored as `source = BROWSER_GEOLOCATION` with its
   real accuracy in metres. They can optionally keep sharing live (`watchPosition`).
4. **Request detail** auto-refreshes: pins on the map (chronological path), a replay slider,
   and for any selected fix a **Navigate** button that opens Google Maps directions to that
   point (logged as a `NAVIGATE` audit event).
5. Expiry / single-use are enforced server-side: once expired the link returns **410** and shows
   an "expired" page; a used single-use link returns **409**.

## Security notes (applied to this flow)

- Token = 32 random bytes (base64url); only its SHA-256 hash is stored.
- Phone number is never in the URL or any recipient-facing response.
- In-memory rate limiting on the public endpoints.
- `audit_logs` is insert-only — there is no update/delete code path.
- Browser-reported locations are **estimates**, shown with their accuracy, not exact positions.

## Before any real or public deployment (not done here)

- **Upgrade the framework.** `npm audit` flags the Next.js 14.x line; move to a patched Next
  (currently `next@16`) — this is a small codebase (route-handler `params` become async) and the
  upgrade is a sensible next step.
- Add authentication (login + MFA), RBAC, and real case-level authorization — this build has none.
- Put it behind HTTPS with a real certificate; move rate-limiting/session state to Redis.
- Swap OSM demo tiles for a licensed tile provider.
- Review data-retention rules per applicable legal policy.

## Project layout

```
src/
  app/
    (app)/                     investigator UI (own header/footer layout)
      page.tsx                  dashboard
      requests/new/page.tsx
      requests/[id]/page.tsx
      audit/page.tsx
    l/[token]/page.tsx          recipient consent page (no investigator chrome)
    api/
      location-requests/...     create / list / detail / locations / navigate
      l/[token]/...             recipient: get request info, post location
      audit/route.ts
  lib/
    db.ts                       libSQL/Turso connection + schema + async typed helpers
    requests.ts                 core logic (create, status, expiry, record fix)
    tokens.ts  audit.ts  ratelimit.ts  phone.ts  baseUrl.ts  types.ts
  components/
    MapView.tsx  StatusTimeline.tsx  StatusBadge.tsx  CopyLink.tsx
```

# personalpp
