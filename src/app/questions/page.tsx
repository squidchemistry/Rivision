'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Hash, CheckSquare, ListPlus } from 'lucide-react';

type Topic = { id: number; name: string };
type Question = {
    id: number;
    questionText: string;
    topic: Topic;
    difficulty: number;
};

export default function QuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [topicId, setTopicId] = useState('');
    const [questionText, setQuestionText] = useState('');
    const [difficulty, setDifficulty] = useState('1');

    useEffect(() => {
        // Error responses (e.g. 401 when signed out) are objects, not lists
        fetch('/api/topics').then(res => res.json()).then(data => setTopics(Array.isArray(data) ? data : []));
        fetch('/api/questions').then(res => res.json()).then(data => setQuestions(Array.isArray(data) ? data : []));
    }, []);

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicId || !questionText.trim()) return;

        const res = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId, questionText, difficulty }),
        });

        if (res.ok) {
            const newQuestion = await res.json();
            const topicObj = topics.find(t => t.id.toString() === topicId)!;
            setQuestions([{ ...newQuestion, topic: topicObj }, ...questions]);
            setQuestionText('');
            setDifficulty('1');
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-4">
            <div className="mb-10 text-center sm:text-left">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-black tracking-tight mb-3 font-[family-name:var(--font-outfit)]">Question Library</h1>
                <p className="text-neutral-700 text-lg">Manage and build your personal study deck manually.</p>
            </div>

            <motion.form
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={handleAddQuestion}
                className="mb-14 nb-panel p-8 border border-black relative overflow-hidden group focus-within:ring-1 ring-black"
            >

                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center bg-black/5 border border-black px-4 py-2 transition-colors">
                        <Hash className="w-5 h-5 text-blue-800 mr-3" />
                        <select
                            value={topicId}
                            onChange={(e) => setTopicId(e.target.value)}
                            className="w-full bg-transparent px-2 py-3 text-neutral-900 outline-none appearance-none cursor-pointer font-medium"
                        >
                            <option value="" disabled className="text-neutral-700 nb-inset border-none">Pick a Knowledge Topic</option>
                            {topics.map(t => <option key={t.id} value={t.id} className="text-neutral-900 nb-inset">{t.name}</option>)}
                        </select>
                    </div>

                    <textarea
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="What would you like to memorize..."
                        className="w-full bg-black/5 border border-black px-6 py-5 text-neutral-900 outline-none placeholder:text-neutral-600 focus:border-black transition-colors min-h-[140px] resize-y font-medium text-lg leading-relaxed"
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 bg-black/5 p-4 border border-black">
                        <span className="flex items-center gap-2 text-sm font-semibold tracking-wider text-neutral-700 uppercase font-[family-name:var(--font-outfit)]">
                            <Target className="w-4 h-4 text-orange-800" /> Target Difficulty:
                        </span>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {[1, 2, 3].map(level => {
                                const bgActive = difficulty === level.toString() ? 'nb-btn nb-btn-primary text-black' : 'bg-transparent text-neutral-800 hover:text-black border-black';
                                return (
                                    <label key={level} className={`flex-1 sm:flex-none flex justify-center items-center cursor-pointer border px-6 py-2  transition-all font-bold ${bgActive}`}>
                                        <input
                                            type="radio"
                                            name="difficulty"
                                            value={level}
                                            className="hidden"
                                            checked={difficulty === level.toString()}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                        />
                                        Lvl {level}
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!topicId || !questionText.trim()}
                    className="w-full py-5 nb-btn nb-btn-primary active:scale-[0.99] font-bold tracking-wide transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2 uppercase font-[family-name:var(--font-outfit)]"
                >
                    <ListPlus className="w-5 h-5" /> Push to Library
                </button>
            </motion.form>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-6 text-neutral-900 font-[family-name:var(--font-outfit)] tracking-tight flex items-center gap-3">
                    <CheckSquare className="w-6 h-6 text-blue-800" />
                    All Active Cards <span className="text-black text-sm bg-nb-sky px-3 py-1 border-2 border-black">{questions.length} total</span>
                </h2>

                <div className="grid grid-cols-1 gap-4">
                    {questions.map((q, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            key={q.id}
                            className="nb-panel p-6 sm:p-8 border border-black transition-colors hover:bg-black/5 flex flex-col sm:flex-row gap-6 justify-between items-start cursor-default"
                        >
                            <div className="flex-1">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-nb-sky text-blue-800 text-xs font-bold mb-4 border border-black uppercase tracking-widest">
                                    {q.topic?.name || 'Unknown Topic'}
                                </span>
                                <p className="text-neutral-900 text-lg font-medium leading-relaxed">{q.questionText}</p>
                            </div>

                            <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
                                <div className="flex flex-col items-center justify-center bg-black/5 border border-black w-16 h-16">
                                    <span className="text-orange-800 font-black text-xl">{q.difficulty}</span>
                                    <span className="text-[10px] text-neutral-700 uppercase tracking-widest font-bold">Lvl</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {questions.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 text-neutral-700 border border-dashed border-black bg-black/5 font-[family-name:var(--font-outfit)]">
                        Your deck is completely empty. Create your first card above!
                    </motion.div>
                )}
            </div>
        </div>
    );
}
