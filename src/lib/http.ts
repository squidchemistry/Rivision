import { NextResponse } from 'next/server';
import type { z } from 'zod';

/** An error whose message is safe to show the user */
export class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) {
        super(message);
    }
}

/**
 * Turns any thrown error into a JSON response.
 * ApiErrors keep their status and message; anything else is logged and returned as a generic 500,
 * so database and library internals never reach the client.
 */
export function errorResponse(error: unknown, context: string) {
    if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error(`[${context}]`, error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

/** Reads a JSON body, turning malformed JSON into a 400 */
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
    try {
        return await request.json();
    } catch {
        throw new ApiError(400, 'Request body must be valid JSON');
    }
}

/** Validates `data` against a zod schema, turning the first problem into a 400 with a readable message */
export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const issue = result.error.issues[0];
        throw new ApiError(400, issue?.message || 'Invalid request', 'invalid_request');
    }
    return result.data;
}

/** Reads and validates a JSON body */
export async function parseBody<T>(schema: z.ZodType<T>, request: Request): Promise<T> {
    return parseWith(schema, await readJson<unknown>(request));
}

/** Validates the query string */
export function parseQuery<T>(schema: z.ZodType<T>, request: Request): T {
    return parseWith(schema, Object.fromEntries(new URL(request.url).searchParams));
}

/**
 * JSON array response for a cursor-paginated list. The body stays a plain array (what the pages expect);
 * the cursor for the next page, if any, is in the X-Next-Cursor header.
 */
export function pageResponse<T extends { id: string | number }>(rows: T[], limit: number) {
    const items = rows.slice(0, limit);
    const response = NextResponse.json(items);
    if (rows.length > limit) response.headers.set('X-Next-Cursor', String(items[items.length - 1].id));
    return response;
}
