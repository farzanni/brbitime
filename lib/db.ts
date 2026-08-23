import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Lazily-created Postgres client. Built lazily (instead of at import time)
 * so the app can compile and run without a database configured —
 * pages that actually touch the DB will fail loudly at request time,
 * and local builds don't need real credentials.
 */
let cached: NeonQueryFunction<false, false> | undefined;

export function getSql(): NeonQueryFunction<false, false> {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not configured");
    }
    cached = neon(url);
  }
  return cached;
}
