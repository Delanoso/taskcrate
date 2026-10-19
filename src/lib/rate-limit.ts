/** In-memory fixed-window limiter. One pm2 process serves TaskCrate, so this state is shared by every request. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function allow(key: string, max: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 50_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= max;
}

export function requestIp(req: Request) {
  return (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}
