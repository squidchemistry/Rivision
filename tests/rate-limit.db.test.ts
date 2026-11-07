import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, pruneRateLimits, rateLimit } from '@/lib/rate-limit';

const prefix = `t-${Date.now()}-`;
afterAll(async () => {
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: prefix } } });
    await prisma.$disconnect();
});

describe('rate limit (shared in Postgres)', () => {
    it('allows up to the limit, then blocks with a retry time', async () => {
        const key = `${prefix}basic`;
        for (let i = 0; i < 3; i++) expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
        const blocked = await rateLimit(key, 3, 60_000);
        expect(blocked.ok).toBe(false);
        expect(blocked.retryAfterSec).toBeGreaterThan(0);
        expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
    });

    it('keeps keys independent', async () => {
        await rateLimit(`${prefix}a`, 1, 60_000);
        expect((await rateLimit(`${prefix}a`, 1, 60_000)).ok).toBe(false);
        expect((await rateLimit(`${prefix}b`, 1, 60_000)).ok).toBe(true);
    });

    it('counts parallel requests exactly (no lost updates)', async () => {
        const key = `${prefix}parallel`;
        const results = await Promise.all(Array.from({ length: 25 }, () => rateLimit(key, 10, 60_000)));
        expect(results.filter(r => r.ok)).toHaveLength(10);
        expect(results.filter(r => !r.ok)).toHaveLength(15);
    });

    it('starts a new window once the old one has expired', async () => {
        const key = `${prefix}expiry`;
        await rateLimit(key, 1, 60_000);
        expect((await rateLimit(key, 1, 60_000)).ok).toBe(false);
        await prisma.rateLimit.update({ where: { key }, data: { resetAt: new Date(Date.now() - 1000) } });
        expect((await rateLimit(key, 1, 60_000)).ok).toBe(true);
    });

    it('enforceRateLimit throws a 429', async () => {
        const key = `${prefix}enforce`;
        await enforceRateLimit(key, 1, 60_000);
        await expect(enforceRateLimit(key, 1, 60_000)).rejects.toMatchObject({ status: 429, code: 'rate_limited' });
    });

    it('prunes expired windows only', async () => {
        await prisma.rateLimit.create({ data: { key: `${prefix}old`, count: 1, resetAt: new Date(Date.now() - 5000) } });
        await prisma.rateLimit.create({ data: { key: `${prefix}live`, count: 1, resetAt: new Date(Date.now() + 60_000) } });
        await pruneRateLimits();
        expect(await prisma.rateLimit.findUnique({ where: { key: `${prefix}old` } })).toBeNull();
        expect(await prisma.rateLimit.findUnique({ where: { key: `${prefix}live` } })).not.toBeNull();
    });
});
