import { ApiError } from './http';
import { prisma } from './prisma';

// Fixed-window limiter stored in Postgres, so the count is shared by every server instance.
// One atomic upsert per check: it starts a new window when the old one has expired, otherwise
// increments, and returns the result in the same statement (no read-then-write race).
// The window clock is the database's, so instances with skewed clocks agree.
// If the database call fails the check fails open: a limiter outage must not take sign-in down.
export type RateLimitResult = { ok: boolean; retryAfterSec: number };

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    try {
        const rows = await prisma.$queryRaw<{ count: number; retry: number }[]>`
            INSERT INTO "RateLimit" ("key", "count", "resetAt")
            VALUES (${key}, 1, now() + (${windowMs} * interval '1 millisecond'))
            ON CONFLICT ("key") DO UPDATE SET
                "count"   = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
                "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + (${windowMs} * interval '1 millisecond') ELSE "RateLimit"."resetAt" END
            RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("resetAt" - now())))::int AS "retry"`;
        const { count, retry } = rows[0];
        return { ok: count <= limit, retryAfterSec: Math.max(1, retry) };
    } catch (error) {
        console.error('[rate-limit] store unavailable, allowing request', error);
        return { ok: true, retryAfterSec: 0 };
    }
}

/** Throws a 429 ApiError when the limit is exceeded */
export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
    const { ok, retryAfterSec } = await rateLimit(key, limit, windowMs);
    if (!ok) {
        throw new ApiError(429, `Too many requests. Try again in ${retryAfterSec} seconds.`, 'rate_limited');
    }
}

/** Deletes expired windows. Cheap to call occasionally (e.g. from a cron or after sign-ups). */
export async function pruneRateLimits() {
    return prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" <= now()`;
}

/** Best-effort client IP from proxy headers */
export function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}
