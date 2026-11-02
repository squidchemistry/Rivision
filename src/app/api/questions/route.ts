import { NextResponse } from 'next/server';
import { getQuestions, createQuestion } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const topicId = new URL(request.url).searchParams.get('topicId') || undefined;
        if (topicId && isNaN(parseInt(topicId))) {
            return NextResponse.json({ error: 'topicId must be a number' }, { status: 400 });
        }
        const questions = await getQuestions(user.id, topicId);
        return NextResponse.json(questions);
    } catch (error) {
        return errorResponse(error, 'questions');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { topicId, questionText, difficulty } = await request.json();

        const topicIdNum = parseInt(topicId);
        const text = typeof questionText === 'string' ? questionText.trim() : '';
        const level = difficulty === undefined ? 1 : parseInt(difficulty);

        if (isNaN(topicIdNum)) return NextResponse.json({ error: 'topicId is required' }, { status: 400 });
        if (!text) return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
        if (![1, 2, 3].includes(level)) return NextResponse.json({ error: 'Difficulty must be 1, 2 or 3' }, { status: 400 });

        const question = await createQuestion(user.id, topicIdNum, text, level);
        return NextResponse.json(question, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Topic not found') {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }
        return errorResponse(error, 'questions');
    }
}
