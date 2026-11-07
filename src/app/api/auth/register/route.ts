import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { ApiError, errorResponse, parseBody } from '@/lib/http';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { registerBody } from '@/lib/validation';

export async function POST(request: Request) {
    try {
        // 5 sign-ups per IP per hour
        await enforceRateLimit(`register:${clientIp(request)}`, 5, 60 * 60_000);

        const { email, password, name } = await parseBody(registerBody, request);

        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) throw new ApiError(409, 'An account with this email already exists. Sign in instead.');

        const user = await prisma.user.create({
            data: {
                email,
                name: name || email.split('@')[0],
                password: await bcrypt.hash(password, 12),
                profile: { create: { bio: 'New learner ready to revise!' } },
                studyStats: { create: {} },
            },
            select: { id: true, email: true, name: true },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        // Two sign-ups racing for the same email
        if ((error as { code?: string })?.code === 'P2002') {
            return errorResponse(new ApiError(409, 'An account with this email already exists. Sign in instead.'), 'register');
        }
        return errorResponse(error, 'register');
    }
}
