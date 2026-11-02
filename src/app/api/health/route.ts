import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Deployment check: is the database reachable, migrated, and is the app configured?
 * Reports only yes/no for each setting, never the values.
 */
export async function GET() {
    let database: 'ok' | 'unreachable' | 'not_migrated' = 'ok';
    try {
        await prisma.$queryRaw`SELECT 1`;
        await prisma.user.count({ take: 1 });
    } catch (error) {
        const code = (error as { code?: string })?.code;
        // P2021: table does not exist, i.e. migrations have not run
        database = code === 'P2021' ? 'not_migrated' : 'unreachable';
        console.error('[health] database check failed', code);
    }

    const config = {
        nextauthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        nextauthUrl: Boolean(process.env.NEXTAUTH_URL),
        groqApiKey: Boolean(process.env.GROQ_API_KEY),
        paymentDetails: Boolean(process.env.NEXT_PUBLIC_PAYMENT_UPI_ID || process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NUMBER),
    };
    const ok = database === 'ok' && config.nextauthSecret && config.groqApiKey;

    return NextResponse.json({ ok, database, config }, { status: ok ? 200 : 503 });
}
