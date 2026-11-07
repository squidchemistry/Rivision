import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getUsage, releaseQuota, reserveQuota } from '@/lib/usage';
import { deleteUsers, makeUser } from './db.test-helpers';

const created: string[] = [];
afterAll(async () => {
    await deleteUsers(created);
    await prisma.$disconnect();
});

async function user(overrides = {}) {
    const u = await makeUser(overrides);
    created.push(u.id);
    return u;
}

describe('AI question quota', () => {
    it('free plan allows 20 a month; reservations and releases adjust usage', async () => {
        const u = await user();
        expect((await getUsage(u.id)).remaining).toBe(20);
        const r = await reserveQuota(u.id, 5);
        expect((await getUsage(u.id)).used).toBe(5);
        await releaseQuota(r, 3);
        expect((await getUsage(u.id)).used).toBe(2);
    });

    it('rejects a request that would exceed the limit with 402', async () => {
        const u = await user();
        await reserveQuota(u.id, 18);
        await expect(reserveQuota(u.id, 5)).rejects.toMatchObject({ status: 402, code: 'quota_exceeded' });
        expect((await getUsage(u.id)).used).toBe(18);
    });

    it('allowPartial reserves whatever is left', async () => {
        const u = await user();
        await reserveQuota(u.id, 18);
        expect((await reserveQuota(u.id, 5, true)).count).toBe(2);
        await expect(reserveQuota(u.id, 5, true)).rejects.toMatchObject({ status: 402 });
    });

    it('parallel requests can never push a user past the limit', async () => {
        const u = await user();
        const results = await Promise.allSettled(Array.from({ length: 12 }, () => reserveQuota(u.id, 5)));
        const granted = results.filter(r => r.status === 'fulfilled').length;
        expect(granted).toBe(4); // 4 x 5 = 20
        expect((await getUsage(u.id)).used).toBe(20);
    });

    it('premium is unlimited and an expired pro plan counts as free', async () => {
        const premium = await user({ plan: 'premium', planExpiresAt: new Date(Date.now() + 86_400_000) });
        await reserveQuota(premium.id, 500);
        expect((await getUsage(premium.id)).limit).toBeNull();

        const lapsed = await user({ plan: 'pro', planExpiresAt: new Date(Date.now() - 1000) });
        expect((await getUsage(lapsed.id)).limit).toBe(20);
    });
});
