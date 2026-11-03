import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { llmProvider } from '@/lib/ai';

export const dynamic = 'force-dynamic';

/**
 * Readiness: can this instance serve traffic? Checks the database is reachable and migrated,
 * and the required settings are present. Reports only yes/no for each setting, never the values.
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
        console.error('[ready] database check failed', code);
    }

    const llm = llmProvider();
    const config = {
        nextauthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        nextauthUrl: Boolean(process.env.NEXTAUTH_URL),
        llmProvider: llm,
        groqApiKey: Boolean(process.env.GROQ_API_KEY),
        demoMode: process.env.DEMO_MODE === 'true',
        paymentDetails: Boolean(process.env.NEXT_PUBLIC_PAYMENT_UPI_ID || process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NUMBER),
    };
    const ok = database === 'ok' && config.nextauthSecret && (llm === 'mock' || config.groqApiKey);

    return NextResponse.json({ ok, database, config }, { status: ok ? 200 : 503 });
}
