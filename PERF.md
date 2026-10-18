# Performance notes — brbitime

Ledger of measured performance work. Read this before proposing an optimization:
anything already listed as *reverted* was measured and did not pay for itself.

## Baseline (2026-10-18, measured from Tehran, IR)

| Measurement | Value |
| --- | --- |
| Lighthouse mobile (live, `brbitime.vercel.app`) | Perf **99** · LCP 1.0s · TBT 110ms · CLS 0 · A11y 100 · BP 100 |
| Homepage TTFB, 5 runs | 0.86 – 1.70s (TLS handshake 0.50 – 0.89s) |
| `/api/availability` | 0.83s warm · **4.91s cold start** |
| `Cache-Control` on `/` and `/api/availability` | `no-store` on every response |
| `x-vercel-cache` | `MISS` on every request |
| `x-vercel-id` | `lhr1::**iad1**::…` — edge in London, function in Washington DC |
| JS payload | 183KB / 8 chunks (71KB reported unused) |
| Fonts / images | 0 requests — system font stack, no hero image |

**Diagnosis.** The client-side code was already fast (LCP 1.0s at Perf 99), so the
bottleneck was infrastructure, not JavaScript:

1. Functions executed in `iad1` while the Neon database lives in `eu-central-1`
   (Frankfurt). Every request from Iran crossed the Atlantic twice.
2. `app/page.tsx` awaited `searchParams.error`, which opted the whole homepage
   into dynamic rendering — no CDN caching, a function invocation per visit.
3. `/api/availability` was `no-store`, so every date tap paid the full
   cross-continent round trip, including cold starts.

## Changes

| Change | File | Verified effect |
| --- | --- | --- |
| Pin function region to `fra1` (same city as Neon) | `vercel.json` | Deployment build log: `λ index [fra1]` (was `iad1`) |
| Homepage statically rendered + 10 min ISR; `?error=` read client-side | `app/page.tsx`, `app/ErrorBanner.tsx`, `app/BookingForm.tsx` | `next build`: `○ /` Static, `Revalidate 10m` (was `ƒ /` Dynamic) |
| `s-maxage=10, stale-while-revalidate=60` on availability | `app/api/availability/route.ts` | Response header confirmed locally and on preview |

## Trade-offs accepted

- **`minDate` staleness.** The static homepage bakes "today in Tehran" at build
  time and refreshes every 10 minutes. Harmless: `bookAppointment` re-validates
  `date >= iranToday()` on the server (`app/actions.ts`).
- **10s availability staleness.** A slot booked inside that window can still be
  shown as free, but `appointments_slot_unique` rejects the duplicate insert and
  the user lands on `/?error=slot-taken` — the race the UI was already built for.
  Chosen deliberately: a rare retry beats a cross-continent round trip per tap.

## Ledger of attempts

| Idea | Baseline → Result | Verdict | Why |
| --- | --- | --- | --- |
| Pin region `fra1` | `iad1` → `fra1` | **kept** | Function now co-located with the Neon DB in Frankfurt |
| Static homepage + ISR | `ƒ /` → `○ /` 10m | **kept** | Removes a function invocation per page view; edge-cacheable |
| Availability `s-maxage` | `no-store` → 10s/60s SWR | **kept** | Edge cache hit instead of a round trip |
| Lazy-load `@daypicker/persian` to shrink the 73KB chunk | — | **not attempted** | LCP was already 1.0s at Perf 99; the calendar renders above the fold on first paint, so deferring it would delay the primary UI. Re-measure before revisiting. |
| Trim the 71KB "unused JavaScript" | — | **not attempted** | Same reason: no measured user-facing problem to fix. |

## Re-measuring

```bash
# Synthetic (any machine)
CHROME_PATH=/usr/bin/chromium npx lighthouse@12 https://brbitime.vercel.app/ \
  --only-categories=performance --output=json --output-path=./lh.json

# Network reality from Iran (the metric that actually mattered here)
curl -sS -o /dev/null -w 'ttfb=%{time_starttransfer}s total=%{time_total}s\n' \
  https://brbitime.vercel.app/
curl -sSI https://brbitime.vercel.app/ | grep -iE 'cache-control|x-vercel-cache|x-vercel-id'
```

Expected after the changes: `/` returns `x-vercel-cache: HIT` with
`s-maxage=600`, and `x-vercel-id` contains `fra1` instead of `iad1`.
