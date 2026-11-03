import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, pageResponse, parseBody, parseQuery } from '@/lib/http';
import { amountDue } from '@/lib/plans';
import { enforceRateLimit } from '@/lib/rate-limit';
import { pageQuery, paymentBody } from '@/lib/validation';

/** Submits a manual payment (UPI or bank transfer) for an admin to verify */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user instanceof NextResponse) return user;
    enforceRateLimit(`payment:${user.id}`, 10, 60 * 60_000);

    const {
      plan,
      billing_cycle: billingCycle,
      payment_method: paymentMethod,
      transaction_id: transactionId,
    } = await parseBody(paymentBody, request);

    const pending = await prisma.paymentRequest.findFirst({
      where: { userId: user.id, status: 'pending' },
      select: { id: true },
    });
    if (pending) throw new ApiError(409, 'You already have a payment waiting for review. We will update your plan once it is verified.');

    const duplicate = await prisma.paymentRequest.findFirst({
      where: { transactionId, status: { in: ['pending', 'approved'] } },
      select: { id: true },
    });
    if (duplicate) throw new ApiError(409, 'This transaction reference has already been submitted');

    // The amount comes from the plan catalog, never from the client
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        userId: user.id,
        plan,
        billingCycle,
        amount: amountDue(plan, billingCycle),
        paymentMethod,
        transactionId,
        status: 'pending',
      },
    });

    return NextResponse.json(
      { message: 'Payment submitted for verification', data: paymentRequest },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, 'payment');
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (user instanceof NextResponse) return user;
    const { limit, cursor } = parseQuery(pageQuery, request);

    const requests = await prisma.paymentRequest.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return pageResponse(requests, limit);
  } catch (error) {
    return errorResponse(error, 'payment');
  }
}
