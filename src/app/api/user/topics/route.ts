import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { errorResponse, parseQuery } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { intPageQuery } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** The user's topics with their questions and stats, paginated by topic */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (user instanceof NextResponse) return user;
    const { limit, cursor } = parseQuery(intPageQuery, request);

    const [rows, totalTopics, totalQuestions] = await Promise.all([
      prisma.topic.findMany({
        where: { userId: user.id },
        include: {
          questions: {
            select: {
              id: true,
              questionText: true,
              difficulty: true,
              successCount: true,
              failureCount: true,
              lastReviewed: true,
            },
          },
          _count: {
            select: { questions: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.topic.count({ where: { userId: user.id } }),
      prisma.question.count({ where: { topic: { userId: user.id } } }),
    ]);
    const topics = rows.slice(0, limit);

    return NextResponse.json({
      topics,
      totalTopics,
      totalQuestions,
      nextCursor: rows.length > limit ? topics[topics.length - 1].id : null,
    });
  } catch (error) {
    return errorResponse(error, 'user-topics');
  }
}
