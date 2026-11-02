'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: number;
  questionText: string;
  difficulty: number;
  successCount: number;
  failureCount: number;
  lastReviewed: string | null;
}

interface Topic {
  id: number;
  name: string;
  content: string;
  priority: number;
  createdAt: string;
  questions: Question[];
  _count: { questions: number };
}

interface UserData {
  topics: Topic[];
  totalTopics: number;
  totalQuestions: number;
}

export default function MyData() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserData();
    }
  }, [status]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/topics');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }
      const userData = await res.json();
      setData(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen pt-32 pb-12 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-800" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="relative min-h-screen pt-32 pb-12 px-4">

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black">My Study Data</h1>
            <p className="text-neutral-800 mt-2">View all your topics and questions</p>
          </div>
          <Link
            href="/topics"
            className="flex items-center gap-2 nb-btn nb-btn-primary text-black px-4 py-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Topic
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="nb-inset border border-black p-4">
            <p className="text-neutral-800 text-sm mb-1">Total Topics</p>
            <p className="text-3xl font-bold text-black">{data?.totalTopics || 0}</p>
          </div>
          <div className="nb-inset border border-black p-4">
            <p className="text-neutral-800 text-sm mb-1">Total Questions</p>
            <p className="text-3xl font-bold text-black">{data?.totalQuestions || 0}</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-nb-coral border border-black text-red-800 px-4 py-3 mb-8 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Topics List */}
        <div className="space-y-4">
          {data && data.topics.length > 0 ? (
            data.topics.map((topic) => (
              <div
                key={topic.id}
                className="nb-inset border border-black p-6 hover:bg-black/10 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-black">{topic.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-neutral-800">
                      <span>{topic._count.questions} questions</span>
                      <span>Priority: {topic.priority === 1 ? 'Low' : topic.priority === 2 ? 'Normal' : 'High'}</span>
                      <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Link
                    href={`/topics`}
                    className="text-blue-800 hover:text-black text-sm font-medium"
                  >
                    Manage
                  </Link>
                </div>

                {/* Topic content */}
                {topic.content && (
                  <p className="text-neutral-900 text-sm mb-4 line-clamp-2">{topic.content}</p>
                )}

                {/* Questions */}
                {topic.questions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-black">
                    <p className="text-sm text-neutral-800 mb-3">Questions:</p>
                    <div className="space-y-2">
                      {topic.questions.slice(0, 5).map((q) => (
                        <div key={q.id} className="flex items-center justify-between nb-inset p-3">
                          <div className="flex-1">
                            <p className="text-sm text-black">{q.questionText.substring(0, 80)}...</p>
                            <div className="flex gap-3 mt-1 text-xs text-neutral-700">
                              <span>Difficulty: {q.difficulty}/5</span>
                              <span>✓ {q.successCount}</span>
                              <span>✗ {q.failureCount}</span>
                              {q.lastReviewed && (
                                <span>{new Date(q.lastReviewed).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {topic.questions.length > 5 && (
                        <p className="text-xs text-neutral-700 p-2">+{topic.questions.length - 5} more questions</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="nb-inset border border-black p-8 text-center">
              <BookOpen className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-800 mb-4">You haven&apos;t created any topics yet</p>
              <Link
                href="/topics"
                className="inline-flex items-center gap-2 nb-btn nb-btn-primary text-black px-4 py-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Your First Topic
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
