import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { deleteUsers, makeUser } from './db.test-helpers';

// Sessions are faked: the routes call getServerSession, everything else (database, validation) is real
const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string } } }));
vi.mock('next-auth/next', () => ({ getServerSession: async () => session.current }));

import { GET as listPayments } from '@/app/api/admin/payment-requests/route';
import { GET as listUsers } from '@/app/api/admin/users/route';
import { PATCH as reviewPayment } from '@/app/api/payment/[id]/route';

const created: string[] = [];
afterAll(async () => {
    await deleteUsers(created);
    await prisma.$disconnect();
});
beforeEach(() => { session.current = null; });

async function user(overrides = {}) {
    const u = await makeUser(overrides);
    created.push(u.id);
    return u;
}
const as = (u: { id: string; role: string }, jwtRole = u.role) => { session.current = { user: { id: u.id, role: jwtRole } }; };
const get = (path: string) => new Request(`http://localhost${path}`);
const patch = (body: unknown) => new Request('http://localhost/api/payment/x', { method: 'PATCH', body: JSON.stringify(body) });

describe('admin API access', () => {
    it('signed-out requests get 401', async () => {
        expect((await listPayments(get('/api/admin/payment-requests'))).status).toBe(401);
        expect((await listUsers(get('/api/admin/users'))).status).toBe(401);
    });

    it('a normal user gets 403', async () => {
        const u = await user();
        as(u);
        expect((await listPayments(get('/api/admin/payment-requests'))).status).toBe(403);
        expect((await listUsers(get('/api/admin/users'))).status).toBe(403);
    });

    it('a forged admin role in the session is ignored: the database decides', async () => {
        const u = await user({ role: 'user' });
        as(u, 'admin');
        expect((await listUsers(get('/api/admin/users'))).status).toBe(403);
    });

    it('a demoted admin loses access immediately', async () => {
        const u = await user({ role: 'admin' });
        as(u);
        expect((await listUsers(get('/api/admin/users'))).status).toBe(200);
        await prisma.user.update({ where: { id: u.id }, data: { role: 'user' } });
        expect((await listUsers(get('/api/admin/users'))).status).toBe(403);
    });

    it('an admin sees users without password hashes', async () => {
        const u = await user({ role: 'admin' });
        as(u);
        const res = await listUsers(get('/api/admin/users'));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.length).toBeGreaterThan(0);
        expect(JSON.stringify(body)).not.toContain('"password"');
    });

    it('rejects a bad status filter with 400', async () => {
        const u = await user({ role: 'admin' });
        as(u);
        expect((await listPayments(get('/api/admin/payment-requests?status=bogus'))).status).toBe(400);
    });
});

describe('payment review', () => {
    const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

    async function pendingPayment(plan = 'pro', billingCycle = 'monthly') {
        const learner = await user();
        const request = await prisma.paymentRequest.create({
            data: { userId: learner.id, plan, amount: 999, paymentMethod: 'upi', transactionId: `T${Date.now()}${Math.random().toString(36).slice(2, 8)}`, billingCycle },
        });
        return { learner, request };
    }

    it('only admins can review', async () => {
        const { learner, request } = await pendingPayment();
        as(learner);
        const res = await reviewPayment(patch({ status: 'approved' }) as never, ctx(request.id));
        expect(res.status).toBe(403);
        expect((await prisma.paymentRequest.findUniqueOrThrow({ where: { id: request.id } })).status).toBe('pending');
    });

    it('approval upgrades the plan with an expiry; a second review is refused', async () => {
        const { learner, request } = await pendingPayment('pro', 'monthly');
        const admin = await user({ role: 'admin' });
        as(admin);

        const res = await reviewPayment(patch({ status: 'approved' }) as never, ctx(request.id));
        expect(res.status).toBe(200);
        const after = await prisma.user.findUniqueOrThrow({ where: { id: learner.id } });
        expect(after.plan).toBe('pro');
        const days = (after.planExpiresAt!.getTime() - Date.now()) / 86_400_000;
        expect(days).toBeGreaterThan(29.9);
        expect(days).toBeLessThan(30.1);

        expect((await reviewPayment(patch({ status: 'rejected' }) as never, ctx(request.id))).status).toBe(409);
    });

    it('rejection leaves the plan alone', async () => {
        const { learner, request } = await pendingPayment();
        as(await user({ role: 'admin' }));
        expect((await reviewPayment(patch({ status: 'rejected' }) as never, ctx(request.id))).status).toBe(200);
        expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.id } })).plan).toBe('free');
    });

    it('validates the status and handles unknown ids', async () => {
        as(await user({ role: 'admin' }));
        expect((await reviewPayment(patch({ status: 'maybe' }) as never, ctx('nope'))).status).toBe(400);
        expect((await reviewPayment(patch({ status: 'approved' }) as never, ctx('does-not-exist'))).status).toBe(404);
    });
});
