import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQuestionsFromContent } from '@/lib/ai';
import { extractTextFromFile, extractTextFromUrl, MAX_FILES, MAX_URLS } from '@/lib/extract';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { releaseQuota, reserveQuota, type Reservation } from '@/lib/usage';

const MAX_COUNT = 20;
const MAX_CONTENT_CHARS = 200_000;

/** Creates a topic from pasted text, files and links, then generates AI coding problems for it */
export async function POST(request: Request) {
    let reservation: Reservation | undefined;
    let generated = 0;
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        enforceRateLimit(`ai:${user.id}`, 30, 60 * 60_000);

        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            throw new ApiError(400, 'Expected a form upload');
        }

        const name = String(formData.get('name') || '').trim().slice(0, 120);
        if (!name) throw new ApiError(400, 'Topic name is required');

        const difficulty = parseInt(String(formData.get('difficulty') || '1'));
        if (![1, 2, 3].includes(difficulty)) throw new ApiError(400, 'Difficulty must be 1, 2 or 3');
        const count = parseInt(String(formData.get('count') || '5'));
        if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
            throw new ApiError(400, `Number of questions must be between 1 and ${MAX_COUNT}`);
        }

        const files = formData.getAll('file').filter((v): v is File => v instanceof File && v.size > 0);
        if (files.length > MAX_FILES) throw new ApiError(400, `Upload at most ${MAX_FILES} files at a time`);
        const urls = String(formData.get('urls') || '').split('\n').map(u => u.trim()).filter(Boolean);
        if (urls.length > MAX_URLS) throw new ApiError(400, `Add at most ${MAX_URLS} links at a time`);

        // Check the plan allows this many questions before doing any expensive work
        reservation = await reserveQuota(user.id, count);

        const parts = [String(formData.get('content') || '')];
        for (const file of files) parts.push(await extractTextFromFile(file));
        for (const url of urls) parts.push(await extractTextFromUrl(url));
        const fullContent = parts.join('\n\n').trim().slice(0, MAX_CONTENT_CHARS);
        if (!fullContent) throw new ApiError(400, 'No content provided (text, files, or URLs)');

        const questions = await generateQuestionsFromContent(fullContent, difficulty, count);
        generated = questions.length;

        // Topic and questions are saved together, so a failure never leaves an empty topic behind
        const topic = await prisma.topic.create({
            data: {
                name,
                content: fullContent,
                userId: user.id,
                questions: { create: questions.map(questionText => ({ questionText, difficulty, mode: 'coding' })) },
            },
        });

        const done = reservation;
        reservation = undefined;
        await releaseQuota(done, count - generated);
        return NextResponse.json({ success: true, topic: { id: topic.id, name: topic.name }, questionsGenerated: generated });
    } catch (error) {
        if (reservation) await releaseQuota(reservation, reservation.count - generated).catch(() => {});
        return errorResponse(error, 'generate');
    }
}
