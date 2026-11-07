import { NextResponse } from 'next/server';
import { getQuestions, createQuestion } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, pageResponse, parseBody, parseQuery } from '@/lib/http';
import { questionCreateBody, questionsQuery } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { topicId, limit, cursor } = parseQuery(questionsQuery, request);
        const questions = await getQuestions(user.id, { topicId, take: limit + 1, cursor });
        return pageResponse(questions, limit);
    } catch (error) {
        return errorResponse(error, 'questions');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { topicId, questionText, difficulty } = await parseBody(questionCreateBody, request);
        const question = await createQuestion(user.id, topicId, questionText, difficulty);
        if (!question) throw new ApiError(404, 'Topic not found');
        return NextResponse.json(question, { status: 201 });
    } catch (error) {
        return errorResponse(error, 'questions');
    }
}
