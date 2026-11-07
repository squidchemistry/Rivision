import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { errorResponse, pageResponse, parseQuery } from '@/lib/http';
import { pageQuery } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** Admin only: users with their latest payment request, newest first */
export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    const { limit, cursor } = parseQuery(pageQuery, request);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        createdAt: true,
        paymentRequests: {
          select: {
            id: true,
            status: true,
            plan: true,
            amount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return pageResponse(users, limit);
  } catch (error) {
    return errorResponse(error, 'admin-users');
  }
}
