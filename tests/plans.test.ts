import { describe, expect, it } from 'vitest';
import { PLANS, amountDue, effectivePlan, extendExpiry, pricePerMonth } from '@/lib/plans';

const DAY = 86_400_000;

describe('pricing', () => {
    it('applies 20% off for annual billing and charges 12 months up front', () => {
        expect(pricePerMonth('pro', 'monthly')).toBe(999);
        expect(pricePerMonth('pro', 'annual')).toBe(799);
        expect(amountDue('pro', 'annual')).toBe(799 * 12);
        expect(amountDue('premium', 'monthly')).toBe(1999);
    });
});

describe('effectivePlan', () => {
    const now = new Date('2026-11-07T00:00:00Z');
    it('keeps a paid plan until it expires, then falls back to free', () => {
        expect(effectivePlan({ plan: 'pro', planExpiresAt: new Date(+now + DAY) }, now)).toBe(PLANS.pro);
        expect(effectivePlan({ plan: 'pro', planExpiresAt: new Date(+now - 1) }, now)).toBe(PLANS.free);
        expect(effectivePlan({ plan: 'pro', planExpiresAt: new Date(+now) }, now)).toBe(PLANS.free);
    });
    it('treats unknown or free plans as free', () => {
        expect(effectivePlan({ plan: 'gold', planExpiresAt: null }, now)).toBe(PLANS.free);
        expect(effectivePlan({ plan: 'free', planExpiresAt: null }, now)).toBe(PLANS.free);
    });
});

describe('extendExpiry', () => {
    const now = new Date('2026-11-07T00:00:00Z');
    it('starts from now when there is no active period', () => {
        expect(+extendExpiry({ plan: 'free', planExpiresAt: null }, 'pro', 'monthly', now)).toBe(+now + 30 * DAY);
        expect(+extendExpiry({ plan: 'pro', planExpiresAt: new Date(+now - DAY) }, 'pro', 'annual', now)).toBe(+now + 365 * DAY);
    });
    it('extends an active period of the same plan, but not a different plan', () => {
        const end = new Date(+now + 10 * DAY);
        expect(+extendExpiry({ plan: 'pro', planExpiresAt: end }, 'pro', 'monthly', now)).toBe(+end + 30 * DAY);
        expect(+extendExpiry({ plan: 'pro', planExpiresAt: end }, 'premium', 'monthly', now)).toBe(+now + 30 * DAY);
    });
});
