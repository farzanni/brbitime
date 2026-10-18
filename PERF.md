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
| Add an index for the availability lookup | — | **not attempted** | The plan already shows `Index Only Scan` on `unique_booked_slot` at 0.90ms; a second index would tax every write for nothing |
| Add an index for the admin list | — | **not attempted** | Already an `Index Scan` with no `Sort` node (0.03ms); the index order matches the `ORDER BY` |
| Enforce the guard in CI | — | **added** | A guard nothing runs is documentation, not a guard |
| Add RUM / `web-vitals` field monitoring | — | **deferred** | 6 bookings ever, all from the author's own phone, none in 2 months — a p75 over zero real sessions is the author's browser dressed up as field data. Trigger documented in PERF.md |

## Backend: query plans (no change needed)

The skill's rule is "read the plan before adding an index". Both queries were
already covered by the existing partial unique index
`unique_booked_slot (appointment_date, appointment_time) WHERE status = 'booked'`,
verified with `EXPLAIN (ANALYZE, BUFFERS)` against the production database:

| Query | Plan | Execution |
| --- | --- | --- |
| Availability lookup (hot path) | `Index Only Scan using unique_booked_slot` — `Heap Fetches: 0` | **0.90ms** |
| Admin list | `Index Scan using unique_booked_slot`, **no `Sort` node** | **0.03ms** |

Two things worth recording:

- The index is shaped exactly for both queries: `appointment_date` is the
  equality column for the availability lookup and the range column for the admin
  list, and `(appointment_date, appointment_time)` matches the admin `ORDER BY`,
  so the sort is free. **No index was added** — a second one would be pure
  write-tax on every booking.
- The database accounts for roughly **1ms inside a 655ms request**. It was never
  the bottleneck, which independently confirms that the region/edge work was
  aimed at the right layer rather than at query tuning.

Re-verify with:

```bash
set -a && . ./.env.production.local && set +a
psql "$DATABASE_URL_UNPOOLED" -c "EXPLAIN (ANALYZE, BUFFERS, COSTS OFF)
  SELECT appointment_time FROM appointments
  WHERE appointment_date = '2026-10-22' AND status = 'booked';"
```

## Field monitoring (RUM): deferred, with a trigger

Step 5 asks for two layers — a synthetic CI gate and field monitoring. The CI
gate exists (`.github/workflows/perf-guard.yml`) and guards the metric that
justified this work (real-network TTFB, plus the structural assertions). Field
monitoring is deliberately **not** built yet, on evidence:

The production database holds **6 appointments in its entire history**, all
created between 2026-08-15 and 2026-08-24, and every one of them from the same
phone number under test names. There have been no bookings in the two months
since. **The site has no real users yet.**

A RUM p75 computed over zero real sessions measures the developer's own browser
and presents it as field data — worse than no data, because it looks like
evidence.

**Trigger to add it:** real traffic. Concretely, once the appointments table
shows bookings from more than a handful of distinct phone numbers spread across
several weeks, wire up `web-vitals` reporting. The measurement that will matter
then is p75 LCP / INP / TTFB for real Iranian sessions, because that is the
population every decision in this document was made for.

Two notes for whoever does it:

- Vercel Speed Insights beacons same-origin (`/_vercel/speed-insights/`), so it
  is not blocked in Iran the way a third-party analytics domain would be.
- Whatever the choice, do not store an identifier alongside the metric. A
  performance sample needs a page path and the metric, nothing more.

Until then, the synthetic CI gate is the right level of investment: it catches
the structural regressions — dynamic rendering, region drift, cache bypass —
which do not need traffic to detect.

## Guarding against regression

`npm run perf:guard [base-url]` asserts the three things that actually broke:
the homepage is still prerendered (`x-nextjs-prerender: 1`), functions still run
in `fra1`, and availability is still edge-cached (a `no-store` endpoint shows
`MISS` forever). It also fails if the booking form disappears from the
server-rendered HTML. Run it after any routing, caching, or deployment-config
change.

It is wired into CI as `.github/workflows/perf-guard.yml` — on pushes to `main`,
daily on a schedule (so config drift no push caused still surfaces), and on
manual dispatch. On a push the job retries up to 5 times because Vercel's own
deploy is still running when it starts.

Three notes on writing guards against Vercel — each of these was a real
false-positive found by running the guard against a known-good site:

- Vercel rewrites an ISR response's `Cache-Control` to
  `public, max-age=0, must-revalidate` and consumes `s-maxage` itself — assert on
  `x-vercel-cache` / `x-nextjs-prerender`, not the literal header.
- `x-vercel-cache: STALE` is **healthy** (the ISR entry is past its revalidate
  window and is being served from cache while revalidating in the background).
  Accept `HIT`, `STALE`, and `PRERENDER`; only `MISS` is the regression.
- `x-vercel-id` is `lhr1::fra1::req-id` when a function ran and `lhr1::req-id`
  when the edge served it from cache. Only the three-segment form names a region.

The TTFB budget is relaxed in CI (`PERF_TTFB_BUDGET_MS=5000`): a runner sits next
to Vercel's edge and would pass any budget, so the cache and region assertions
carry the signal there. The real-network budget is a manual, Iran-side
measurement.

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
