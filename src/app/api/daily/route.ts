import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDueQuestions, getTodayRevisionCount, rankTopicsForPractice, SESSION_SIZE } from '@/lib/db';
import { generateDailyQuestions, isRevisionMode } from '@/lib/ai';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { releaseQuota, reserveQuota, type Reservation } from '@/lib/usage';

// AI calls can take up to a minute; Vercel cuts functions off at this many seconds
export const maxDuration = 60;

export const dynamic = 'force-dynamic';

export type DailyQuestion = {
    questionId: number;
    question: string;
    topicId: number;
    topicName: string;
    /** true for a saved question that is due again; false for a new AI question */
    isReview: boolean;
};

/**
 * Builds today's session: saved questions that are due come first (spaced repetition),
 * then new AI questions on the weakest topics fill the rest, counted against the plan's monthly limit.
 */
export async function GET(request: Request) {
    let reservation: Reservation | undefined;
    let generated = 0;
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;

        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || 'coding';
        if (!isRevisionMode(mode)) throw new ApiError(400, 'mode must be coding or theory');
        const selectedTopicIds = searchParams.get('topics')
            ?.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);

        const todayCount = await getTodayRevisionCount(user.id);
        const due = await getDueQuestions(user.id, mode, selectedTopicIds, SESSION_SIZE);
        const questions: DailyQuestion[] = due.map(q => ({
            questionId: q.id,
            question: q.questionText,
            topicId: q.topic.id,
            topicName: q.topic.name,
            isReview: true,
        }));

        const needed = SESSION_SIZE - questions.length;
        if (needed > 0) {
            const topics = await rankTopicsForPractice(user.id, selectedTopicIds);
            if (topics.length === 0 && questions.length === 0) {
                return NextResponse.json({
                    questions: [],
                    todayCount,
                    message: 'No topics with study material found. Add a topic with content first!',
                });
            }

            if (topics.length > 0) {
                enforceRateLimit(`ai:${user.id}`, 30, 60 * 60_000);
                try {
                    reservation = await reserveQuota(user.id, needed, true);
                } catch (error) {
                    // Out of AI questions: still serve the due reviews if there are any
                    if (questions.length === 0) throw error;
                }

                if (reservation) {
                    const fresh = await generateDailyQuestions(topics, mode, reservation.count);
                    const topicNames = new Map(topics.map(t => [t.id, t.name]));
                    const saved = await prisma.$transaction(
                        fresh.map(q =>
                            prisma.question.create({
                                data: { topicId: q.topicId, questionText: q.question, mode, difficulty: 2 },
                            })
                        )
                    );
                    generated = saved.length;
                    for (const q of saved) {
                        questions.push({
                            questionId: q.id,
                            question: q.questionText,
                            topicId: q.topicId,
                            topicName: topicNames.get(q.topicId) ?? '',
                            isReview: false,
                        });
                    }
                }
            }
        }

        const done = reservation;
        reservation = undefined;
        if (done) await releaseQuota(done, done.count - generated);
        return NextResponse.json({ questions, todayCount, mode });
    } catch (error) {
        if (reservation) await releaseQuota(reservation, reservation.count - generated).catch(() => {});
        return errorResponse(error, 'daily');
    }
}
