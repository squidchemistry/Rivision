import { prisma } from './prisma';
import { addDays, dayKey, daysBetween, startOfToday } from './time';

export const SESSION_SIZE = 5;
export const PASS_SCORE = 60;
export { MAX_TOPIC_CONTENT } from './validation';
const MAX_INTERVAL_DAYS = 180;

// ──────────────── TOPICS ────────────────

/** One page of the user's topics, newest first. `take` and `cursor` (the last id seen) page through them. */
export async function getTopics(userId: string, page: { take?: number; cursor?: number } = {}) {
    return prisma.topic.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { _count: { select: { questions: true } } },
        take: page.take,
        ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
}

export async function getTopicById(id: number, userId: string) {
    return prisma.topic.findFirst({ where: { id, userId }, include: { questions: true } });
}

export async function createTopic(name: string, content: string, userId: string) {
    return prisma.topic.create({ data: { name, content, userId } });
}

export async function updateTopic(id: number, data: { name?: string; content?: string; priority?: number }, userId: string) {
    return prisma.topic.updateMany({ where: { id, userId }, data });
}

export async function deleteTopic(id: number, userId: string) {
    return prisma.topic.deleteMany({ where: { id, userId } });
}

// ──────────────── QUESTIONS ────────────────

/** One page of the user's questions, newest first, optionally for one topic */
export async function getQuestions(userId: string, page: { topicId?: number; take?: number; cursor?: number } = {}) {
    return prisma.question.findMany({
        where: page.topicId ? { topicId: page.topicId, topic: { userId } } : { topic: { userId } },
        include: { topic: { select: { id: true, name: true } } },
        orderBy: { id: 'desc' },
        take: page.take,
        ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
}

/** Adds a question to one of the user's topics; null when the topic isn't theirs */
export async function createQuestion(userId: string, topicId: number, questionText: string, difficulty: number = 1) {
    const topic = await prisma.topic.findFirst({ where: { id: topicId, userId }, select: { id: true } });
    if (!topic) return null;
    return prisma.question.create({
        data: { topicId, questionText, difficulty, mode: 'theory' },
    });
}

// ──────────────── DAILY SESSION ────────────────

/**
 * Topics ranked for new AI questions: weakest (lowest success rate) and highest priority first,
 * then least practised. Only topics with study material can be used to generate questions.
 */
export async function rankTopicsForPractice(userId: string, selectedTopicIds?: number[]) {
    const topics = await prisma.topic.findMany({
        where: {
            userId,
            NOT: { content: '' },
            ...(selectedTopicIds?.length ? { id: { in: selectedTopicIds } } : {}),
        },
        select: {
            id: true,
            name: true,
            content: true,
            priority: true,
            questions: { select: { successCount: true, failureCount: true, lastReviewed: true } },
        },
    });

    return topics
        .map(t => {
            const totalSuccess = t.questions.reduce((s, q) => s + q.successCount, 0);
            const totalFailure = t.questions.reduce((s, q) => s + q.failureCount, 0);
            const totalAttempts = totalSuccess + totalFailure;
            const successRate = totalAttempts > 0 ? totalSuccess / totalAttempts : 0.5;
            const combinedScore = (1 - successRate) * ((t.priority || 2) / 2);
            return { topic: t, combinedScore, totalAttempts };
        })
        .sort((a, b) =>
            Math.abs(b.combinedScore - a.combinedScore) > 0.05
                ? b.combinedScore - a.combinedScore
                : a.totalAttempts - b.totalAttempts
        )
        .map(ts => ts.topic);
}

/** Saved questions whose next review is due, oldest first */
export async function getDueQuestions(userId: string, mode: string, selectedTopicIds: number[] | undefined, limit: number) {
    return prisma.question.findMany({
        where: {
            mode,
            nextReviewAt: { lte: new Date() },
            topic: { userId, ...(selectedTopicIds?.length ? { id: { in: selectedTopicIds } } : {}) },
        },
        orderBy: { nextReviewAt: 'asc' },
        take: limit,
        include: { topic: { select: { id: true, name: true } } },
    });
}

/**
 * Next review date after an answer is graded.
 * A pass doubles the interval (x2.5 for a strong pass); a fail resets it to tomorrow.
 */
export function nextSchedule(currentInterval: number, score: number, now = new Date()) {
    const passed = score >= PASS_SCORE;
    const interval = passed
        ? Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(currentInterval * (score >= 85 ? 2.5 : 2))))
        : 1;
    return { passed, reviewInterval: interval, nextReviewAt: addDays(now, interval) };
}

// ──────────────── STUDY STATS ────────────────

export async function getOrCreateStudyStats(userId: string) {
    return prisma.studyStats.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function getTodayRevisionCount(userId: string): Promise<number> {
    return prisma.revisionHistory.count({
        where: { date: { gte: startOfToday() }, userId },
    });
}

/** Records a finished session and updates the streak (calendar days in APP_TIMEZONE) */
export async function recordRevision(averageScore: number, questionsAnswered: number, topicsSummary: string, userId: string) {
    const now = new Date();
    const stats = await getOrCreateStudyStats(userId);

    let currentStreak = stats.currentStreak;
    if (!stats.lastStudyDate) {
        currentStreak = 1;
    } else {
        const gap = daysBetween(dayKey(stats.lastStudyDate), dayKey(now));
        if (gap === 1) currentStreak += 1;
        else if (gap > 1 || currentStreak === 0) currentStreak = 1;
        // gap 0: already studied today, streak unchanged
    }

    await prisma.$transaction([
        prisma.studyStats.update({
            where: { id: stats.id },
            data: {
                currentStreak,
                longestStreak: Math.max(stats.longestStreak, currentStreak),
                totalRevisions: { increment: 1 },
                lastStudyDate: now,
            },
        }),
        prisma.revisionHistory.create({
            data: { averageScore, questionsAnswered, topicsSummary, date: now, userId },
        }),
    ]);
}

/** The streak as it stands today: a streak whose last study day is before yesterday has lapsed */
function liveStreak(stats: { currentStreak: number; lastStudyDate: Date | null }) {
    if (!stats.lastStudyDate) return 0;
    return daysBetween(dayKey(stats.lastStudyDate), dayKey(new Date())) > 1 ? 0 : stats.currentStreak;
}

// ──────────────── PROFILE DATA ────────────────

export async function getProfileData(userId: string) {
    const yearAgo = addDays(new Date(), -365);
    const [stats, topicsCount, questionsCount, totals, lastYear, recentActivity, profileData] = await Promise.all([
        getOrCreateStudyStats(userId),
        prisma.topic.count({ where: { userId } }),
        prisma.question.count({ where: { topic: { userId } } }),
        prisma.revisionHistory.aggregate({
            where: { userId },
            _avg: { averageScore: true },
            _sum: { questionsAnswered: true },
        }),
        prisma.revisionHistory.findMany({ where: { userId, date: { gte: yearAgo } }, select: { date: true } }),
        prisma.revisionHistory.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 10 }),
        prisma.profile.findUnique({ where: { userId } }),
    ]);

    const avgScore = totals._avg.averageScore ?? 0;
    const totalQuestionsSolved = totals._sum.questionsAnswered ?? 0;

    const perDay = new Map<string, number>();
    for (const r of lastYear) {
        const key = dayKey(r.date);
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    const calendarData: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
        const key = dayKey(addDays(today, -i));
        calendarData.push({ date: key, count: perDay.get(key) ?? 0 });
    }

    const currentStreak = liveStreak(stats);
    const achievements = computeAchievements(stats.longestStreak, stats.totalRevisions, avgScore, topicsCount, totalQuestionsSolved);

    return {
        currentStreak,
        longestStreak: stats.longestStreak,
        totalRevisions: stats.totalRevisions,
        topicsCount,
        questionsCount,
        totalQuestionsSolved,
        averageScore: Math.round(avgScore),
        calendarData,
        recentActivity,
        achievements,
        bio: profileData?.bio || 'No bio yet',
    };
}

function computeAchievements(longestStreak: number, totalRevisions: number, avgScore: number, topicsCount: number, totalQuestionsSolved: number) {
    return [
        { id: 'streak7', emoji: '🔥', label: '7-Day Streak', unlocked: longestStreak >= 7 },
        { id: 'rev10', emoji: '📚', label: '10 Revisions', unlocked: totalRevisions >= 10 },
        { id: 'score80', emoji: '🎯', label: '80% Average', unlocked: avgScore >= 80 },
        { id: 'topics5', emoji: '🧠', label: '5 Topics', unlocked: topicsCount >= 5 },
        { id: 'streak30', emoji: '💎', label: '30-Day Streak', unlocked: longestStreak >= 30 },
        { id: 'q50', emoji: '⚡', label: '50 Questions', unlocked: totalQuestionsSolved >= 50 },
    ];
}
