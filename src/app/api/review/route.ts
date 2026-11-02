import { NextResponse } from 'next/server';
import { evaluateAnswers, isRevisionMode } from '@/lib/ai';
import { nextSchedule, recordRevision, SESSION_SIZE } from '@/lib/db';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, readJson } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';

const MAX_ANSWER_CHARS = 20_000;

type AnswerInput = { questionId: number; answer: string };

/** Grades a session's answers, reschedules each question, and records the session for streaks */
export async function POST(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        enforceRateLimit(`review:${user.id}`, 30, 60 * 60_000);

        const body = await readJson<{ answers?: unknown; mode?: unknown }>(request);
        const mode = body.mode ?? 'coding';
        if (!isRevisionMode(mode)) throw new ApiError(400, 'mode must be coding or theory');
        if (!Array.isArray(body.answers) || body.answers.length === 0) throw new ApiError(400, 'No answers provided');
        if (body.answers.length > SESSION_SIZE * 2) throw new ApiError(400, 'Too many answers in one session');

        const answers: AnswerInput[] = body.answers.map((a: { questionId?: unknown; answer?: unknown }) => ({
            questionId: Number(a?.questionId),
            answer: typeof a?.answer === 'string' ? a.answer.slice(0, MAX_ANSWER_CHARS) : '',
        }));

        // Only questions in this user's topics
        const questions = await prisma.question.findMany({
            where: { id: { in: answers.map(a => a.questionId).filter(Number.isInteger) }, topic: { userId: user.id } },
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
