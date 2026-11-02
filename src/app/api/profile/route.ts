import { NextResponse } from 'next/server';
import { getProfileData } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/http';
import { getUsage } from '@/lib/usage';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await requireUser();
        if (user instanceof NextResponse) return user;
        const [profile, usage] = await Promise.all([getProfileData(user.id), getUsage(user.id)]);
        return NextResponse.json({
            ...profile,
            plan: {
                id: usage.plan.id,
                name: usage.plan.name,
                expiresAt: usage.planExpiresAt,
                questionsUsed: usage.used,
                questionsLimit: usage.limit,
            },
        });
    } catch (error) {
        return errorResponse(error, 'profile');
    }
}
