import { z } from 'zod';

// Request schemas for every API route. Routes parse with parseBody/parseQuery (src/lib/http.ts),
// so anything that reaches the handler body is already typed and within limits.
// Objects strip unknown keys, so a body can never set fields like userId, role or amount.

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_TOPIC_NAME = 120;
export const MAX_TOPIC_CONTENT = 200_000;
export const MAX_QUESTION_TEXT = 10_000;
export const MAX_ANSWER_CHARS = 20_000;
export const MAX_ANSWERS = 10;
export const MAX_GENERATE_COUNT = 20;
export const MAX_PAGE_SIZE = 100;

const positiveInt = (label: string) =>
    z.coerce.number({ error: `${label} must be a number` }).int(`${label} must be a whole number`).positive(`${label} must be positive`);

const level = (label: string) =>
    z.coerce.number({ error: `${label} must be 1, 2 or 3` }).int().min(1, `${label} must be 1, 2 or 3`).max(3, `${label} must be 1, 2 or 3`);

export const revisionMode = z.enum(['coding', 'theory'], { error: 'mode must be coding or theory' });

// ─── Pagination ───

/** ?limit=&cursor= for lists. The default page is large enough for the app's own pages to load everything. */
export const pageQuery = z.object({
    limit: z.coerce.number().int().min(1, 'limit must be 1-100').max(MAX_PAGE_SIZE, 'limit must be 1-100').default(MAX_PAGE_SIZE),
    cursor: z.string().max(64).optional(),
});

/** Same, for tables with integer ids */
export const intPageQuery = pageQuery.extend({ cursor: positiveInt('cursor').optional() });

// ─── Auth ───

export const registerBody = z.object({
    email: z
        .string({ error: 'Enter a valid email address' })
        .trim()
        .toLowerCase()
        .max(254, 'Enter a valid email address')
        .pipe(z.email('Enter a valid email address')),
    password: z
        .string({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
        .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
        .max(200, 'Password is too long'),
    name: z.string().trim().max(80, 'Name must be 80 characters or fewer').optional().default(''),
});

// ─── Topics ───

const topicName = z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(MAX_TOPIC_NAME, `Name must be ${MAX_TOPIC_NAME} characters or fewer`);
const topicContent = z.string().max(MAX_TOPIC_CONTENT, 'Study material is too long (200,000 characters max)');

export const topicCreateBody = z.object({ name: topicName, content: topicContent.optional().default('') });

export const topicUpdateBody = z
    .object({ name: topicName.optional(), content: topicContent.optional(), priority: level('Priority').optional() })
    .refine(d => d.name !== undefined || d.content !== undefined || d.priority !== undefined, 'Nothing to update');

export const idParam = z.object({ id: positiveInt('id') });

// ─── Questions ───

export const questionsQuery = intPageQuery.extend({ topicId: positiveInt('topicId').optional() });

export const questionCreateBody = z.object({
    topicId: positiveInt('topicId'),
    questionText: z
        .string({ error: 'Question text is required' })
        .trim()
        .min(1, 'Question text is required')
        .max(MAX_QUESTION_TEXT, 'Question is too long'),
    difficulty: level('Difficulty').optional().default(1),
});

// ─── Daily session and review ───

export const dailyQuery = z.object({
    mode: revisionMode.optional().default('coding'),
    topics: z
        .string()
        .optional()
        .transform(s => (s ? s.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 100) : undefined)),
});

export const reviewBody = z.object({
    mode: revisionMode.optional().default('coding'),
    answers: z
        .array(
            z.object({
                questionId: positiveInt('questionId'),
                answer: z.string().optional().default('').transform(a => a.slice(0, MAX_ANSWER_CHARS)),
            }),
            { error: 'No answers provided' }
        )
        .min(1, 'No answers provided')
        .max(MAX_ANSWERS, 'Too many answers in one session'),
});

// ─── Generate (multipart form) ───

export const generateForm = z.object({
    name: topicName,
    difficulty: level('Difficulty').default(1),
    count: z.coerce
        .number()
        .int()
        .min(1, `Number of questions must be between 1 and ${MAX_GENERATE_COUNT}`)
        .max(MAX_GENERATE_COUNT, `Number of questions must be between 1 and ${MAX_GENERATE_COUNT}`)
        .default(5),
    content: z.string().max(MAX_TOPIC_CONTENT, 'Study material is too long (200,000 characters max)').default(''),
    urls: z
        .string()
        .default('')
        .transform(s => s.split('\n').map(u => u.trim()).filter(Boolean)),
});

// ─── Payments ───

export const paymentBody = z.object({
    plan: z.enum(['pro', 'premium'], { error: 'Choose the Pro or Premium plan' }),
    billing_cycle: z.enum(['monthly', 'annual'], { error: 'Billing cycle must be monthly or annual' }).optional().default('monthly'),
    payment_method: z
        .string({ error: 'Payment method must be UPI or bank transfer' })
        .transform(s => s.trim().toLowerCase().replace(/\s+transfer$/, ''))
        .pipe(z.enum(['upi', 'bank'], { error: 'Payment method must be UPI or bank transfer' })),
    transaction_id: z
        .string({ error: 'Enter the transaction or UTR reference from your payment (6-40 letters or digits)' })
        .trim()
        .regex(/^[A-Za-z0-9-]{6,40}$/, 'Enter the transaction or UTR reference from your payment (6-40 letters or digits)'),
});

export const paymentReviewBody = z.object({
    status: z.enum(['approved', 'rejected'], { error: 'Status must be approved or rejected' }),
});

export const paymentIdParam = z.object({ id: z.string().min(1).max(64) });

// ─── Admin ───

export const adminPaymentsQuery = pageQuery.extend({
    status: z.enum(['pending', 'approved', 'rejected'], { error: 'status must be pending, approved or rejected' }).optional(),
});
