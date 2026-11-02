'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, Brain, UploadCloud, Link as LinkIcon, Loader2, CheckCircle2, Zap, FileText } from 'lucide-react';

type Topic = { id: number; name: string };

export default function GeneratePage() {
    const { status } = useSession();
    const router = useRouter();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [urls, setUrls] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [difficulty, setDifficulty] = useState('1');
    const [count, setCount] = useState('5');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/topics').then(r => r.json()).then(setTopics);
        }
    }, [status]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() && !content.trim() && files.length === 0 && !urls.trim()) {
            setResult({ success: false, message: 'Please provide a topic name and some content.' });
            return;
        }

        setLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('content', content);
        formData.append('difficulty', difficulty);
        formData.append('count', count);
        formData.append('urls', urls);
        files.forEach(f => formData.append('file', f));

        try {
            const res = await fetch('/api/generate', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult({ success: true, message: `Created topic "${name}" with ${data.questionsGenerated} AI-generated questions!` });
            setName(''); setContent(''); setUrls(''); setFiles([]);
            // Reload topics
            fetch('/api/topics').then(r => r.json()).then(setTopics);
        } catch (err) {
            setResult({ success: false, message: err instanceof Error ? err.message : String(err) });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen nb-bg">
            <div className="nb-container py-12">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="w-20 h-20 bg-black flex items-center justify-center mx-auto mb-6 border-4 border-black transform rotate-12">
                        <Sparkles className="w-10 h-10 text-[#fde047]" />
                    </div>
                    <h1 className="nb-title text-5xl md:text-7xl text-black mb-6">
                        AI QUESTION<br />
                        <span className="inline-block nb-card-purple px-4 py-2 text-black transform -rotate-2">
                            GENERATOR
                        </span>
                    </h1>
                    <p className="nb-text text-xl text-black max-w-3xl mx-auto">
                        Upload content, paste notes, or provide links — our AI will create a topic and generate smart revision questions instantly.
                    </p>
                </div>

                {/* Result Message */}
                {result && (
                    <div className={`mb-8 p-6 text-center border-4 border-black ${
                        result.success ? 'nb-card-lime' : 'nb-card-coral'
                    }`}>
                        <div className="flex items-center justify-center gap-3 mb-2">
                            {result.success ? (
                                <CheckCircle2 className="w-6 h-6 text-black" />
                            ) : (
                                <span className="text-2xl">⚠️</span>
                            )}
                            <span className={`nb-subtitle text-lg ${result.success ? 'text-black' : 'text-black'}`}>
                                {result.success ? 'SUCCESS!' : 'ERROR!'}
                            </span>
                        </div>
                        <p className={`nb-text ${result.success ? 'text-black' : 'text-black'}`}>
                            {result.message}
                        </p>
                    </div>
                )}

                {/* Main Form */}
                <form onSubmit={handleSubmit} className="nb-card p-8 space-y-8">
                    <h2 className="nb-title text-3xl text-black text-center mb-8">
                        CREATE YOUR TOPIC
                    </h2>

                    {/* Topic Name */}
                    <div>
                        <label className="block nb-subtitle text-sm text-black mb-3">
                            📚 TOPIC NAME
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., Machine Learning, React Hooks, Photosynthesis..."
                            className="nb-input w-full px-4 py-4 text-lg"
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block nb-subtitle text-sm text-black mb-3 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            STUDY CONTENT
                        </label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Paste your study notes, textbook content, lecture slides, or any material here..."
                            rows={10}
                            className="nb-textarea w-full px-4 py-4 text-lg"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block nb-subtitle text-sm text-black mb-3 flex items-center gap-2">
                            <UploadCloud className="w-4 h-4" />
                            UPLOAD FILES (PDF, DOCX, TXT, ZIP)
                        </label>
                        <div className="nb-card-yellow p-8 text-center relative group cursor-pointer">
                            <input
                                type="file"
                                multiple
                                onChange={e => e.target.files && setFiles(Array.from(e.target.files))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <UploadCloud className="w-12 h-12 text-black mx-auto mb-4 group-hover:scale-110 transition-transform" />
                            {files.length > 0 ? (
                                <div>
                                    <p className="nb-subtitle text-lg text-black mb-2">
                                        {files.length} FILE(S) SELECTED
                                    </p>
                                    <div className="space-y-1">
                                        {files.slice(0, 3).map((file, i) => (
                                            <p key={i} className="nb-text text-sm text-black">
                                                📄 {file.name}
                                            </p>
                                        ))}
                                        {files.length > 3 && (
                                            <p className="nb-text text-sm text-black">
                                                +{files.length - 3} more files...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="nb-subtitle text-lg text-black mb-2">
                                        DRAG & DROP OR CLICK
                                    </p>
                                    <p className="nb-text text-black">
                                        Upload your study materials
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* URLs */}
                    <div>
                        <label className="block nb-subtitle text-sm text-black mb-3 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            WEB LINKS (ONE PER LINE)
                        </label>
                        <textarea
                            value={urls}
                            onChange={e => setUrls(e.target.value)}
                            placeholder="https://example.com/article&#10;https://wikipedia.org/wiki/topic&#10;https://docs.example.com/guide"
                            rows={4}
                            className="nb-textarea w-full px-4 py-4 text-lg font-mono"
                        />
                    </div>

                    {/* Settings */}
                    <div className="nb-card-sky p-6">
                        <h3 className="nb-subtitle text-lg text-black mb-6 text-center">
                            ⚙️ GENERATION SETTINGS
                        </h3>
                        <div className="nb-grid nb-grid-2 gap-6">
                            <div>
                                <label className="block nb-subtitle text-sm text-black mb-4">
                                    DIFFICULTY LEVEL
                                </label>
                                <div className="nb-grid nb-grid-3 gap-2">
                                    {[
                                        { v: '1', l: 'EASY', emoji: '😊' },
                                        { v: '2', l: 'MEDIUM', emoji: '🤔' },
                                        { v: '3', l: 'HARD', emoji: '🔥' }
                                    ].map(({ v, l, emoji }) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => setDifficulty(v)}
                                            className={`nb-btn py-3 text-sm ${
                                                difficulty === v ? 'nb-btn-yellow' : 'nb-btn-secondary'
                                            }`}
                                        >
                                            {emoji} {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block nb-subtitle text-sm text-black mb-4">
                                    NUMBER OF QUESTIONS
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={count}
                                    onChange={e => setCount(e.target.value)}
                                    className="nb-input w-full px-4 py-3 text-center text-xl font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="nb-btn nb-btn-primary w-full py-6 text-2xl flex justify-center items-center gap-4"
                    >
                        {loading ? (
                            <>
                                <div className="w-8 h-8 nb-spinner" />
                                GENERATING MAGIC...
                            </>
                        ) : (
                            <>
                                <Zap className="w-8 h-8" />
                                GENERATE QUESTIONS
                            </>
                        )}
                    </button>
                </form>

                {/* Existing Topics */}
                {topics.length > 0 && (
                    <div className="mt-12">
                        <h2 className="nb-title text-3xl text-black mb-6 text-center">
                            YOUR EXISTING TOPICS
                        </h2>
                        <div className="nb-grid nb-grid-3 gap-4">
                            {topics.slice(0, 6).map(topic => (
                                <div key={topic.id} className="nb-card-lime p-4 text-center">
                                    <FileText className="w-8 h-8 text-black mx-auto mb-2" />
                                    <p className="nb-subtitle text-sm text-black truncate">
                                        {topic.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
