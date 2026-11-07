import { describe, expect, it, vi } from 'vitest';
import { chatWithFallback, llmProvider, parseJsonArray, resolveModels } from '@/lib/ai';
import { extractConcepts, generateQuestionsFromContent, gradeAnswer, keywords } from '@/lib/ai-mock';

describe('provider selection', () => {
    it('uses Groq only when a key is present, unless forced', () => {
        expect(llmProvider({})).toBe('mock');
        expect(llmProvider({ GROQ_API_KEY: 'k' })).toBe('groq');
        expect(llmProvider({ GROQ_API_KEY: 'k', LLM_PROVIDER: 'mock' })).toBe('mock');
        expect(llmProvider({ GROQ_API_KEY: 'k', DEMO_MODE: 'true' })).toBe('mock');
        expect(llmProvider({ GROQ_API_KEY: 'k', DEMO_MODE: 'true', LLM_PROVIDER: 'groq' })).toBe('groq');
        expect(llmProvider({ LLM_PROVIDER: ' GROQ ' })).toBe('groq');
    });
    it('puts GROQ_MODEL first and de-duplicates', () => {
        expect(resolveModels({ GROQ_MODEL: 'a' })).toEqual(['a', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b']);
        expect(resolveModels({ GROQ_MODEL: 'x', GROQ_MODELS: 'x, y' })).toEqual(['x', 'y']);
    });
});

describe('parseJsonArray', () => {
    it('reads plain and fenced JSON, and returns [] otherwise', () => {
        expect(parseJsonArray('[1,2]')).toEqual([1, 2]);
        expect(parseJsonArray('Here you go:\n```json\n["a"]\n```')).toEqual(['a']);
        expect(parseJsonArray('not json')).toEqual([]);
        expect(parseJsonArray('{"a":1}')).toEqual([]);
    });
});

describe('chatWithFallback', () => {
    const reply = (content: string) => ({ choices: [{ message: { content } }] });
    const create = (impl: (model: string) => Promise<unknown>) => vi.fn(async ({ model }: { model: string }) => impl(model));
    const client = (fn: ReturnType<typeof create>) => ({ chat: { completions: { create: fn } } }) as never;

    it('skips a retired model and remembers it', async () => {
        const retired = new Set<string>();
        const fn = create(async m => { if (m === 'old') throw { status: 404, message: 'gone' }; return reply('hi'); });
        expect(await chatWithFallback(client(fn), ['old', 'new'], 'p', retired)).toBe('hi');
        expect(retired.has('old')).toBe(true);
        await chatWithFallback(client(fn), ['old', 'new'], 'p', retired);
        expect(fn).toHaveBeenCalledTimes(3); // old, new, then only new
    });
    it('moves on after a rate limit or server error', async () => {
        const fn = create(async m => { if (m === 'a') throw { status: 429 }; if (m === 'b') throw { status: 503 }; return reply('ok'); });
        expect(await chatWithFallback(client(fn), ['a', 'b', 'c'], 'p', new Set())).toBe('ok');
    });
    it('fails fast on a client error', async () => {
        const fn = create(async () => { throw { status: 401, message: 'bad key' }; });
        await expect(chatWithFallback(client(fn), ['a', 'b'], 'p', new Set())).rejects.toMatchObject({ status: 502 });
        expect(fn).toHaveBeenCalledTimes(1);
    });
    it('throws when every model is busy', async () => {
        const fn = create(async () => { throw { status: 429 }; });
        await expect(chatWithFallback(client(fn), ['a'], 'p', new Set())).rejects.toBeDefined();
    });
});

describe('mock AI is deterministic', () => {
    const material = '1. SLIDING WINDOW\nKeep a window over the array and move both ends.\n2. TWO POINTERS\nUse two indexes moving toward each other.';
    it('splits numbered headings into concepts', () => {
        expect(extractConcepts(material).map(c => c.title)).toEqual(['Sliding Window', 'Two Pointers']);
    });
    it('generates the requested number of questions, same every time', () => {
        const a = generateQuestionsFromContent(material, 2, 3);
        expect(a).toHaveLength(3);
        expect(a).toEqual(generateQuestionsFromContent(material, 2, 3));
        expect(a[0]).toContain('Sliding Window');
        expect(a[1]).toContain('Two Pointers');
    });
    it('grades a keyword-rich answer higher than a short one', () => {
        const qa = { question: 'Explain the sliding window technique', topicName: 'Arrays', topicContent: material };
        const good = gradeAnswer({ ...qa, answer: 'The sliding window technique keeps a window over the array and moves both ends to track the best subarray in linear time.' });
        const bad = gradeAnswer({ ...qa, answer: 'dunno' });
        expect(good.score).toBeGreaterThan(bad.score);
        expect(bad.score).toBeLessThanOrEqual(40);
        expect(gradeAnswer({ ...qa, answer: 'dunno' })).toEqual(bad);
    });
    it('ranks keywords by frequency', () => {
        expect(keywords('window window window pointer pointer array', 2)).toEqual(['window', 'pointer']);
    });
});
