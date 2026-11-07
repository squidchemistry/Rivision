import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { errorResponse, pageResponse, parseQuery } from '@/lib/http';
import { adminPaymentsQuery } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** Admin only: payment requests, newest first, optionally filtered by ?status= */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    const { limit, cursor, status } = parseQuery(adminPaymentsQuery, request);

    const requests = await prisma.paymentRequest.findMany({
      where: status ? { status } : {},
      // Only the fields the admin page shows; never the password hash
      include: { user: { select: { id: true, name: true, email: true, plan: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return pageResponse(requests, limit);
  } catch (error) {
    return errorResponse(error, 'admin-payment-requests');
  }
}
