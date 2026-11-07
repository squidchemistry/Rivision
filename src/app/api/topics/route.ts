import { NextResponse } from 'next/server';
import { getTopics, createTopic } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { errorResponse, pageResponse, parseBody, parseQuery } from '@/lib/http';
import { intPageQuery, topicCreateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { limit, cursor } = parseQuery(intPageQuery, request);
        const topics = await getTopics(user.id, { take: limit + 1, cursor });
        return pageResponse(topics, limit);
    } catch (error) {
        return errorResponse(error, 'topics');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { name, content } = await parseBody(topicCreateBody, request);
        const topic = await createTopic(name, content, user.id);
        return NextResponse.json(topic, { status: 201 });
    } catch (error) {
        return errorResponse(error, 'topics');
    }
}
