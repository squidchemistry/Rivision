import { prisma } from './prisma';
import { ApiError } from './http';
import { effectivePlan, type Plan } from './plans';
import { monthKey } from './time';

export type UsageSummary = {
    plan: Plan;
    planExpiresAt: Date | null;
    period: string;
    used: number;
    /** null when the plan is unlimited */
    limit: number | null;
    remaining: number | null;
};

export async function getUsage(userId: string, now = new Date()): Promise<UsageSummary> {
    const period = monthKey(now);
    const [user, usage] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true, planExpiresAt: true } }),
        prisma.aiUsage.findUnique({ where: { userId_period: { userId, period } } }),
    ]);
    const plan = effectivePlan(user, now);
    const used = usage?.questions ?? 0;
    const limit = plan.monthlyQuestions;
    return {
        plan,
        planExpiresAt: plan.id === 'free' ? null : user.planExpiresAt,
        period,
        used,
        limit,
        remaining: limit === null ? null : Math.max(0, limit - used),
    };
}

function quotaError(usage: UsageSummary) {
    return new ApiError(
        402,
        usage.remaining === 0
            ? `You've used all ${usage.limit} AI questions on the ${usage.plan.name} plan this month. Upgrade for more.`
            : `Only ${usage.remaining} AI questions left on the ${usage.plan.name} plan this month. Ask for fewer, or upgrade.`,
        'quota_exceeded'
    );
}

export type Reservation = { userId: string; period: string; count: number };

/**
 * Reserves `count` AI questions against this month's quota before calling the AI.
 * The check and the increment happen in one conditional UPDATE, so concurrent requests
 * can't push a user past their limit. With `allowPartial`, reserves whatever is left (at least 1).
 * Call `releaseQuota` for any reserved questions that were not generated.
 */
export async function reserveQuota(userId: string, count: number, allowPartial = false): Promise<Reservation> {
    const usage = await getUsage(userId);
    const { period, limit } = usage;

    await prisma.aiUsage.upsert({
        where: { userId_period: { userId, period } },
        create: { userId, period, questions: 0 },
        update: {},
    });

    if (limit === null) {
        await prisma.aiUsage.update({
            where: { userId_period: { userId, period } },
            data: { questions: { increment: count } },
        });
        return { userId, period, count };
    }

    const wanted = allowPartial ? Math.min(count, usage.remaining ?? 0) : count;
    if (wanted <= 0 || (!allowPartial && (usage.remaining ?? 0) < count)) throw quotaError(usage);

    const { count: updated } = await prisma.aiUsage.updateMany({
        where: { userId, period, questions: { lte: limit - wanted } },
        data: { questions: { increment: wanted } },
    });
    if (updated === 0) throw quotaError(await getUsage(userId));
    return { userId, period, count: wanted };
}

/** Gives back reserved questions that were not generated (AI failure, fewer results) */
export async function releaseQuota(reservation: Reservation, unused: number) {
    const n = Math.min(unused, reservation.count);
    if (n <= 0) return;
    await prisma.aiUsage.updateMany({
        where: { userId: reservation.userId, period: reservation.period, questions: { gte: n } },
        data: { questions: { decrement: n } },
    });
}
