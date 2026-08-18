import { PromosResponse } from "./types";

const FULL_TTL_MS = 5 * 60 * 1000; // 5 minutes when every store succeeded — avoid hammering the sites
// A failed store shouldn't stay "failed" in the cache for the full 5 minutes — a transient
// block (e.g. a bot-check challenge page that doesn't trigger on every request) should get
// retried again soon, not leave a visitor looking at a false "couldn't fetch" for minutes
// after the underlying site has already recovered on its own.
const PARTIAL_FAILURE_TTL_MS = 20 * 1000;

let cached: PromosResponse | null = null;
let cachedAt = 0;
let cachedTtlMs = FULL_TTL_MS;

export function getCached(): PromosResponse | null {
  if (!cached) return null;
  if (Date.now() - cachedAt > cachedTtlMs) return null;
  return cached;
}

// Keeps the most recent successful response even after TTL expiry, so a live-fetch failure
// can fall back to "stale but real" data instead of an empty screen.
let lastGood: PromosResponse | null = null;

export function getLastGood(): PromosResponse | null {
  return lastGood;
}

export function setCache(data: PromosResponse) {
  cached = data;
  cachedAt = Date.now();
  cachedTtlMs = data.results.every((r) => r.ok) ? FULL_TTL_MS : PARTIAL_FAILURE_TTL_MS;
  if (data.results.some((r) => r.ok && r.promos.length > 0)) {
    lastGood = data;
  }
}
