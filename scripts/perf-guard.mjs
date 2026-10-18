#!/usr/bin/env node
/**
 * Performance guard for brbitime.
 *
 * Guards the regressions that actually cost users here — not the Lighthouse
 * score, which was already 99 before any of this work. What broke before:
 *
 *   1. the homepage slipping back to dynamic rendering (no CDN cache),
 *   2. functions drifting back out of the DB's region (fra1),
 *   3. the availability endpoint going back to `no-store`.
 *
 * Usage: node scripts/perf-guard.mjs [base-url]
 * Default base URL: https://brbitime.vercel.app
 * Exit code 0 = all good, 1 = at least one guard failed.
 */

const BASE = (process.argv[2] ?? "https://brbitime.vercel.app").replace(/\/$/, "");
const TTFB_BUDGET_MS = 1200;

const results = [];
let failed = 0;

function check(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failed += 1;
}

function iranToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

async function timedFetch(url, init) {
  const started = performance.now();
  const response = await fetch(url, init);
  const body = await response.text();
  return { response, body, ms: performance.now() - started };
}

// --- 1. Homepage is edge-cached (static/ISR), not a function call per visit ---
// NOTE: Vercel rewrites the Cache-Control header of an ISR response to
// `public, max-age=0, must-revalidate` and consumes the s-maxage directive
// itself, so the observable signals are x-vercel-cache and x-nextjs-prerender.
const first = await timedFetch(`${BASE}/`);
const second = await timedFetch(`${BASE}/`);
const homeCache = second.response.headers.get("cache-control") ?? "";
const homeVercelCache = (second.response.headers.get("x-vercel-cache") ?? "").toUpperCase();
const homePrerender = second.response.headers.get("x-nextjs-prerender") ?? "";

check(
  "homepage is prerendered, not rendered on demand",
  homePrerender === "1",
  `x-nextjs-prerender: ${homePrerender || "(none)"} — a missing value means the route went dynamic again`,
);
check(
  "homepage served from the edge cache on repeat view",
  homeVercelCache === "HIT",
  `x-vercel-cache: ${homeVercelCache || "(none)"} (Cache-Control: ${homeCache || "(none)"})`,
);
check(
  `homepage TTFB under ${TTFB_BUDGET_MS}ms`,
  second.ms < TTFB_BUDGET_MS,
  `${Math.round(second.ms)}ms`,
);

// --- 2. Functions execute in fra1, next to the Neon database ---
// x-vercel-id looks like `lhr1::fra1::req-id` when a function ran, and
// `lhr1::req-id` when the response came straight from the edge cache. Only the
// three-segment form names a region, and that region must be fra1.
function functionRegion(vercelId) {
  const parts = vercelId.split("::");
  return parts.length >= 3 ? parts[1] : "";
}

const homeRegion = functionRegion(second.response.headers.get("x-vercel-id") ?? "");
check(
  "no function region drift on the homepage response",
  homeRegion === "" || homeRegion === "fra1",
  homeRegion === ""
    ? "no function ran (served from the edge cache)"
    : `x-vercel-id region: ${homeRegion} (expected fra1)`,
);

// --- 3. Availability is edge-cached, with a stated staleness window ---
// Fetch twice: the first request for a given date populates the edge cache
// (MISS), the second must be served from it (HIT). A `no-store` endpoint stays
// MISS forever, which is exactly the regression this guards.
const availabilityUrl = `${BASE}/api/availability?date=${iranToday()}`;
const availabilityCold = await timedFetch(availabilityUrl);
const availability = await timedFetch(availabilityUrl);
const availabilityVercelCache = (
  availability.response.headers.get("x-vercel-cache") ?? ""
).toUpperCase();
const availabilityVercelId = availability.response.headers.get("x-vercel-id") ?? "";

check(
  "availability is edge-cached (no-store would show MISS forever)",
  availabilityVercelCache === "HIT",
  `x-vercel-cache: ${availabilityVercelCache || "(none)"} (first request: ${
    (availabilityCold.response.headers.get("x-vercel-cache") ?? "?").toUpperCase()
  })`,
);
check(
  "availability functions run in fra1, next to Neon",
  ["", "fra1"].includes(functionRegion(availabilityVercelId)),
  `x-vercel-id: ${availabilityVercelId || "(none)"} → region ${functionRegion(availabilityVercelId) || "(none, cache hit)"}`,
);
check(
  "availability responds without a server error",
  availability.response.status < 500,
  `HTTP ${availability.response.status}`,
);

// --- 4. The booking UI survived the static render ---
check(
  "booking form is present in the server-rendered HTML",
  first.body.includes("رزرو وقت"),
  first.body.includes("رزرو وقت") ? "found" : "missing",
);

// --- Report ---
console.log(`\nbrbitime performance guard — ${BASE}\n`);
for (const { name, ok, detail } of results) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}\n        ${detail}`);
}
console.log(
  `\n${failed === 0 ? "All guards passed." : `${failed} guard(s) failed.`}` +
    ` (${results.length - failed}/${results.length})\n`,
);

process.exit(failed === 0 ? 0 : 1);
