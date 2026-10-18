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
const first = await timedFetch(`${BASE}/`);
const second = await timedFetch(`${BASE}/`);
const homeCache = second.response.headers.get("cache-control") ?? "";
const homeVercelCache = (second.response.headers.get("x-vercel-cache") ?? "").toUpperCase();

check(
  "homepage is CDN-cacheable (Cache-Control has s-maxage)",
  /s-maxage=\d+/.test(homeCache),
  `Cache-Control: ${homeCache || "(none)"}`,
);
check(
  "homepage served from the edge cache on repeat view",
  homeVercelCache === "HIT",
  `x-vercel-cache: ${homeVercelCache || "(none)"}`,
);
check(
  `homepage TTFB under ${TTFB_BUDGET_MS}ms`,
  second.ms < TTFB_BUDGET_MS,
  `${Math.round(second.ms)}ms`,
);

// --- 2. Functions execute in fra1, next to the Neon database ---
const vercelId = second.response.headers.get("x-vercel-id") ?? "";
check(
  "functions execute in fra1 (co-located with Neon eu-central-1)",
  vercelId.includes("fra1"),
  `x-vercel-id: ${vercelId || "(none)"}`,
);

// --- 3. Availability is edge-cached, with a stated staleness window ---
const availability = await timedFetch(`${BASE}/api/availability?date=${iranToday()}`);
const availabilityCache = availability.response.headers.get("cache-control") ?? "";
check(
  "availability is edge-cached with a bounded staleness window",
  /s-maxage=\d+/.test(availabilityCache) && /stale-while-revalidate=\d+/.test(availabilityCache),
  `Cache-Control: ${availabilityCache || "(none)"}`,
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
