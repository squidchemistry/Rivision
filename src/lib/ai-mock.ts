// Offline stand-in for the LLM (LLM_PROVIDER=mock, or no GROQ_API_KEY).
// Deterministic: the same material and answers always give the same questions and scores,
// so tests can assert on them and a demo works without a key or network access.
import type { AnswerReport, QaPair, RevisionMode, TopicWithStats } from './ai';

const STOPWORDS = new Set(
    'about above after again against because before being below between could doesn during every first where which while would should their there these those through under until using other another into from with that this have when what will your than then them they each only also such'.split(' ')
);

type Concept = { title: string; body: string };

/**
 * Splits study material into concepts. Numbered headings ("3. TWO POINTER TECHNIQUE") start a concept;
 * material without headings becomes one concept per paragraph.
 */
export function extractConcepts(content: string, fallbackTitle = 'the material'): Concept[] {
    const concepts: Concept[] = [];
    let current: Concept | null = null;
    for (const line of content.split('\n')) {
        const heading = line.trim().match(/^\d+[.)]\s+([A-Z][A-Z0-9 ,'()/&+-]{2,80})$/);
        if (heading) {
            current = { title: titleCase(heading[1].trim()), body: '' };
            concepts.push(current);
        } else if (current) {
            current.body += line + '\n';
        }
    }
    if (concepts.length > 0) return concepts.map(c => ({ ...c, body: c.body.trim() }));

    const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 40);
    if (paragraphs.length === 0) return [{ title: fallbackTitle, body: content.trim() }];
    return paragraphs.map(p => ({ title: p.split(/[.:\n]/)[0].slice(0, 60).trim() || fallbackTitle, body: p }));
}

function titleCase(s: string) {
    return s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
}

const DIFFICULTY = ['Easy', 'Medium', 'Hard'];

function codingProblem(concept: Concept, topicName: string, difficulty: number, variant: number) {
    const label = DIFFICULTY[Math.min(Math.max(difficulty, 1), 3) - 1];
    return `${concept.title}: Practice ${variant + 1} (${label})

Apply ${concept.title.toLowerCase()} from "${topicName}": write solve(nums, k) that returns the length of the longest contiguous subarray of nums whose sum is at most k, or 0 if there is none.

Example 1:
Input: nums = [2,1,3,1,1], k = 4
Output: 2
Explanation: [2,1], [1,3], [3,1] and [1,1] each sum to at most 4; every window of length 3 sums to more than 4.

Constraints:
- 1 <= nums.length <= 10^5
- 0 <= nums[i] <= 10^4

Expected Time Complexity: O(n)
Expected Space Complexity: O(1)

(Demo mode: this problem was generated offline by the mock AI.)`;
}

function theoryQuestion(concept: Concept, topicName: string, variant: number) {
    const prompts = [
        `Explain ${concept.title} (${topicName}). How does it work, and what are its time and space costs?`,
        `When would you choose ${concept.title} over a simpler approach? Give a concrete example from ${topicName}.`,
        `What are the common mistakes or edge cases when applying ${concept.title}?`,
    ];
    return prompts[variant % prompts.length];
}

export function generateQuestionsFromContent(content: string, difficulty: number, count: number): string[] {
    const concepts = extractConcepts(content);
    return Array.from({ length: count }, (_, i) =>
        codingProblem(concepts[i % concepts.length], 'your material', difficulty, Math.floor(i / concepts.length))
    );
}

/** Round-robin over the topics in the order given (the caller ranks weakest first) */
export function generateDailyQuestions(topics: TopicWithStats[], mode: RevisionMode, count: number) {
    return Array.from({ length: count }, (_, i) => {
        const topic = topics[i % topics.length];
        const concepts = extractConcepts(topic.content, topic.name);
        // Offset by questions already asked on this topic, so repeat sessions move on to new concepts
        const n = topic.questions.length + Math.floor(i / topics.length);
        const concept = concepts[n % concepts.length];
        const variant = Math.floor(n / concepts.length);
        return {
            topicId: topic.id,
            question: mode === 'coding' ? codingProblem(concept, topic.name, 2, variant) : theoryQuestion(concept, topic.name, variant),
        };
    });
}

/** The most frequent meaningful words in a text, most frequent first */
export function keywords(text: string, limit: number): string[] {
    const counts = new Map<string, number>();
    for (const word of text.toLowerCase().match(/[a-z][a-z0-9-]{4,}/g) ?? []) {
        if (!STOPWORDS.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([w]) => w);
}

/**
 * Scores an answer by how many of the key terms of the question and its material it uses,
 * with a cap for very short answers. Crude, but stable and explainable in a demo.
 */
export function gradeAnswer(qa: QaPair): AnswerReport {
    const terms = [...new Set([...keywords(qa.question, 6), ...keywords(qa.topicContent, 10)])];
    const answer = qa.answer.toLowerCase();
    const covered = terms.filter(t => answer.includes(t));
    const words = answer.split(/\s+/).filter(Boolean).length;

    let score = Math.round(30 + (70 * covered.length) / Math.max(terms.length, 1));
    if (words < 15) score = Math.min(score, 40);
    score = Math.max(0, Math.min(100, score));

    const missing = terms.filter(t => !covered.includes(t)).slice(0, 5);
    return {
        question: qa.question,
        topicName: qa.topicName,
        score,
        feedback:
            `Simulated grading (demo mode): your answer uses ${covered.length} of ${terms.length} key terms from this topic.` +
            (missing.length ? ` Consider covering: ${missing.join(', ')}.` : ' Good coverage of the key ideas.') +
            (words < 15 ? ' Answers under 15 words are capped at 40.' : ''),
        correctAnswer: qa.topicContent.slice(0, 800).trim(),
    };
}
