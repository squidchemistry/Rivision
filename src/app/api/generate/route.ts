import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQuestionsFromContent } from '@/lib/ai';
import { extractTextFromFile, extractTextFromUrl, MAX_FILES, MAX_URLS } from '@/lib/extract';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, parseWith } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { releaseQuota, reserveQuota, type Reservation } from '@/lib/usage';
import { generateForm, MAX_TOPIC_CONTENT } from '@/lib/validation';

// AI calls can take up to a minute; Vercel cuts functions off at this many seconds
export const maxDuration = 60;

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

        // Text fields are validated like a JSON body; empty fields fall back to their defaults
        const fields = Object.fromEntries(
            ['name', 'difficulty', 'count', 'content', 'urls'].flatMap(key => {
                const value = formData.get(key);
                return typeof value === 'string' && value !== '' ? [[key, value]] : [];
            })
        );
        const { name, difficulty, count, content, urls } = parseWith(generateForm, fields);

        const files = formData.getAll('file').filter((v): v is File => v instanceof File && v.size > 0);
        if (files.length > MAX_FILES) throw new ApiError(400, `Upload at most ${MAX_FILES} files at a time`);
        if (urls.length > MAX_URLS) throw new ApiError(400, `Add at most ${MAX_URLS} links at a time`);

        // Check the plan allows this many questions before doing any expensive work
        reservation = await reserveQuota(user.id, count);

        const parts = [content];
        for (const file of files) parts.push(await extractTextFromFile(file));
        for (const url of urls) parts.push(await extractTextFromUrl(url));
        const fullContent = parts.join('\n\n').trim().slice(0, MAX_TOPIC_CONTENT);
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
