// Single source of truth for plans, prices and limits.
// The pricing page, payment page and API all read from here.

export type PlanId = 'free' | 'pro' | 'premium';
export type BillingCycle = 'monthly' | 'annual';

export type Plan = {
    id: PlanId;
    name: string;
    /** Price per month in rupees, billed monthly */
    monthlyPrice: number;
    /** AI-generated questions per calendar month; null means unlimited */
    monthlyQuestions: number | null;
};

export const PLANS: Record<PlanId, Plan> = {
    free: { id: 'free', name: 'Free', monthlyPrice: 0, monthlyQuestions: 20 },
    pro: { id: 'pro', name: 'Pro', monthlyPrice: 999, monthlyQuestions: 200 },
    premium: { id: 'premium', name: 'Premium', monthlyPrice: 1999, monthlyQuestions: null },
};

export const PAID_PLANS: PlanId[] = ['pro', 'premium'];
export const ANNUAL_DISCOUNT = 0.2;
export const BILLING_DAYS: Record<BillingCycle, number> = { monthly: 30, annual: 365 };

export function isPlanId(value: unknown): value is PlanId {
    return typeof value === 'string' && value in PLANS;
}

export function isBillingCycle(value: unknown): value is BillingCycle {
    return value === 'monthly' || value === 'annual';
}

/** Effective price per month shown on the pricing page */
export function pricePerMonth(planId: PlanId, cycle: BillingCycle): number {
    const base = PLANS[planId].monthlyPrice;
    return cycle === 'annual' ? Math.round(base * (1 - ANNUAL_DISCOUNT)) : base;
}

/** Amount the user pays up front for one billing period */
export function amountDue(planId: PlanId, cycle: BillingCycle): number {
    return cycle === 'annual' ? pricePerMonth(planId, cycle) * 12 : pricePerMonth(planId, cycle);
}

/** A paid plan whose period has ended falls back to Free */
export function effectivePlan(user: { plan: string; planExpiresAt: Date | null }, now = new Date()): Plan {
    if (!isPlanId(user.plan) || user.plan === 'free') return PLANS.free;
    if (user.planExpiresAt && user.planExpiresAt <= now) return PLANS.free;
    return PLANS[user.plan];
}

/** New expiry when a payment is approved: extend from the current expiry if the same plan is still active */
export function extendExpiry(
    current: { plan: string; planExpiresAt: Date | null },
    planId: PlanId,
    cycle: BillingCycle,
    now = new Date()
): Date {
    const stillActive = current.plan === planId && current.planExpiresAt && current.planExpiresAt > now;
    const start = stillActive ? current.planExpiresAt! : now;
    return new Date(start.getTime() + BILLING_DAYS[cycle] * 24 * 60 * 60 * 1000);
}
