import { NextResponse } from 'next/server';
import { updateTopic, deleteTopic, getTopicById } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { errorResponse, parseBody, parseWith } from '@/lib/http';
import { idParam, topicUpdateBody } from '@/lib/validation';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { id } = parseWith(idParam, await params);
        const topic = await getTopicById(id, user.id);
        if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(topic);
    } catch (error) {
        return errorResponse(error, 'topics-id');
    }
}

export async function PUT(req: Request, { params }: Context) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { id } = parseWith(idParam, await params);
        // The schema only lets editable fields through, so the body can't reassign userId or id
        const data = await parseBody(topicUpdateBody, req);
        const topic = await updateTopic(id, data, user.id);
        if (topic.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(topic);
    } catch (error) {
        return errorResponse(error, 'topics-id');
    }
}

export async function DELETE(_req: Request, { params }: Context) {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const { id } = parseWith(idParam, await params);
        const result = await deleteTopic(id, user.id);
        if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'topics-id');
    }
}
