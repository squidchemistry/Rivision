'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Pencil, Trash2, X, FileText, Loader2, ChevronUp, ChevronDown, Target } from 'lucide-react';

type Topic = {
    id: number;
    name: string;
    content: string;
    priority: number;
    _count: { questions: number };
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    1: { label: 'Low', color: 'text-black', bg: 'nb-card-sky' },
    2: { label: 'Normal', color: 'text-black', bg: 'nb-card-yellow' },
    3: { label: 'High', color: 'text-black', bg: 'nb-card-coral' },
};

export default function TopicsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    function loadTopics() {
        return fetch('/api/topics')
            .then(res => res.json())
            .then(data => {
                setTopics(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/topics')
            .then(res => res.json())
            .then(data => {
                setTopics(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, [status]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        const res = await fetch('/api/topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, content }),
        });
        if (res.ok) { setName(''); setContent(''); setShowCreate(false); loadTopics(); }
    }

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (!editId) return;
        await fetch(`/api/topics/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, content }),
        });
        setEditId(null); setName(''); setContent('');
        loadTopics();
    }

    async function handleDelete(id: number) {
        if (!confirm('Delete this topic and all its questions?')) return;
        await fetch(`/api/topics/${id}`, { method: 'DELETE' });
        loadTopics();
    }

    async function changePriority(id: number, direction: 'up' | 'down') {
        const topic = topics.find(t => t.id === id);
        if (!topic) return;
        const newPriority = direction === 'up'
            ? Math.min(3, topic.priority + 1)
            : Math.max(1, topic.priority - 1);
        if (newPriority === topic.priority) return;

        await fetch(`/api/topics/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: newPriority }),
        });
        loadTopics();
    }

    function startEdit(topic: Topic) {
        setEditId(topic.id);
        setName(topic.name);
        setContent(topic.content || '');
        setShowCreate(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen nb-bg flex justify-center items-center">
                <div className="w-16 h-16 nb-spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen nb-bg">
            <div className="nb-container py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="nb-title text-5xl md:text-7xl text-black mb-4">
                            MY TOPICS
                        </h1>
                        <p className="nb-text text-xl text-black">
                            Manage your study subjects and set priorities for focused revision
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowCreate(true); setEditId(null); setName(''); setContent(''); }}
                        className="nb-btn nb-btn-lime px-6 py-4 text-lg flex items-center gap-3"
                    >
                        <Plus className="w-6 h-6" />
                        NEW TOPIC
                    </button>
                </div>

                {/* Priority Legend */}
                <div className="nb-card p-6 mb-8">
                    <h3 className="nb-subtitle text-lg text-black mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        PRIORITY LEVELS
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        {[3, 2, 1].map(p => {
                            const cfg = PRIORITY_CONFIG[p];
                            return (
                                <div key={p} className={`${cfg.bg} px-4 py-2 border-4 border-black`}>
                                    <span className={`nb-subtitle text-sm ${cfg.color}`}>
                                        {cfg.label.toUpperCase()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Create / Edit Form */}
                {(showCreate || editId !== null) && (
                    <div className="nb-card p-8 mb-8 relative">
                        <button 
                            onClick={() => { setShowCreate(false); setEditId(null); }} 
                            className="absolute top-6 right-6 nb-btn nb-btn-coral px-3 py-3"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <h2 className="nb-title text-3xl text-black mb-8">
                            {editId ? 'EDIT TOPIC' : 'CREATE NEW TOPIC'}
                        </h2>
                        
                        <form onSubmit={editId ? handleUpdate : handleCreate} className="space-y-6">
                            <div>
                                <label className="block nb-subtitle text-sm text-black mb-3">
                                    TOPIC NAME
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Machine Learning, React Hooks..."
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="nb-input w-full px-4 py-4 text-lg"
                                />
                            </div>
                            
                            <div>
                                <label className="block nb-subtitle text-sm text-black mb-3">
                                    STUDY CONTENT
                                </label>
                                <textarea
                                    placeholder="Paste your study notes, textbook content, or any material here..."
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    rows={10}
                                    className="nb-textarea w-full px-4 py-4 text-lg"
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="nb-btn nb-btn-primary w-full py-4 text-xl"
                            >
                                {editId ? 'SAVE CHANGES' : 'CREATE TOPIC'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Topics Grid */}
                <div className="nb-grid nb-grid-2 gap-6">
                    {topics.map(t => {
                        const pri = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG[2];
                        return (
                            <div key={t.id} className="nb-card p-6 group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-16 h-16 bg-black flex items-center justify-center border-4 border-black flex-shrink-0">
                                            <Layers className="w-8 h-8 text-[#fde047]" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="nb-title text-xl text-black mb-1 truncate">
                                                {t.name}
                                            </h3>
                                            <p className="nb-text text-sm text-black">
                                                {t._count.questions} questions
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button 
                                            onClick={() => startEdit(t)} 
                                            className="nb-btn nb-btn-sky px-3 py-3"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(t.id)} 
                                            className="nb-btn nb-btn-coral px-3 py-3"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Priority Controls */}
                                <div className="flex items-center justify-between mb-4 pt-4 border-t-4 border-black">
                                    <div className="flex items-center gap-3">
                                        <span className="nb-subtitle text-xs text-black">
                                            PRIORITY:
                                        </span>
                                        <div className={`${pri.bg} px-3 py-1 border-3 border-black`}>
                                            <span className={`nb-subtitle text-xs ${pri.color}`}>
                                                {pri.label.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => changePriority(t.id, 'up')}
                                            disabled={t.priority >= 3}
                                            className="nb-btn nb-btn-lime px-2 py-2 disabled:opacity-50"
                                            title="Increase priority"
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => changePriority(t.id, 'down')}
                                            disabled={t.priority <= 1}
                                            className="nb-btn nb-btn-sky px-2 py-2 disabled:opacity-50"
                                            title="Decrease priority"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {t.content && (
                                    <div className="flex items-start gap-2 nb-card-yellow p-3">
                                        <FileText className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
                                        <span className="nb-text text-sm text-black line-clamp-3">
                                            {t.content.slice(0, 120)}...
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {topics.length === 0 && (
                    <div className="nb-card p-12 text-center">
                        <Layers className="w-20 h-20 mx-auto mb-6 text-black opacity-50" />
                        <h3 className="nb-title text-2xl text-black mb-4">
                            NO TOPICS YET
                        </h3>
                        <p className="nb-text text-lg text-black mb-6">
                            Create your first topic to start learning!
                        </p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="nb-btn nb-btn-lime px-8 py-4 text-lg"
                        >
                            CREATE FIRST TOPIC
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
