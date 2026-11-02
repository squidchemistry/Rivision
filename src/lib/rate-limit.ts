import { ApiError } from './http';

// Fixed-window limiter kept in memory. It protects each server instance against bursts
// (password guessing, sign-up spam, AI request floods). With several instances, each keeps its own
// count; swap the store for Redis (e.g. Upstash) to share limits. Plan quotas are enforced in the
// database separately (see usage.ts), so they hold across instances.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
        if (buckets.size >= MAX_KEYS) {
            for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
            if (buckets.size >= MAX_KEYS) buckets.clear();
        }
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
    }
    bucket.count++;
    return { ok: bucket.count <= limit, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
}

/** Throws a 429 ApiError when the limit is exceeded */
export function enforceRateLimit(key: string, limit: number, windowMs: number) {
    const { ok, retryAfterSec } = rateLimit(key, limit, windowMs);
    if (!ok) {
        throw new ApiError(429, `Too many requests. Try again in ${retryAfterSec} seconds.`, 'rate_limited');
    }
}

/** Best-effort client IP from proxy headers */
export function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}
