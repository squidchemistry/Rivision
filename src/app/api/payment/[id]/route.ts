import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ApiError, errorResponse, readJson } from '@/lib/http';
import { extendExpiry, isBillingCycle, isPlanId } from '@/lib/plans';

/** Admin approves or rejects a pending payment. Approval upgrades the plan for the paid period. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;

    const { id } = await params;
    const { status } = await readJson<{ status?: string }>(req);
    if (status !== 'approved' && status !== 'rejected') {
      throw new ApiError(400, 'Status must be approved or rejected');
    }

    const updated = await prisma.$transaction(async tx => {
      const existing = await tx.paymentRequest.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, 'Payment request not found');
      if (existing.status !== 'pending') throw new ApiError(409, `This payment was already ${existing.status}`);

      // Only one admin can move it out of pending
      const { count } = await tx.paymentRequest.updateMany({
        where: { id, status: 'pending' },
        data: { status, reviewedAt: new Date(), reviewedBy: admin.id },
      });
      if (count === 0) throw new ApiError(409, 'This payment was just reviewed by someone else');

      if (status === 'approved') {
        if (!isPlanId(existing.plan) || !isBillingCycle(existing.billingCycle)) {
          throw new ApiError(400, 'This payment has an unknown plan or billing cycle');
        }
        const user = await tx.user.findUniqueOrThrow({
          where: { id: existing.userId },
          select: { plan: true, planExpiresAt: true },
        });
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            plan: existing.plan,
            planExpiresAt: extendExpiry(user, existing.plan, existing.billingCycle),
          },
        });
      }

      return tx.paymentRequest.findUniqueOrThrow({ where: { id } });
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error, 'payment-review');
  }
}
