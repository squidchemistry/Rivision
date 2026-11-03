import { NextResponse } from 'next/server';
import { evaluateAnswers } from '@/lib/ai';
import { nextSchedule, recordRevision } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, parseBody } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { reviewBody } from '@/lib/validation';

// AI calls can take up to a minute; Vercel cuts functions off at this many seconds
export const maxDuration = 60;

/** Grades a session's answers, reschedules each question, and records the session for streaks */
export async function POST(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        enforceRateLimit(`review:${user.id}`, 30, 60 * 60_000);

        const { mode, answers } = await parseBody(reviewBody, request);

        // Only questions in this user's topics
        const questions = await prisma.question.findMany({
            where: { id: { in: answers.map(a => a.questionId) }, topic: { userId: user.id } },
            include: { topic: { select: { name: true, content: true } } },
        });
        const byId = new Map(questions.map(q => [q.id, q]));
        const graded = answers.filter(a => byId.has(a.questionId));
        if (graded.length === 0) throw new ApiError(400, 'None of these questions belong to your topics');

        const reports = await evaluateAnswers(
            graded.map(a => {
                const q = byId.get(a.questionId)!;
                return { question: q.questionText, answer: a.answer, topicName: q.topic.name, topicContent: q.topic.content };
            }),
            mode
        );

        const now = new Date();
        await prisma.$transaction(
            graded.map((a, i) => {
                const q = byId.get(a.questionId)!;
                const { passed, reviewInterval, nextReviewAt } = nextSchedule(q.reviewInterval, reports[i].score, now);
                return prisma.question.update({
                    where: { id: q.id },
                    data: {
                        successCount: passed ? { increment: 1 } : undefined,
                        failureCount: passed ? undefined : { increment: 1 },
                        reviewInterval,
                        nextReviewAt,
                        lastReviewed: now,
                    },
                });
            })
        );

        const avgScore = reports.reduce((s, r) => s + r.score, 0) / reports.length;
        const topicsSummary = [...new Set(graded.map(a => byId.get(a.questionId)!.topic.name))].join(', ');
        await recordRevision(avgScore, graded.length, topicsSummary, user.id);

        return NextResponse.json({
            reports: reports.map((r, i) => ({ ...r, questionId: graded[i].questionId })),
            averageScore: Math.round(avgScore),
        });
    } catch (error) {
        return errorResponse(error, 'review');
    }
}
