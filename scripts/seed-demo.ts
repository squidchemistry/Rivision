// Seeds a demo learner and a demo admin with realistic data, so the app can be shown with no setup:
//   npm run db:seed-demo
// Safe to re-run: it resets the two demo accounts to a known state. Pair it with LLM_PROVIDER=mock
// (or DEMO_MODE=true) so question generation and grading work without an API key.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEMO_LEARNER = { email: 'demo@rivision.app', name: 'Demo Learner', password: process.env.DEMO_PASSWORD || 'demo-learner-1' };
export const DEMO_ADMIN = { email: 'admin@rivision.app', name: 'Demo Admin', password: process.env.DEMO_PASSWORD || 'demo-admin-1234' };

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const inDays = (n: number) => new Date(Date.now() + n * DAY);

const TOPICS = [
    {
        name: 'Arrays: Two Pointers and Sliding Window',
        priority: 3,
        content: `Arrays: patterns for linear-time solutions

1. TWO POINTER TECHNIQUE
Keep a left and a right index and move them toward each other (sorted input) or in the same direction. Turns many O(n^2) pair searches into O(n).

2. SLIDING WINDOW
Maintain a window [left, right] over the array. Expand right to take in elements; shrink left while the window breaks the rule. Each element enters and leaves once, so the cost is O(n).

3. PREFIX SUMS
Precompute running totals so any range sum is prefix[r+1] - prefix[l] in O(1) after O(n) setup.`,
        questions: [
            { mode: 'coding', difficulty: 2, due: -1, interval: 1, text: 'Sliding Window: Longest subarray with sum at most k\n\nGiven nums (non-negative integers) and k, return the length of the longest contiguous subarray whose sum is at most k.\n\nExample: nums = [2,1,3,1,1], k = 4 -> 2\n\nExpected Time Complexity: O(n)' },
            { mode: 'theory', difficulty: 1, due: -1, interval: 2, text: 'Explain the two pointer technique. When does it apply, and what does it cost in time and space?' },
            { mode: 'theory', difficulty: 2, due: 6, interval: 8, text: 'Why is the sliding window O(n) even though it has a loop inside a loop?' },
        ],
    },
    {
        name: 'Hash Maps and Sets',
        priority: 2,
        content: `Hash tables

1. HOW A HASH MAP WORKS
A hash function maps a key to a bucket index. Collisions are handled by chaining or open addressing. Average lookup, insert and delete are O(1); worst case O(n).

2. COMMON USES
Counting frequencies, detecting duplicates, two-sum style complement lookups, grouping anagrams by sorted key.`,
        questions: [
            { mode: 'theory', difficulty: 1, due: -2, interval: 1, text: 'How does a hash map handle collisions, and what happens to lookup time when there are many?' },
            { mode: 'coding', difficulty: 1, due: 3, interval: 4, text: 'Hash Maps: Two Sum\n\nReturn the indices of the two numbers in nums that add up to target.\n\nExample: nums = [2,7,11,15], target = 9 -> [0,1]\n\nExpected Time Complexity: O(n)' },
        ],
    },
    {
        name: 'Database Indexing',
        priority: 1,
        content: `Indexes

1. B-TREE INDEXES
Keep keys sorted so equality and range queries read a few pages instead of the whole table. Writes pay extra to keep the index in order.

2. WHEN NOT TO INDEX
Small tables, columns with very few distinct values, and write-heavy tables where the maintenance cost outweighs the read benefit.`,
        questions: [{ mode: 'theory', difficulty: 2, due: 12, interval: 16, text: 'What is the trade-off of adding an index to a write-heavy table?' }],
    },
];

async function seed() {
    const learnerHash = await bcrypt.hash(DEMO_LEARNER.password, 10);
    const adminHash = await bcrypt.hash(DEMO_ADMIN.password, 10);

    // Reset: deleting the user cascades to topics, questions, stats, history, usage and payments
    await prisma.user.deleteMany({ where: { email: { in: [DEMO_LEARNER.email, DEMO_ADMIN.email] } } });

    const learner = await prisma.user.create({
        data: { email: DEMO_LEARNER.email, name: DEMO_LEARNER.name, password: learnerHash, plan: 'pro', planExpiresAt: inDays(23) },
    });
    const admin = await prisma.user.create({
        data: { email: DEMO_ADMIN.email, name: DEMO_ADMIN.name, password: adminHash, role: 'admin', plan: 'premium' },
    });

    for (const topic of TOPICS) {
        await prisma.topic.create({
            data: {
                userId: learner.id,
                name: topic.name,
                content: topic.content,
                priority: topic.priority,
                questions: {
                    create: topic.questions.map(q => ({
                        questionText: q.text,
                        mode: q.mode,
                        difficulty: q.difficulty,
                        reviewInterval: q.interval,
                        nextReviewAt: inDays(q.due),
                        lastReviewed: daysAgo(q.interval),
                        successCount: q.interval > 1 ? 2 : 1,
                        failureCount: q.interval === 1 ? 1 : 0,
                    })),
                },
            },
        });
    }

    // A 4-day streak ending yesterday, with a rising score trend
    await prisma.studyStats.create({
        data: { userId: learner.id, currentStreak: 4, longestStreak: 6, totalRevisions: 7, lastStudyDate: daysAgo(1) },
    });
    const scores = [52, 61, 58, 70, 74, 79, 83];
    await prisma.revisionHistory.createMany({
        data: scores.map((averageScore, i) => ({
            userId: learner.id,
            date: daysAgo(scores.length - i),
            averageScore,
            questionsAnswered: 5,
            topicsSummary: i % 2 ? 'Hash Maps and Sets' : 'Arrays: Two Pointers and Sliding Window',
        })),
    });

    // Something for the admin to approve
    const other = await prisma.user.upsert({
        where: { email: 'priya.demo@rivision.app' },
        update: {},
        create: { email: 'priya.demo@rivision.app', name: 'Priya (demo)', password: learnerHash },
    });
    await prisma.paymentRequest.deleteMany({ where: { userId: other.id } });
    await prisma.paymentRequest.create({
        data: { userId: other.id, plan: 'pro', billingCycle: 'monthly', amount: 999, paymentMethod: 'upi', transactionId: 'DEMO-UTR-000123' },
    });

    console.log('Demo data ready.');
    console.log(`  Learner: ${DEMO_LEARNER.email} / ${DEMO_LEARNER.password}  (Pro plan, 3 topics, 2 questions due)`);
    console.log(`  Admin:   ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}  (1 pending payment to review at /admin)`);
    void admin;
}

seed()
    .catch(e => { console.error('Error seeding demo data:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
