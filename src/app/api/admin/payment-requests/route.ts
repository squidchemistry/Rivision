import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const requests = await prisma.paymentRequest.findMany({
      // Only the fields the admin page shows; never the password hash
      include: { user: { select: { id: true, name: true, email: true, plan: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Fetch admin payment requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment requests' },
      { status: 500 }
    );
  }
}
