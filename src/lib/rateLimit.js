// Fixed-window, per-client in-process rate limiter.
//
// Protects the expensive Earth Engine endpoints from being hammered (which
// burns GEE quota and compute). Single-process in-memory state, same tradeoff
// as the cache: fine for one PM2 instance; move to a shared store for a cluster.

const DEFAULT_LIMIT = 30; // requests
const DEFAULT_WINDOW_MS = 60 * 1000; // per minute
const MAX_TRACKED = 10000; // guard against unbounded growth from many IPs

const windows = new Map(); // clientId -> { count, resetAt }

// Read the caller's IP, honoring the reverse proxy (nginx) in front of the app.
const getClientId = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

const checkRateLimit = (clientId, { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = {}) => {
  const now = Date.now();
  let win = windows.get(clientId);

  if (!win || now > win.resetAt) {
    win = { count: 0, resetAt: now + windowMs };
    windows.set(clientId, win);
  }

  win.count += 1;
  const allowed = win.count <= limit;

  // Opportunistic cleanup so expired windows don't accumulate forever.
  if (windows.size > MAX_TRACKED) {
    for (const [id, w] of windows) {
      if (now > w.resetAt) windows.delete(id);
    }
  }

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - win.count),
    retryAfterMs: allowed ? 0 : win.resetAt - now,
  };
};

module.exports = { checkRateLimit, getClientId, DEFAULT_LIMIT, DEFAULT_WINDOW_MS };
