import { NextResponse } from 'next/server';

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
