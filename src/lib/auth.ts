import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { rateLimit } from './rate-limit';

export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

// Checked when the server starts, not during `next build` (CI may build without secrets)
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build' && !process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET must be set in production');
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const email = normalizeEmail(credentials.email);

                // Slow down password guessing: 10 attempts per email per 15 minutes
                if (!rateLimit(`login:${email}`, 10, 15 * 60_000).ok) {
                    throw new Error('Too many sign-in attempts. Try again in a few minutes.');
                }

                const user = await prisma.user.findUnique({ where: { email } });
                // Same response for unknown email and wrong password, so accounts can't be enumerated
                if (!user?.password) return null;
                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) return null;

                return { id: user.id, email: user.email, name: user.name, role: user.role };
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    pages: {
        signIn: '/auth',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
    },
};

export type AuthUser = { id: string; role: string };

/**
 * Resolves the signed-in user for an API route.
 * Returns a 401 response instead when there is no valid session,
 * so callers can do: `const user = await requireUser(); if (user instanceof NextResponse) return user;`
 */
export async function requireUser(): Promise<AuthUser | NextResponse> {
    const session = await getServerSession(authOptions);
    const id = session?.user?.id;
    if (!id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return { id, role: session.user.role ?? 'user' };
}

/**
 * Like requireUser, but also requires the admin role.
 * The role is read from the database, not the JWT, so a demoted admin loses access immediately.
 */
export async function requireAdmin(): Promise<AuthUser | NextResponse> {
    const user = await requireUser();
    if (user instanceof NextResponse) return user;

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
    });
    if (dbUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return { id: user.id, role: dbUser.role };
}
