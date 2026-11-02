'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Brain, ArrowRight, CheckCircle2, Loader2, Send, ChevronLeft, ChevronRight, Sparkles, X, Trophy, RotateCcw, Filter, Code2, Terminal, BookOpen, MessageSquare } from 'lucide-react';

type RevisionMode = 'coding' | 'theory';
type Topic = { id: number; name: string; priority: number; _count: { questions: number } };
type DailyQuestion = { questionId: number; question: string; topicName: string; topicId: number; isReview: boolean };
type AnswerReport = { question: string; topicName: string; score: number; feedback: string; correctAnswer: string };
type Phase = 'setup' | 'loading' | 'no_topics' | 'answering' | 'submitting' | 'results';

const PRIORITY_LABELS: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: 'Low', color: 'text-black', bg: 'bg-nb-sky border-black' },
    2: { label: 'Normal', color: 'text-black', bg: 'bg-nb-yellow border-black' },
    3: { label: 'High', color: 'text-black', bg: 'bg-nb-coral border-black' },
};

export default function DailyRevisionPage() {
    const { status } = useSession();
    const router = useRouter();
    const [mode, setMode] = useState<RevisionMode>('coding');
    const [phase, setPhase] = useState<Phase>('setup');
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
    const [questions, setQuestions] = useState<DailyQuestion[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [reports, setReports] = useState<AnswerReport[]>([]);
    const [avgScore, setAvgScore] = useState(0);
    const [todayCount, setTodayCount] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/topics')
                .then(r => r.json())
                .then(data => {
                    setTopics(data);
                    if (!data || data.length === 0) setPhase('no_topics');
                })
                .catch(() => setPhase('no_topics'));
        }
    }, [status]);

    function toggleTopic(id: number) {
        setSelectedTopicIds(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    }

    function selectAll() {
        setSelectedTopicIds(prev =>
            prev.length === topics.length ? [] : topics.map(t => t.id)
        );
    }

    async function startRevision() {
        setPhase('loading');
        setError('');
        try {
            const params = new URLSearchParams();
            params.set('mode', mode);
            if (selectedTopicIds.length > 0) params.set('topics', selectedTopicIds.join(','));
            const res = await fetch(`/api/daily?${params.toString()}`);
            const data = await res.json();
            if (data.todayCount !== undefined) setTodayCount(data.todayCount);
            if (data.error) throw new Error(data.error);
            if (!data.questions || data.questions.length === 0) {
                setError(data.message || 'No questions could be generated.');
                setPhase('setup');
                return;
            }
            setQuestions(data.questions);
            setAnswers(new Array(data.questions.length).fill(''));
            setCurrentQ(0);
            setPhase('answering');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setPhase('setup');
        }
    }

    async function handleSubmit() {
        setPhase('submitting');
        try {
            const payload = questions.map((q, i) => ({
                questionId: q.questionId,
                answer: answers[i],
            }));
            const res = await fetch('/api/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: payload, mode }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setReports(data.reports || []);
            setAvgScore(data.averageScore || 0);
            setTodayCount(prev => prev + 1);
            setPhase('results');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setPhase('answering');
        }
    }

    function resetForAnotherRound() {
        setQuestions([]);
        setAnswers([]);
        setCurrentQ(0);
        setReports([]);
        setAvgScore(0);
        setError('');
        setPhase('setup');
    }

    // Format problem text with highlighted sections
    function renderProblemText(text: string) {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            const trimmed = line.trim();
            if (/^(Example\s*\d*|Constraints|Expected|Input|Output|Explanation)/i.test(trimmed)) {
                return <div key={i} className="text-blue-800 font-bold mt-3 mb-1 text-sm">{line}</div>;
            }
            if (trimmed.startsWith('-') && /\d/.test(trimmed)) {
                return <div key={i} className="text-amber-900 text-sm pl-2 font-mono">{line}</div>;
            }
            if (/^(Input:|Output:)/i.test(trimmed)) {
                return <div key={i} className="text-emerald-900 font-mono text-sm mt-1">{line}</div>;
            }
            if (i === 0 && trimmed.length > 0 && !trimmed.startsWith('Given') && !trimmed.startsWith('You ')) {
                return <div key={i} className="text-lg font-bold text-black mb-2 font-[family-name:var(--font-outfit)]">{line}</div>;
            }
            if (!trimmed) return <div key={i} className="h-2" />;
            return <div key={i} className="text-neutral-900 text-sm leading-relaxed">{line}</div>;
        });
    }

    // ────── NO TOPICS ──────
    if (phase === 'no_topics') {
        return (
            <div className="max-w-lg mx-auto text-center py-20">
                <div className="nb-panel p-10">
                    <Brain className="w-16 h-16 text-neutral-700 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-black font-[family-name:var(--font-outfit)] mb-2">No Topics Available</h2>
                    <p className="text-neutral-700 mb-8">Add topics with content first to start revision.</p>
                    <Link href="/generate" className="inline-flex items-center gap-2 px-6 py-3 nb-btn nb-btn-primary text-black font-semibold transition-colors">
                        Generate Topics <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    // ────── SETUP ──────
    if (phase === 'setup') {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-black font-[family-name:var(--font-outfit)] tracking-tight">Daily Revision</h1>
                    <p className="text-neutral-700 mt-2">Choose your revision mode and select topics</p>
                    {todayCount > 0 && (
                        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-nb-lime border border-black text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {todayCount} session{todayCount > 1 ? 's' : ''} completed today
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-nb-coral border border-black text-red-800 text-sm flex items-center gap-2">
                        <X className="w-4 h-4 flex-shrink-0" /> {error}
                        {/upgrade/i.test(error) && (
                            <Link href="/pricing" className="ml-auto nb-btn nb-btn-primary px-3 py-1 text-xs whitespace-nowrap">
                                See plans
                            </Link>
                        )}
                    </div>
                )}

                {/* Mode Selector */}
                <div className="nb-panel p-5 mb-6">
                    <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider mb-4">Revision Mode</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setMode('coding')}
                            className={`p-4  border-2 transition-all text-left ${mode === 'coding'
                                    ? 'border-black bg-nb-sky'
                                    : 'border-black nb-inset hover:bg-black/5'
                                }`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10  flex items-center justify-center ${mode === 'coding' ? 'bg-nb-sky' : 'nb-inset'
                                    }`}>
                                    <Code2 className={`w-5 h-5 ${mode === 'coding' ? 'text-blue-800' : 'text-neutral-700'}`} />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${mode === 'coding' ? 'text-black' : 'text-neutral-800'}`}>Coding</h3>
                                    <p className="text-[10px] text-neutral-700 uppercase tracking-wider">LeetCode Style</p>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-700 leading-relaxed">
                                Solve coding problems with examples, constraints, and a code editor. Best for DSA practice.
                            </p>
                        </button>

                        <button
                            onClick={() => setMode('theory')}
                            className={`p-4  border-2 transition-all text-left ${mode === 'theory'
                                    ? 'border-black bg-nb-lime'
                                    : 'border-black nb-inset hover:bg-black/5'
                                }`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-10 h-10  flex items-center justify-center ${mode === 'theory' ? 'bg-nb-lime' : 'nb-inset'
                                    }`}>
                                    <BookOpen className={`w-5 h-5 ${mode === 'theory' ? 'text-emerald-800' : 'text-neutral-700'}`} />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${mode === 'theory' ? 'text-black' : 'text-neutral-800'}`}>Theory Q&A</h3>
                                    <p className="text-[10px] text-neutral-700 uppercase tracking-wider">General Revision</p>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-700 leading-relaxed">
                                Answer conceptual questions in your own words. Best for theory, concepts, and non-coding subjects.
                            </p>
                        </button>
                    </div>
                </div>

                {/* Topic Selector */}
                <div className="nb-panel p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                            <Filter className="w-4 h-4" /> Select Topics
                        </h2>
                        <button onClick={selectAll} className="text-xs font-semibold text-blue-800 hover:text-black transition-colors">
                            {selectedTopicIds.length === topics.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {topics.map(t => {
                            const selected = selectedTopicIds.includes(t.id);
                            const pri = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS[2];
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => toggleTopic(t.id)}
                                    className={`w-full flex items-center justify-between p-3.5  border transition-all text-left ${selected ? 'bg-nb-sky border-black' : 'nb-inset border-black hover:bg-black/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5  border-2 flex items-center justify-center transition-all ${selected ? 'bg-black border-black' : 'border-black'
                                            }`}>
                                            {selected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                                        </div>
                                        <span className="font-semibold text-neutral-900 text-sm">{t.name}</span>
                                        <span className="text-xs text-neutral-700">{t._count.questions}Q</span>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5  border ${pri.bg} ${pri.color}`}>
                                        {pri.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={startRevision}
                    className={`w-full py-4  font-bold text-black transition-all flex justify-center items-center gap-2  ${mode === 'coding'
                            ? 'nb-btn nb-btn-primary '
                            : 'nb-btn nb-btn-lime '
                        }`}
                >
                    {mode === 'coding' ? <Terminal className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                    {mode === 'coding' ? 'Start Coding' : 'Start Q&A Revision'}
                    {selectedTopicIds.length > 0 ? ` (${selectedTopicIds.length} topic${selectedTopicIds.length > 1 ? 's' : ''})` : ' (All Topics)'}
                </button>
            </div>
        );
    }

    // ────── LOADING ──────
    if (phase === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className={`w-16 h-16  flex items-center justify-center ${mode === 'coding' ? 'bg-nb-sky' : 'bg-nb-lime'}`}>
                    {mode === 'coding'
                        ? <Code2 className="w-8 h-8 text-blue-800 animate-pulse" />
                        : <BookOpen className="w-8 h-8 text-emerald-800 animate-pulse" />
                    }
                </div>
                <p className="text-neutral-800 font-semibold font-[family-name:var(--font-outfit)]">
                    {mode === 'coding' ? 'Generating coding problems...' : 'Generating revision questions...'}
                </p>
                <p className="text-neutral-700 text-sm">
                    {mode === 'coding' ? 'Crafting LeetCode-style challenges' : 'Creating conceptual questions'}
                </p>
                <Loader2 className={`w-6 h-6 animate-spin ${mode === 'coding' ? 'text-blue-800' : 'text-emerald-800'}`} />
            </div>
        );
    }

    // ────── SUBMITTING ──────
    if (phase === 'submitting') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Sparkles className={`w-12 h-12 animate-pulse ${mode === 'coding' ? 'text-blue-800' : 'text-emerald-800'}`} />
                <p className="text-lg text-neutral-900 font-semibold font-[family-name:var(--font-outfit)]">
                    {mode === 'coding' ? 'Evaluating your solutions...' : 'Evaluating your answers...'}
                </p>
                <p className="text-neutral-700 text-sm">
                    {mode === 'coding' ? 'Checking correctness, complexity, and code quality' : 'Checking accuracy, completeness, and understanding'}
                </p>
                <Loader2 className={`w-6 h-6 animate-spin mt-2 ${mode === 'coding' ? 'text-blue-800' : 'text-emerald-800'}`} />
            </div>
        );
    }

    // ────── RESULTS ──────
    if (phase === 'results') {
        const scoreColor = avgScore >= 80 ? 'text-emerald-800' : avgScore >= 60 ? 'text-amber-900' : 'text-red-800';
        const scoreBg = avgScore >= 80 ? 'bg-nb-lime' : avgScore >= 60 ? 'bg-nb-yellow' : 'bg-nb-coral';

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className={`nb-panel p-8 text-center ${scoreBg}`}>
                    <Trophy className={`w-12 h-12 mx-auto mb-4 ${scoreColor}`} />
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full nb-inset border border-black text-neutral-800 text-xs font-bold mb-3">
                        {mode === 'coding' ? <Code2 className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        {mode === 'coding' ? 'Coding Mode' : 'Theory Q&A'}
                    </div>
                    <h2 className="text-lg text-neutral-800 font-medium uppercase tracking-wider">Average Score</h2>
                    <p className={`text-6xl font-black font-[family-name:var(--font-outfit)] ${scoreColor} mt-2`}>{avgScore}%</p>
                    <p className="text-neutral-700 mt-3">{questions.length} {mode === 'coding' ? 'problems' : 'questions'} · Session #{todayCount} today</p>
                </div>

                {reports.map((r, i) => {
                    const sc = r.score >= 80 ? 'border-black bg-nb-lime' : r.score >= 60 ? 'border-black bg-nb-orange' : 'border-black bg-nb-coral';
                    const scText = r.score >= 80 ? 'text-emerald-800' : r.score >= 60 ? 'text-amber-900' : 'text-red-800';
                    const verdict = mode === 'coding'
                        ? (r.score >= 80 ? 'Accepted' : r.score >= 60 ? 'Partial' : 'Wrong Answer')
                        : (r.score >= 80 ? 'Excellent' : r.score >= 60 ? 'Good' : 'Needs Work');
                    const verdictColor = r.score >= 80 ? 'bg-nb-lime text-emerald-800 border-black' : r.score >= 60 ? 'bg-nb-orange text-amber-900 border-black' : 'bg-nb-coral text-red-800 border-black';

                    return (
                        <div key={i} className={`nb-panel  p-6 border ${sc}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">{r.topicName}</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5  border ${verdictColor}`}>
                                            {verdict}
                                        </span>
                                    </div>
                                    <p className="text-black font-semibold text-sm">{r.question.split('\n')[0]}</p>
                                </div>
                                <span className={`text-2xl font-black font-[family-name:var(--font-outfit)] ${scText}`}>{r.score}%</span>
                            </div>

                            <div className="space-y-3 text-sm">
                                {/* Your Answer/Solution */}
                                <div className="overflow-hidden border border-black">
                                    <div className="nb-inset px-4 py-2 border-b border-black flex items-center gap-2">
                                        {mode === 'coding' ? <Code2 className="w-3.5 h-3.5 text-neutral-700" /> : <MessageSquare className="w-3.5 h-3.5 text-neutral-700" />}
                                        <span className="text-xs text-neutral-700 font-bold uppercase tracking-wider">
                                            {mode === 'coding' ? 'Your Solution' : 'Your Answer'}
                                        </span>
                                    </div>
                                    {mode === 'coding' ? (
                                        <pre className="p-4 bg-[#0d1117] text-neutral-900 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                            {answers[i] || '(no solution submitted)'}
                                        </pre>
                                    ) : (
                                        <div className="p-4 nb-inset text-neutral-900 text-sm leading-relaxed">
                                            {answers[i] || '(no answer submitted)'}
                                        </div>
                                    )}
                                </div>

                                {/* Feedback */}
                                <div className="nb-inset p-4">
                                    <p className="text-xs text-neutral-700 font-bold uppercase tracking-wider mb-2">
                                        {mode === 'coding' ? 'Judge Feedback' : 'Tutor Feedback'}
                                    </p>
                                    <p className="text-neutral-900 leading-relaxed">{r.feedback}</p>
                                </div>

                                {/* Correct Answer */}
                                <div className="overflow-hidden border border-black">
                                    <div className="bg-nb-lime px-4 py-2 border-b border-black flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                                        <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                                            {mode === 'coding' ? 'Optimal Solution' : 'Correct Answer'}
                                        </span>
                                    </div>
                                    {mode === 'coding' ? (
                                        <pre className="p-4 bg-[#0d1117] text-emerald-900 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                            {r.correctAnswer}
                                        </pre>
                                    ) : (
                                        <div className="p-4 bg-nb-lime text-neutral-900 text-sm leading-relaxed">
                                            {r.correctAnswer}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="flex flex-col sm:flex-row gap-3 py-4">
                    <button
                        onClick={resetForAnotherRound}
                        className={`flex-1 py-3  font-semibold text-black transition-colors flex justify-center items-center gap-2 ${mode === 'coding' ? 'nb-btn nb-btn-primary' : 'nb-btn nb-btn-lime'
                            }`}
                    >
                        <RotateCcw className="w-4 h-4" /> {mode === 'coding' ? 'Solve More Problems' : 'Revise Again'}
                    </button>
                    <Link href="/" className="flex-1 py-3 font-semibold nb-inset border border-black text-neutral-900 hover:bg-black/10 transition-colors flex justify-center items-center gap-2 text-center">
                        View Profile <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    // ────── ANSWERING ──────
    const q = questions[currentQ];
    const allAnswered = answers.every(a => a.trim().length > 0);
    const accentColor = mode === 'coding' ? 'indigo' : 'emerald';

    // ────── THEORY MODE: Simple Q&A ──────
    if (mode === 'theory') {
        return (
            <div className="max-w-3xl mx-auto">
                {/* Progress */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 text-xs text-neutral-700 font-medium uppercase tracking-wider">
                        <span className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" /> Question {currentQ + 1} of {questions.length}
                        </span>
                        <span>{answers.filter(a => a.trim()).length} answered</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full nb-inset">
                        <div
                            className="h-full rounded-full nb-btn nb-btn-lime transition-all duration-500"
                            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="nb-panel p-8 mb-6">
                    <div className="mb-6">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-nb-lime px-3 py-1 rounded-full border border-black">
                            {q.topicName}
                        </span>
                        {q.isReview && (
                            <span className="ml-2 text-xs font-bold text-black uppercase tracking-wider bg-nb-sky px-3 py-1 border border-black">
                                Due for review
                            </span>
                        )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-black leading-relaxed mb-8 font-[family-name:var(--font-outfit)]">
                        {q.question}
                    </h3>
                    <textarea
                        value={answers[currentQ]}
                        onChange={e => {
                            const newAnswers = [...answers];
                            newAnswers[currentQ] = e.target.value;
                            setAnswers(newAnswers);
                        }}
                        placeholder="Type your answer here... Explain in your own words."
                        rows={10}
                        className="w-full px-5 py-4 nb-inset border border-black text-black outline-none focus:border-black transition-colors placeholder:text-neutral-600 resize-none leading-relaxed"
                    />
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-nb-coral border border-black text-red-800 text-sm flex items-center gap-2">
                        <X className="w-4 h-4" /> {error}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setCurrentQ(c => Math.max(0, c - 1))}
                        disabled={currentQ === 0}
                        className="px-4 py-2.5 text-sm font-semibold nb-inset border border-black text-neutral-800 hover:text-black transition-colors disabled:opacity-30 flex items-center gap-1.5"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {currentQ < questions.length - 1 ? (
                        <button
                            onClick={() => setCurrentQ(c => c + 1)}
                            className="px-4 py-2.5 text-sm font-semibold nb-inset border border-black text-neutral-900 hover:text-black transition-colors flex items-center gap-1.5"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!allAnswered}
                            className="px-6 py-2.5 text-sm font-bold nb-btn nb-btn-lime text-black transition-all disabled:opacity-30 flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" /> Submit Answers
                        </button>
                    )}
                </div>

                <div className="flex justify-center gap-2 mt-6">
                    {questions.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentQ(i)}
                            className={`w-3 h-3 rounded-full transition-all ${i === currentQ ? 'bg-nb-emerald scale-125' : answers[i].trim() ? 'bg-nb-emerald' : 'bg-black/10'
                                }`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // ────── CODING MODE: Split Pane ──────
    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2 text-xs text-neutral-700 font-medium uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5" /> Problem {currentQ + 1} of {questions.length}
                    </span>
                    <span>{answers.filter(a => a.trim()).length} solved</span>
                </div>
                <div className="w-full h-1.5 rounded-full nb-inset">
                    <div
                        className="h-full rounded-full nb-btn nb-btn-primary transition-all duration-500"
                        style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Problem */}
                <div className="nb-panel overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-black flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-blue-800" />
                        <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Problem</span>
                        <span className="ml-auto text-[10px] font-bold text-blue-800 bg-nb-sky px-2 py-0.5 border border-black">
                            {q.topicName}
                        </span>
                        {q.isReview && (
                            <span className="text-[10px] font-bold text-black bg-nb-lime px-2 py-0.5 border border-black">
                                REVIEW
                            </span>
                        )}
                    </div>
                    <div className="p-5 overflow-y-auto max-h-[500px] flex-1">
                        {renderProblemText(q.question)}
                    </div>
                </div>

                {/* Code Editor */}
                <div className="overflow-hidden border border-black flex flex-col bg-[#0d1117]">
                    <div className="px-5 py-3 border-b border-black flex items-center gap-2 bg-[#161b22]">
                        <Terminal className="w-4 h-4 text-emerald-800" />
                        <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Solution</span>
                        <span className="ml-auto text-[10px] text-neutral-700">Python / C++ / Java / Pseudocode</span>
                    </div>
                    <div className="flex-1 flex">
                        <div className="py-4 px-3 text-right select-none border-r border-black">
                            {Array.from({ length: Math.max(20, (answers[currentQ]?.split('\n').length || 0) + 5) }, (_, i) => (
                                <div key={i} className="text-neutral-700 font-mono text-xs leading-[1.625rem]">{i + 1}</div>
                            ))}
                        </div>
                        <textarea
                            value={answers[currentQ]}
                            onChange={e => {
                                const newAnswers = [...answers];
                                newAnswers[currentQ] = e.target.value;
                                setAnswers(newAnswers);
                            }}
                            placeholder="// Write your solution here..."
                            spellCheck={false}
                            className="flex-1 p-4 bg-transparent text-emerald-900 font-mono text-sm leading-[1.625rem] outline-none resize-none placeholder:text-neutral-600 min-h-[500px]"
                            style={{ tabSize: 4 }}
                            onKeyDown={e => {
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    const target = e.target as HTMLTextAreaElement;
                                    const start = target.selectionStart;
                                    const end = target.selectionEnd;
                                    const newAnswers = [...answers];
                                    newAnswers[currentQ] =
                                        answers[currentQ].substring(0, start) + '    ' + answers[currentQ].substring(end);
                                    setAnswers(newAnswers);
                                    setTimeout(() => { target.selectionStart = target.selectionEnd = start + 4; }, 0);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-nb-coral border border-black text-red-800 text-sm flex items-center gap-2">
                    <X className="w-4 h-4" /> {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <button
                    onClick={() => setCurrentQ(c => Math.max(0, c - 1))}
                    disabled={currentQ === 0}
                    className="px-4 py-2.5 text-sm font-semibold nb-inset border border-black text-neutral-800 hover:text-black transition-colors disabled:opacity-30 flex items-center gap-1.5"
                >
                    <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentQ < questions.length - 1 ? (
                    <button
                        onClick={() => setCurrentQ(c => c + 1)}
                        className="px-4 py-2.5 text-sm font-semibold nb-inset border border-black text-neutral-900 hover:text-black transition-colors flex items-center gap-1.5"
                    >
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={!allAnswered}
                        className="px-6 py-2.5 text-sm font-bold nb-btn nb-btn-primary text-black transition-all disabled:opacity-30 flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" /> Submit All Solutions
                    </button>
                )}
            </div>

            <div className="flex justify-center gap-2 mt-6">
                {questions.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentQ(i)}
                        className={`w-3 h-3 rounded-full transition-all ${i === currentQ ? 'bg-black scale-125' : answers[i].trim() ? 'bg-nb-emerald' : 'bg-black/10'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
