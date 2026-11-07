import { describe, expect, it } from 'vitest';
import {
    dailyQuery, generateForm, paymentBody, questionCreateBody, registerBody, reviewBody, topicUpdateBody,
} from '@/lib/validation';
import { ApiError, parseWith } from '@/lib/http';

const message = (fn: () => unknown) => {
    try { fn(); } catch (e) { return e instanceof ApiError ? `${e.status}:${e.message}` : String(e); }
    return 'no error';
};

describe('registerBody', () => {
    it('normalises the email and defaults the name', () => {
        expect(registerBody.parse({ email: '  Ada@Example.COM ', password: 'longenough' })).toEqual({ email: 'ada@example.com', password: 'longenough', name: '' });
    });
    it('rejects bad emails and short passwords with readable messages', () => {
        expect(message(() => parseWith(registerBody, { email: 'nope', password: 'longenough' }))).toBe('400:Enter a valid email address');
        expect(message(() => parseWith(registerBody, { email: 'a@b.co', password: 'short' }))).toBe('400:Password must be at least 8 characters');
        expect(message(() => parseWith(registerBody, {}))).toBe('400:Enter a valid email address');
    });
    it('strips fields a client must not set', () => {
        const out = registerBody.parse({ email: 'a@b.co', password: 'longenough', role: 'admin', plan: 'premium' });
        expect(out).not.toHaveProperty('role');
        expect(out).not.toHaveProperty('plan');
    });
});

describe('paymentBody', () => {
    const ok = { plan: 'pro', payment_method: 'UPI', transaction_id: 'UTR123456789' };
    it('accepts a valid request and defaults to monthly', () => {
        expect(paymentBody.parse(ok)).toMatchObject({ plan: 'pro', billing_cycle: 'monthly', payment_method: 'upi' });
        expect(paymentBody.parse({ ...ok, payment_method: 'Bank Transfer' }).payment_method).toBe('bank');
    });
    it('never takes an amount from the client', () => {
        expect(paymentBody.parse({ ...ok, amount: 1 })).not.toHaveProperty('amount');
    });
    it('rejects the free plan and malformed references', () => {
        expect(() => paymentBody.parse({ ...ok, plan: 'free' })).toThrow();
        expect(() => paymentBody.parse({ ...ok, transaction_id: 'abc' })).toThrow();
        expect(() => paymentBody.parse({ ...ok, transaction_id: "x'; DROP TABLE" })).toThrow();
    });
});

describe('other bodies', () => {
    it('bounds generate count and difficulty, and splits urls', () => {
        expect(generateForm.parse({ name: 'DP', urls: 'https://a.com\n\n https://b.com ' })).toMatchObject({ count: 5, difficulty: 1, urls: ['https://a.com', 'https://b.com'] });
        expect(() => generateForm.parse({ name: 'DP', count: '21' })).toThrow();
        expect(() => generateForm.parse({ name: 'DP', difficulty: '4' })).toThrow();
        expect(() => generateForm.parse({ name: '   ' })).toThrow();
    });
    it('requires at least one change when updating a topic', () => {
        expect(() => topicUpdateBody.parse({})).toThrow();
        expect(topicUpdateBody.parse({ priority: '3' })).toEqual({ priority: 3 });
    });
    it('limits review answers', () => {
        expect(() => reviewBody.parse({ answers: [] })).toThrow();
        expect(() => reviewBody.parse({ answers: Array.from({ length: 11 }, (_, i) => ({ questionId: i + 1 })) })).toThrow();
        expect(reviewBody.parse({ answers: [{ questionId: '3' }] }).answers[0]).toEqual({ questionId: 3, answer: '' });
    });
    it('parses daily topic ids defensively', () => {
        expect(dailyQuery.parse({ topics: '1,x,-2,3' }).topics).toEqual([1, 3]);
        expect(dailyQuery.parse({}).mode).toBe('coding');
        expect(() => dailyQuery.parse({ mode: 'other' })).toThrow();
    });
    it('trims question text and defaults difficulty', () => {
        expect(questionCreateBody.parse({ topicId: 1, questionText: '  Why?  ' })).toEqual({ topicId: 1, questionText: 'Why?', difficulty: 1 });
    });
});
