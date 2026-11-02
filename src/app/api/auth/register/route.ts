import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { MIN_PASSWORD_LENGTH, normalizeEmail } from '@/lib/auth';
import { ApiError, errorResponse, readJson } from '@/lib/http';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
    try {
        // 5 sign-ups per IP per hour
        enforceRateLimit(`register:${clientIp(request)}`, 5, 60 * 60_000);

        const body = await readJson<{ email?: string; password?: string; name?: string }>(request);
        const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';

        if (!EMAIL_RE.test(email) || email.length > 254) throw new ApiError(400, 'Enter a valid email address');
        if (password.length < MIN_PASSWORD_LENGTH) {
            throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }
        if (password.length > 200) throw new ApiError(400, 'Password is too long');

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
