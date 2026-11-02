import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { ApiError, errorResponse, readJson } from '@/lib/http';
import { amountDue, isBillingCycle, isPlanId, PAID_PLANS } from '@/lib/plans';
import { enforceRateLimit } from '@/lib/rate-limit';

const PAYMENT_METHODS = ['upi', 'bank'];

/** Submits a manual payment (UPI or bank transfer) for an admin to verify */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user instanceof NextResponse) return user;
    enforceRateLimit(`payment:${user.id}`, 10, 60 * 60_000);

    const body = await readJson<Record<string, unknown>>(request);
    const plan = body.plan;
    const billingCycle = body.billing_cycle ?? 'monthly';
    const paymentMethod = String(body.payment_method || '').toLowerCase().replace(/\s+transfer$/, '');
    const transactionId = String(body.transaction_id || '').trim();

    if (!isPlanId(plan) || !PAID_PLANS.includes(plan)) throw new ApiError(400, 'Choose the Pro or Premium plan');
    if (!isBillingCycle(billingCycle)) throw new ApiError(400, 'Billing cycle must be monthly or annual');
    if (!PAYMENT_METHODS.includes(paymentMethod)) throw new ApiError(400, 'Payment method must be UPI or bank transfer');
    if (!/^[A-Za-z0-9-]{6,40}$/.test(transactionId)) {
      throw new ApiError(400, 'Enter the transaction or UTR reference from your payment (6-40 letters or digits)');
    }

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

export async function GET() {
  try {
    const user = await requireUser();
    if (user instanceof NextResponse) return user;

    const requests = await prisma.paymentRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    return errorResponse(error, 'payment');
  }
}
