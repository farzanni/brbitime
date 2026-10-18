<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Deployment

Vercel project `momo11/brbitime`, **git integration on: pushing to `main` deploys
production.** Do not `vercel deploy` by hand — the CLI path was only used to
bisect performance changes, and hand-deploying makes production diverge from git.

# Performance

**Read [`PERF.md`](./PERF.md) before proposing any performance work.** It holds
the measured baseline, the A/B methodology that produced it, and a ledger of
ideas that were measured and deliberately *not* attempted — so a discarded idea
stays discarded.

Two facts that are easy to get wrong:

- **Functions are pinned to `fra1`** (`vercel.json`) because the Neon database
  lives in `eu-central-1` (Frankfurt). Co-locating the function with the database
  is the point; changing either region without the other reintroduces a
  transatlantic hop on every request.
- **Lighthouse cannot see infrastructure changes.** It simulates a fixed RTT, so
  it reports the same score whether the page comes from an edge cache or a
  serverless function three thousand miles from the database. Do not use it to
  judge region, caching, or cold-start work, and do not revert such a change
  because the score held still.

Run `npm run perf:guard` after any change to routing, caching, or deployment
config. It asserts the homepage stays prerendered, functions stay in `fra1`, and
`/api/availability` stays edge-cached. It also runs in CI
(`.github/workflows/perf-guard.yml`).
