import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/http';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    if (user instanceof NextResponse) return user;

    // Fetch user's topics with question counts
    const topics = await prisma.topic.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({
      topics,
      totalTopics: topics.length,
      totalQuestions: topics.reduce((sum, t) => sum + t.questions.length, 0),
    });
  } catch (error) {
    return errorResponse(error, 'user-topics');
  }
}
