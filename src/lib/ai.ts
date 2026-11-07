import Groq from 'groq-sdk';
import { ApiError } from './http';
import * as mock from './ai-mock';

export type RevisionMode = 'coding' | 'theory';

export function isRevisionMode(value: unknown): value is RevisionMode {
    return value === 'coding' || value === 'theory';
}

// ─── LLM PROVIDER ───

/**
 * "groq" calls Groq; "mock" returns deterministic, offline results (tests, local runs and demos without a key).
 * LLM_PROVIDER picks one explicitly; otherwise the mock is used in DEMO_MODE or without GROQ_API_KEY, and Groq when a key is set.
 */
export function llmProvider(env: Record<string, string | undefined> = process.env): 'groq' | 'mock' {
    const configured = env.LLM_PROVIDER?.trim().toLowerCase();
    if (configured === 'mock' || configured === 'groq') return configured;
    // Demo mode is deterministic and free even when a key happens to be configured
    if (env.DEMO_MODE === 'true') return 'mock';
    return env.GROQ_API_KEY ? 'groq' : 'mock';
}

export const DEFAULT_GROQ_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

/**
 * Models to try, in order. GROQ_MODELS is a comma-separated list; GROQ_MODEL (one model) is put first.
 * Groq retires models, so the list lets a deploy switch models without a code change.
 */
export function resolveModels(env: Record<string, string | undefined> = process.env): string[] {
    const listed = env.GROQ_MODELS?.split(',').map(m => m.trim()).filter(Boolean);
    return [...new Set([env.GROQ_MODEL?.trim(), ...(listed?.length ? listed : DEFAULT_GROQ_MODELS)].filter(Boolean) as string[])];
}

type ChatClient = {
    chat: { completions: { create(args: { messages: { role: 'user'; content: string }[]; model: string; temperature: number }): Promise<{ choices: { message?: { content?: string | null } }[] }> } };
};

// A model Groq has retired is skipped for the life of the process
const retiredModels = new Set<string>();
let client: Groq | null = null;

function getGroq() {
    if (!process.env.GROQ_API_KEY) {
        throw new ApiError(503, 'AI is not configured: set GROQ_API_KEY, or LLM_PROVIDER=mock for demo mode.', 'ai_unavailable');
    }
    client ??= new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 90_000, maxRetries: 1 });
    return client;
}

function isRetired(status: number | undefined, message = '') {
    return status === 404 || (status === 400 && /decommissioned|not supported|does not exist/i.test(message));
}

/**
 * Sends the prompt to each model in turn until one answers.
 * Retired models are remembered and skipped; rate limits (429), server errors and timeouts move on to the next model.
 */
export async function chatWithFallback(groq: ChatClient, models: string[], prompt: string, retired = retiredModels): Promise<string> {
    let busy = false;
    for (const model of models) {
        if (retired.has(model)) continue;
        try {
            const result = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model,
                temperature: 0.7,
            });
            return result.choices[0]?.message?.content || '';
        } catch (error) {
            const { status, message } = error as { status?: number; message?: string };
            console.error(`[ai] Groq request failed (${model})`, status, message);
            if (isRetired(status, message)) {
                retired.add(model);
                continue;
            }
            if (status === 429) busy = true;
            if (status === undefined || status === 429 || status >= 500) continue;
            throw new ApiError(502, 'The AI service did not respond. Please try again.', 'ai_unavailable');
        }
    }
    if (busy) throw new ApiError(503, 'The AI service is busy right now. Please try again in a minute.', 'ai_busy');
    throw new ApiError(502, 'No AI model is available right now. Check GROQ_MODELS and your Groq account.', 'ai_unavailable');
}

async function chat(prompt: string): Promise<string> {
    return chatWithFallback(getGroq(), resolveModels(), prompt);
}

export function parseJsonArray<T = unknown>(text: string): T[] {
    try {
        const parsed = JSON.parse(text.trim());
        if (Array.isArray(parsed)) return parsed;
    } catch { }
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
        try {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) return parsed;
        } catch { }
    }
    return [];
}

// ─── QUESTION GENERATION ───

export async function generateQuestionsFromContent(content: string, difficulty: number, count: number = 5): Promise<string[]> {
    if (llmProvider() === 'mock') return mock.generateQuestionsFromContent(content, difficulty, count);
    const diffLabel = difficulty === 1 ? 'Easy (LeetCode Easy)' : difficulty === 2 ? 'Medium (LeetCode Medium)' : 'Hard (LeetCode Hard / Codeforces Div2 C-D)';

    const prompt = `You are a competitive programming problem setter like those on LeetCode and Codeforces.

Given the following study material/DSA topic, generate EXACTLY ${count} coding problems.

Difficulty: ${diffLabel}

Each problem MUST follow this format:
---
PROBLEM TITLE

Problem statement explaining what needs to be solved. Be specific and clear.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9.

Example 2:
Input: ...
Output: ...

Constraints:
- 1 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9

Expected Time Complexity: O(n)
Expected Space Complexity: O(n)
---

Rules:
- Problems must test the algorithms/concepts from the material
- Each problem should be a complete, self-contained coding challenge
- Include 1-2 examples with input/output
- Include constraints
- Include expected time/space complexity
- Make problems that require writing actual code, not theory questions
- Cover different concepts from the material

Study Material:
${content.slice(0, 80000)}

Return ONLY a valid JSON array of problem strings (each problem is a single string with newlines):
["Problem 1 full text here...", "Problem 2 full text here...", ...]
No markdown code blocks, no explanation outside the array.`;

    const questions = parseJsonArray<unknown>(await chat(prompt))
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0);
    if (questions.length === 0) throw new ApiError(502, 'The AI could not generate questions from this material. Try adding more detail.');
    return questions.slice(0, count);
}

// ─── DAILY QUESTION GENERATION ───

export type TopicWithStats = {
    id: number;
    name: string;
    content: string;
    questions: { successCount: number; failureCount: number }[];
};

export async function generateDailyQuestions(
    topics: TopicWithStats[],
    mode: RevisionMode,
    count: number
): Promise<{ question: string; topicId: number }[]> {
    if (topics.length === 0 || count <= 0) return [];
    if (llmProvider() === 'mock') return mock.generateDailyQuestions(topics, mode, count);

    // The highest-ranked topics, so the prompt stays a reasonable size
    const context = topics.slice(0, 8);
    const topicSummaries = context.map(t => {
        const totalS = t.questions.reduce((s, q) => s + q.successCount, 0);
        const totalF = t.questions.reduce((s, q) => s + q.failureCount, 0);
        const total = totalS + totalF;
        const rate = total > 0 ? Math.round((totalS / total) * 100) : 0;
        return `Topic ID ${t.id}: "${t.name}" (Success Rate: ${rate}%, ${total} attempts)\nContent: ${t.content.slice(0, 10000)}`;
    }).join('\n\n---\n\n');

    const prompt = mode === 'coding' ? buildCodingDailyPrompt(topicSummaries, count) : buildTheoryDailyPrompt(topicSummaries, count);
    const validIds = new Set(context.map(t => t.id));

    return parseJsonArray<{ question?: unknown; topicId?: unknown }>(await chat(prompt))
        .map(q => ({ question: typeof q.question === 'string' ? q.question.trim() : '', topicId: Number(q.topicId) }))
        .filter(q => q.question && validIds.has(q.topicId))
        .slice(0, count);
}

function buildCodingDailyPrompt(topicSummaries: string, count: number): string {
    return `You are a competitive programming problem setter (LeetCode/Codeforces style). Generate ${count} coding problems for a daily revision session.

Here are the available topics with performance data. PRIORITIZE topics with LOWER success rates:

${topicSummaries}

Generate EXACTLY ${count} coding problems. Each problem must be a complete LeetCode-style problem with:
- Problem title
- Clear problem statement
- 1-2 examples with Input/Output/Explanation
- Constraints
- Expected time and space complexity

Rules:
- Prioritize topics where the student is weaker (lower success rate)
- Include at least 1 problem from the weakest topic
- Problems must test the algorithms/data structures from the topic content
- Mix Easy, Medium, and Hard difficulty
- Each problem should require writing actual code to solve
- Make problems specific and unambiguous
- topicId must be one of the Topic IDs above

Return ONLY valid JSON (no markdown code blocks):
[
  {"question": "Full problem text with examples and constraints...", "topicId": <id>},
  ...
]`;
}

function buildTheoryDailyPrompt(topicSummaries: string, count: number): string {
    return `You are an expert tutor creating revision questions for a spaced repetition study session. Generate ${count} questions for today's review.

Here are the available topics with performance data. PRIORITIZE topics with LOWER success rates (the student struggles with them more):

${topicSummaries}

Generate EXACTLY ${count} high-quality revision questions. Questions should test deep understanding, not just surface-level recall.

Question types to mix:
- Conceptual: "Explain why X works / What is the difference between X and Y?"
- Application: "In scenario X, how would you apply Y?"
- Analytical: "Compare and contrast X and Y. When would you choose one over the other?"
- Short answer: "What are the key properties of X?"
- Scenario-based: "Given this situation, what would happen and why?"

Rules:
- Prioritize topics where the student is weaker (lower success rate)
- Include at least 1 question from the weakest topic
- Questions must be directly answerable from the topic content provided
- Questions should require thoughtful explanation, not one-word answers
- Cover different aspects of the material
- Make questions clear, specific, and unambiguous
- topicId must be one of the Topic IDs above

Return ONLY valid JSON (no markdown code blocks):
[
  {"question": "Your question text here?", "topicId": <id>},
  ...
]`;
}

// ─── ANSWER EVALUATION ───

export type AnswerReport = {
    question: string;
    topicName: string;
    score: number;
    feedback: string;
    correctAnswer: string;
};

export type QaPair = { question: string; answer: string; topicName: string; topicContent: string };

/**
 * Grades answers with the AI. Returns one report per input, in the same order.
 * Blank answers score 0 without an AI call.
 */
export async function evaluateAnswers(qaPairs: QaPair[], mode: RevisionMode = 'coding'): Promise<AnswerReport[]> {
    const reports: (AnswerReport | null)[] = qaPairs.map(qa =>
        qa.answer.trim()
            ? null
            : { question: qa.question, topicName: qa.topicName, score: 0, feedback: 'No answer was submitted.', correctAnswer: '' }
    );
    const toGrade = qaPairs.map((qa, i) => ({ ...qa, index: i })).filter((_, i) => reports[i] === null);

    if (toGrade.length > 0 && llmProvider() === 'mock') {
        for (const qa of toGrade) reports[qa.index] = mock.gradeAnswer(qa);
    } else if (toGrade.length > 0) {
        const items = toGrade.map(qa => `
Question index ${qa.index} (Topic: ${qa.topicName}):
${qa.question}

Student's Answer:
${qa.answer}

Reference Material:
${qa.topicContent.slice(0, 8000)}
`).join('\n---\n');

        const prompt = mode === 'coding' ? buildCodingEvalPrompt(items) : buildTheoryEvalPrompt(items);
        const graded = parseJsonArray<{ index?: unknown; score?: unknown; feedback?: unknown; correctAnswer?: unknown }>(await chat(prompt));
        if (graded.length === 0) throw new ApiError(502, 'The AI could not grade these answers. Please submit again.');

        toGrade.forEach((qa, position) => {
            // Match by the index we gave the AI; fall back to position if it left the index out
            const g = graded.find(r => Number(r.index) === qa.index) ?? graded[position];
            const score = Math.max(0, Math.min(100, Math.round(Number(g?.score) || 0)));
            reports[qa.index] = {
                question: qa.question,
                topicName: qa.topicName,
                score,
                feedback: typeof g?.feedback === 'string' ? g.feedback : 'The AI did not return feedback for this answer.',
                correctAnswer: typeof g?.correctAnswer === 'string' ? g.correctAnswer : '',
            };
        });
    }

    return reports as AnswerReport[];
}

function buildCodingEvalPrompt(items: string): string {
    return `You are a senior software engineer and competitive programming judge evaluating code solutions.

For each coding problem below, evaluate the student's solution and provide:
1. A score from 0-100 based on:
   - Correctness (does the approach solve the problem?): 50 points
   - Time complexity (is it optimal?): 20 points
   - Space complexity (is it efficient?): 10 points
   - Code quality (clean, readable, edge cases handled): 20 points
2. Specific feedback: What's correct in their approach, what's wrong, edge cases missed, optimization suggestions
3. A clean, optimal solution with explanation

IMPORTANT: If the student writes pseudocode or explains the approach in text instead of actual code, still evaluate the algorithmic correctness of their approach. Give partial credit for correct logic even if not proper code syntax.

${items}

Return ONLY valid JSON (no markdown code blocks), one object per question, with "index" copied from "Question index N":
[
  {
    "index": 0,
    "score": 85,
    "feedback": "Your approach using X is correct. However, you missed edge case Y. Time complexity is O(n) which is optimal.",
    "correctAnswer": "def solution(nums):\\n  # optimal solution here\\n  ..."
  },
  ...
]`;
}

function buildTheoryEvalPrompt(items: string): string {
    return `You are an expert tutor evaluating a student's revision answers.

For each question below, evaluate the student's answer against the reference material and provide:
1. A score from 0-100 based on:
   - Accuracy (is the answer factually correct?): 40 points
   - Completeness (did they cover all key points?): 30 points
   - Understanding (do they demonstrate deep understanding, not just memorization?): 20 points
   - Clarity (is the answer well-explained and organized?): 10 points
2. Specific feedback: What was correct, what was incomplete or wrong, what key points were missed
3. A comprehensive correct answer based on the reference material

Be encouraging but honest. Give credit for partial understanding.

${items}

Return ONLY valid JSON (no markdown code blocks), one object per question, with "index" copied from "Question index N":
[
  {
    "index": 0,
    "score": 75,
    "feedback": "Good understanding of X. However, you missed the key point about Y. Your explanation of Z was accurate but could be more detailed.",
    "correctAnswer": "A comprehensive answer covering all key points..."
  },
  ...
]`;
}
