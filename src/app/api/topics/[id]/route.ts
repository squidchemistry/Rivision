import { NextResponse } from 'next/server';
import { updateTopic, deleteTopic, getTopicById } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, readJson } from '@/lib/http';
import { MAX_TOPIC_CONTENT } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { id } = await params;
        const topic = await getTopicById(parseInt(id), user.id);
        if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(topic);
    } catch (error) {
        return errorResponse(error, 'topics-id');
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { id } = await params;
        // Only pass through editable fields, so the body can't reassign userId or id
        const { name, content, priority } = await readJson(req);
        const data: { name?: string; content?: string; priority?: number } = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
                throw new ApiError(400, 'Name must be 1-120 characters');
            }
            data.name = name.trim();
        }
        if (content !== undefined) {
            if (typeof content !== 'string' || content.length > MAX_TOPIC_CONTENT) {
                throw new ApiError(400, 'Study material is too long (200,000 characters max)');
            }
            data.content = content;
        }
        if (priority !== undefined) {
            if (typeof priority !== 'number' || ![1, 2, 3].includes(priority)) throw new ApiError(400, 'Priority must be 1, 2 or 3');
            data.priority = priority;
        }
        const topic = await updateTopic(parseInt(id), data, user.id);
        if (topic.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(topic);
    } catch (error) {
        return errorResponse(error, 'topics-id');
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { id } = await params;
        const result = await deleteTopic(parseInt(id), user.id);
        if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'topics-id');
    }
}
