// Simple in-process TTL cache.
//
// The app runs as a single long-lived PM2 process, so an in-memory Map is a
// good fit for memoizing expensive Earth Engine responses. If the app is ever
// scaled to multiple workers (pm2 cluster mode) each worker keeps its own
// cache — correct, just a lower hit rate — at which point a shared store
// (Redis) would be the upgrade.

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 500; // guard against unbounded growth

const store = new Map();

const isExpired = (entry) => Date.now() > entry.expiresAt;

// Drop expired entries, then oldest entries if still over the cap.
const prune = () => {
  for (const [key, entry] of store) {
    if (isExpired(entry)) store.delete(key);
  }
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
};

const getCache = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (store.size > MAX_ENTRIES) prune();
};

// Build a stable cache key from an API route + its query params, independent
// of parameter order.
const cacheKeyFromReq = (req) => {
  const path = (req.url || '').split('?')[0];
  const entries = Object.entries(req.query || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  return `${path}?${entries.join('&')}`;
};

module.exports = { getCache, setCache, cacheKeyFromReq, DEFAULT_TTL_MS };
