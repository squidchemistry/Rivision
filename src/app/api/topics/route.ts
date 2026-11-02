import { NextResponse } from 'next/server';
import { getTopics, createTopic } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, readJson } from '@/lib/http';
import { MAX_TOPIC_CONTENT } from '@/lib/db';

export async function GET() {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const topics = await getTopics(user.id);
        return NextResponse.json(topics);
    } catch (error) {
        return errorResponse(error, 'topics');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { name, content } = await readJson(request);
        const topicName = typeof name === 'string' ? name.trim() : '';
        if (!topicName) throw new ApiError(400, 'Name is required');
        if (topicName.length > 120) throw new ApiError(400, 'Name must be 120 characters or fewer');
        const text = typeof content === 'string' ? content : '';
        if (text.length > MAX_TOPIC_CONTENT) throw new ApiError(413, 'Study material is too long (200,000 characters max)');
        const topic = await createTopic(topicName, text, user.id);
        return NextResponse.json(topic, { status: 201 });
    } catch (error) {
        return errorResponse(error, 'topics');
    }
}
