# Performance notes — brbitime

Ledger of measured performance work. Read this before proposing an optimization:
anything listed as *reverted* or *not attempted* was measured and did not pay for
itself, and the methodology section explains why the obvious metric lied here.

## What was wrong

Lighthouse was already **99** on the live site with LCP 1.0s, so the client-side
code was never the problem. The costs were infrastructure:

1. **Functions ran in `iad1` (Washington DC) while Neon lives in `eu-central-1`
   (Frankfurt).** Every request crossed the Atlantic twice.
2. **`app/page.tsx` awaited `searchParams.error`**, which opts the whole route
   into dynamic rendering — one serverless invocation per visit, `no-store`,
   `x-vercel-cache: MISS` on every request.
3. **`/api/availability` was `no-store`**, so every date tap paid the full
   cross-continent round trip, including serverless cold starts (one measured
   at **4.91s**).

## Changes

| Change | File |
| --- | --- |
| Pin function region to `fra1`, co-located with Neon | `vercel.json` |
| Homepage statically rendered + 10 min ISR; `?error=` read client-side in a `useSearchParams` component | `app/page.tsx`, `app/ErrorBanner.tsx`, `app/BookingForm.tsx` |
| `s-maxage=10, stale-while-revalidate=60` instead of `no-store` | `app/api/availability/route.ts` |
| Regression guard (`npm run perf:guard`) | `scripts/perf-guard.mjs` |

## Verification — use the interleaved A/B, not Lighthouse

**Lighthouse cannot see this change.** It simulates a fixed 150ms RTT and 1.6Mbps
network, so a transatlantic function hop and an edge cache hit look identical to
it. Measured properly, its score is unchanged:

| Lighthouse mobile, 5 runs each (mobile default) | BEFORE | AFTER |
| --- | --- | --- |
| Performance score | 98 median (93–99) | 98 median (95–98) |
| LCP | 1356ms median (1024–2309) | 1322ms median (990–2226) |
| Server response time | 217ms median (200–577) | 214ms median (204–436) |

The within-group spread (990–2309ms) is far larger than the between-group delta
(−33ms). **A single Lighthouse run is not evidence here** — an early one-run
sample suggested the change made things worse (99 → 97), which the 5-run
distribution above disproves.

**What the change actually targets is real-network latency from Iran**, measured
by alternating deploys of the two commits on the same production URL so that
slow network drift over the session cancels out rather than being credited to
whichever version ran last (n=12 per version, per endpoint):

| TTFB from Tehran | OLD (commit `870f3f5`) | NEW | Delta | P(new < old) |
| --- | --- | --- | --- | --- |
| Homepage | 810ms median | **729ms** | −81ms | 0.83 |
| `/api/availability` | 865ms median | **655ms** | −210ms | 0.74 |

The availability figure is the one that matters: it is the wait a customer
experiences after tapping a date, and it is now ~24% shorter. The direction is
consistent but not overwhelming — P(new < old) of 0.74–0.83 means the new
version is faster in roughly three of four random pairings, not always.

Observable infrastructure facts that back this up:

- `/` → `x-nextjs-prerender: 1`, `x-vercel-cache: HIT` (was `MISS`, `no-store`,
  and a function invocation per view).
- `/api/availability` → `x-vercel-id: lhr1::**fra1**::…` (was `lhr1::**iad1**::`),
  and a second request for the same date is a cache `HIT`.

## Trade-offs accepted

- **`minDate` staleness.** The static homepage bakes "today in Tehran" at build
  time and refreshes every 10 minutes. Harmless: `bookAppointment` re-validates
  `date >= iranToday()` server-side (`app/actions.ts`).
- **10s availability staleness.** A slot booked inside that window can still be
  shown as free, but `appointments_slot_unique` rejects the duplicate insert and
  the user lands on `/?error=slot-taken` — the race the UI was already built for.
  A rare retry beats a cross-continent round trip on every tap.

## Ledger of attempts

| Idea | Baseline → Result | Verdict | Why |
| --- | --- | --- | --- |
| Pin region `fra1` | `iad1` → `fra1` | **kept** | Function now co-located with the Neon DB; availability TTFB −210ms |
| Static homepage + 10m ISR | `ƒ /` → `○ /` | **kept** | Removes a function invocation per view; homepage TTFB −81ms |
| Availability `s-maxage` + SWR | `no-store` → 10s/60s | **kept** | Repeat taps served from the edge; eliminates the 4.91s cold-start path |
| Lazy-load `@daypicker/persian` (73KB chunk) | — | **not attempted** | LCP was already 1.0s at Perf 99, and the calendar is above the fold on first paint — deferring it would delay the primary UI |
| Trim the 71KB "unused JavaScript" | — | **not attempted** | Same: no measured user-facing problem to fix |
| Judge the work by the Lighthouse score | 98 → 98 | **rejected metric** | Simulated throttling is blind to region and edge-cache changes; it would have reverted a real win |

## Guarding against regression

`npm run perf:guard [base-url]` asserts the three things that actually broke:
the homepage is still prerendered (`x-nextjs-prerender: 1`), functions still run
in `fra1`, and availability is still edge-cached (a `no-store` endpoint shows
`MISS` forever). It also fails if the booking form disappears from the
server-rendered HTML. Run it after any routing, caching, or deployment-config
change.

Two notes on writing guards against Vercel:

- Vercel rewrites an ISR response's `Cache-Control` to
  `public, max-age=0, must-revalidate` and consumes `s-maxage` itself — assert on
  `x-vercel-cache` / `x-nextjs-prerender`, not the literal header.
- `x-vercel-id` is `lhr1::fra1::req-id` when a function ran and `lhr1::req-id`
  when the edge served it from cache. Only the three-segment form names a region.

## Re-measuring

```bash
# The metric that matters: real-network TTFB (run from Iran)
for i in $(seq 1 12); do curl -sS -o /dev/null -w '%{time_starttransfer}\n' \
  "https://brbitime.vercel.app/api/availability?date=$(date -d tomorrow +%F)"; done

# Infrastructure facts
curl -sSI https://brbitime.vercel.app/ | grep -iE 'cache-control|x-vercel-cache|x-nextjs-prerender'
curl -sSI "https://brbitime.vercel.app/api/availability?date=$(date -d tomorrow +%F)" | grep -i x-vercel-id

# Synthetic (unchanged by design — do not use to judge this work)
CHROME_PATH=/usr/bin/chromium npx lighthouse@12 https://brbitime.vercel.app/ \
  --only-categories=performance --output=json --output-path=./lh.json

# The guard
npm run perf:guard
```
