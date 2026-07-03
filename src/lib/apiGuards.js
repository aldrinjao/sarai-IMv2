// Higher-order wrapper that adds rate limiting + response caching to an API
// route handler, so the expensive Earth Engine endpoints share one consistent
// policy instead of each re-implementing it.
//
//   export default withApiGuards(handler, { ttlMs, limit, windowMs });
//
// - Rate limiting applies to every request (429 with Retry-After when exceeded).
// - Caching applies only to successful (`success: true`, HTTP 200) GET responses.

const { getCache, setCache, cacheKeyFromReq, DEFAULT_TTL_MS } = require('./cache');
const { checkRateLimit, getClientId } = require('./rateLimit');

const withApiGuards = (handler, options = {}) => {
  const { ttlMs = DEFAULT_TTL_MS, limit, windowMs, cache = true } = options;

  return async (req, res) => {
    // 1. Rate limit every request.
    const clientId = getClientId(req);
    const rl = checkRateLimit(clientId, { limit, windowMs });
    res.setHeader('X-RateLimit-Limit', rl.limit);
    res.setHeader('X-RateLimit-Remaining', rl.remaining);

    if (!rl.allowed) {
      res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down and try again shortly.',
      });
    }

    // 2. Serve from cache on GET hits.
    const key = cache && req.method === 'GET' ? cacheKeyFromReq(req) : null;
    if (key) {
      const hit = getCache(key);
      if (hit) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(hit);
      }

      res.setHeader('X-Cache', 'MISS');
      // Intercept res.json so a successful response is stored on the way out.
      const sendJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode === 200 && body && body.success) {
          setCache(key, body, ttlMs);
        }
        return sendJson(body);
      };
    }

    return handler(req, res);
  };
};

module.exports = { withApiGuards };
