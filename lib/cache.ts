import { PromosResponse } from "./types";

const TTL_MS = 5 * 60 * 1000; // 5 minutes — avoid hammering the convenience store sites on every page load

let cached: PromosResponse | null = null;
let cachedAt = 0;

export function getCached(): PromosResponse | null {
  if (!cached) return null;
  if (Date.now() - cachedAt > TTL_MS) return null;
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
  if (data.results.some((r) => r.ok && r.promos.length > 0)) {
    lastGood = data;
  }
}
