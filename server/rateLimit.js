// A small in-memory limiter for the routes that call the AI, so a public
// demo can't run up the bill. Per IP: `max` calls per `windowMs`.
export const rateLimit = ({ max = 30, windowMs = 60_000 } = {}) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "?";
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      res.set("Retry-After", String(Math.ceil((windowMs - (now - recent[0])) / 1000)));
      return res.status(429).json({ error: "Slow down a little: too many requests. Try again in a minute." });
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return next();
  };
};
