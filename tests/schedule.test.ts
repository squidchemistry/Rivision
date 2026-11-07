import { describe, expect, it } from 'vitest';
import { nextSchedule } from '@/lib/db';
import { daysBetween, dayKey, monthKey, startOfToday } from '@/lib/time';

const now = new Date('2026-11-07T10:00:00Z');

describe('nextSchedule', () => {
    it('doubles the interval on a pass', () => {
        expect(nextSchedule(4, 60, now)).toMatchObject({ passed: true, reviewInterval: 8 });
    });
    it('multiplies by 2.5 on a strong pass', () => {
        expect(nextSchedule(4, 85, now).reviewInterval).toBe(10);
        expect(nextSchedule(4, 84, now).reviewInterval).toBe(8);
    });
    it('resets to tomorrow on a fail', () => {
        const r = nextSchedule(40, 59, now);
        expect(r).toMatchObject({ passed: false, reviewInterval: 1 });
        expect(+r.nextReviewAt).toBe(+now + 86_400_000);
    });
    it('caps the interval at 180 days', () => {
        expect(nextSchedule(150, 100, now).reviewInterval).toBe(180);
    });
});

describe('time helpers (Asia/Kolkata)', () => {
    it('uses the app timezone for day and month boundaries', () => {
        // 19:00 UTC on Nov 30 is already Dec 1 at 00:30 in IST
        const t = new Date('2026-11-30T19:00:00Z');
        expect(dayKey(t)).toBe('2026-12-01');
        expect(monthKey(t)).toBe('2026-12');
    });
    it('counts whole days between keys', () => {
        expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
        expect(daysBetween('2026-03-02', '2026-03-02')).toBe(0);
    });
    it('finds the start of the local day', () => {
        // IST midnight is 18:30 UTC the previous day
        expect(startOfToday(new Date('2026-11-07T10:00:00Z')).toISOString()).toBe('2026-11-06T18:30:00.000Z');
    });
});
