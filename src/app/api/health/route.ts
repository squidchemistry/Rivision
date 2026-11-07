import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness: the process is up and serving requests. No dependencies; see /api/ready for the database check. */
export async function GET() {
    return NextResponse.json({ status: 'ok', uptimeSec: Math.round(process.uptime()) });
}
