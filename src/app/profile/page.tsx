'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Flame, Trophy, Target, BookOpen, Clock, Zap, Award, ArrowRight, Loader2, Layers, Calendar, TrendingUp } from 'lucide-react';

type Profile = {
  currentStreak: number;
  longestStreak: number;
  totalRevisions: number;
  topicsCount: number;
  questionsCount: number;
  totalQuestionsSolved: number;
  averageScore: number;
  calendarData: { date: string; count: number }[];
  recentActivity: { id: number; date: string; averageScore: number; questionsAnswered: number; topicsSummary: string }[];
  achievements: { id: string; emoji: string; label: string; unlocked: boolean }[];
  plan?: { id: string; name: string; expiresAt: string | null; questionsUsed: number; questionsLimit: number | null };
};

function PlanUsage({ plan }: { plan: NonNullable<Profile['plan']> }) {
  const limit = plan.questionsLimit;
  const pct = limit ? Math.min(100, Math.round((plan.questionsUsed / limit) * 100)) : 0;
  return (
    <div className="nb-card-lime p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="nb-subtitle text-sm text-black">
          {plan.name} plan
          {plan.expiresAt && (
            <span className="ml-2 normal-case font-semibold">
              · active until {new Date(plan.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="nb-title text-2xl text-black mt-1 tabular-nums">
          {limit === null
            ? `${plan.questionsUsed} AI questions this month · unlimited`
            : `${plan.questionsUsed} / ${limit} AI questions this month`}
        </div>
        {limit !== null && (
          <div className="nb-progress h-4 mt-3">
            <div className="nb-progress-bar" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {plan.id !== 'premium' && (
        <Link href="/pricing" className="nb-btn nb-btn-primary px-5 py-3 text-center whitespace-nowrap">
          {plan.id === 'free' ? 'Upgrade' : 'Go Premium'}
        </Link>
      )}
    </div>
  );
}

function HeatmapCalendar({ data }: { data: { date: string; count: number }[] }) {
  const getColor = (count: number) => {
    if (count === 0) return 'bg-[#ff6b6b] border-2 border-black';
    if (count === 1) return 'bg-[#a3e635] border-2 border-black';
    if (count === 2) return 'bg-[#38bdf8] border-2 border-black';
    return 'bg-[#c084fc] border-2 border-black';
  };

  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];
  const firstDay = new Date(data[0]?.date || new Date());
  const startPad = firstDay.getDay();
  for (let i = 0; i < startPad; i++) currentWeek.push({ date: '', count: -1 });
  for (const d of data) {
    currentWeek.push(d);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-1" style={{ minWidth: 'max-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((d, di) => (
              <div
                key={di}
                className={`heatmap-cell ${d.count < 0 ? 'opacity-0' : getColor(d.count)}`}
                title={d.date ? `${d.date}: ${d.count} revision(s)` : ''}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressCircle({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 mb-2">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#000"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="nb-title text-lg text-black">{value}</span>
        </div>
      </div>
      <span className="nb-subtitle text-xs text-black text-center">{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/profile')
        .then(r => r.json())
        .then(d => { setProfile(d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [status]);

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen nb-bg flex justify-center items-center">
        <div className="w-16 h-16 nb-spinner" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen nb-bg">
      <div className="nb-container py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-black flex items-center justify-center text-3xl font-black text-[#fde047] border-4 border-black transform rotate-3">
              {session?.user?.name?.[0]?.toUpperCase() || 'R'}
            </div>
            <div>
              <h1 className="nb-title text-4xl md:text-5xl text-black mb-2">
                {session?.user?.name?.toUpperCase()}&apos;S PROFILE
              </h1>
              <p className="nb-text text-lg text-black">
                Your learning journey dashboard
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/topics">
              <button className="nb-btn nb-btn-sky px-6 py-3 text-lg flex items-center gap-3">
                <Layers className="w-5 h-5" />
                MANAGE TOPICS
              </button>
            </Link>
            <Link href="/daily">
              <button className="nb-btn nb-btn-primary px-6 py-3 text-lg flex items-center gap-3">
                <Zap className="w-5 h-5" />
                START REVISION
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {profile.plan && <PlanUsage plan={profile.plan} />}

        {/* Stats Cards */}
        <div className="nb-grid nb-grid-4 gap-6">
          <div className="nb-card-coral p-6 text-center transform rotate-1">
            <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-4 border-4 border-black">
              <Flame className="w-8 h-8 text-[#ff6b6b]" />
            </div>
            <div className="nb-title text-3xl text-black mb-2">
              {profile.currentStreak}
            </div>
            <div className="nb-subtitle text-sm text-black">
              CURRENT STREAK
            </div>
            <div className="nb-text text-xs text-black mt-1">
              {profile.currentStreak === 1 ? 'DAY' : 'DAYS'}
            </div>
          </div>

          <div className="nb-card-yellow p-6 text-center transform -rotate-1">
            <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-4 border-4 border-black">
              <Trophy className="w-8 h-8 text-[#fde047]" />
            </div>
            <div className="nb-title text-3xl text-black mb-2">
              {profile.longestStreak}
            </div>
            <div className="nb-subtitle text-sm text-black">
              BEST STREAK
            </div>
            <div className="nb-text text-xs text-black mt-1">
              {profile.longestStreak === 1 ? 'DAY' : 'DAYS'}
            </div>
          </div>

          <div className="nb-card-lime p-6 text-center transform rotate-1">
            <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-4 border-4 border-black">
              <Target className="w-8 h-8 text-[#a3e635]" />
            </div>
            <div className="nb-title text-3xl text-black mb-2">
              {profile.averageScore}%
            </div>
            <div className="nb-subtitle text-sm text-black">
              AVG SCORE
            </div>
            <div className="nb-text text-xs text-black mt-1">
              ACCURACY
            </div>
          </div>

          <div className="nb-card-sky p-6 text-center transform -rotate-1">
            <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-4 border-4 border-black">
              <BookOpen className="w-8 h-8 text-[#38bdf8]" />
            </div>
            <div className="nb-title text-3xl text-black mb-2">
              {profile.totalRevisions}
            </div>
            <div className="nb-subtitle text-sm text-black">
              TOTAL REVISIONS
            </div>
            <div className="nb-text text-xs text-black mt-1">
              COMPLETED
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="nb-card p-8">
          <h2 className="nb-title text-2xl text-black mb-6 flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            REVISION ACTIVITY
          </h2>
          <HeatmapCalendar data={profile.calendarData} />
          <div className="flex items-center gap-4 mt-6 text-sm nb-text text-black">
            <span>LESS</span>
            <div className="heatmap-cell bg-[#ff6b6b] border-2 border-black" />
            <div className="heatmap-cell bg-[#a3e635] border-2 border-black" />
            <div className="heatmap-cell bg-[#38bdf8] border-2 border-black" />
            <div className="heatmap-cell bg-[#c084fc] border-2 border-black" />
            <span>MORE</span>
          </div>
        </div>

        {/* Progress & Achievements */}
        <div className="nb-grid nb-grid-2 gap-8">
          {/* Progress Circles */}
          <div className="nb-card-purple p-8">
            <h2 className="nb-title text-2xl text-black mb-8 text-center flex items-center justify-center gap-3">
              <TrendingUp className="w-6 h-6" />
              PROGRESS
            </h2>
            <div className="flex justify-around">
              <ProgressCircle 
                value={profile.totalRevisions} 
                max={Math.max(profile.totalRevisions, 30)} 
                label="REVISIONS" 
                color="#fde047" 
              />
              <ProgressCircle 
                value={profile.topicsCount} 
                max={Math.max(profile.topicsCount, 10)} 
                label="TOPICS" 
                color="#a3e635" 
              />
              <ProgressCircle 
                value={profile.totalQuestionsSolved} 
                max={Math.max(profile.totalQuestionsSolved, 50)} 
                label="SOLVED" 
                color="#38bdf8" 
              />
            </div>
          </div>

          {/* Achievements */}
          <div className="nb-card-cyan p-8">
            <h2 className="nb-title text-2xl text-black mb-8 text-center flex items-center justify-center gap-3">
              <Award className="w-6 h-6" />
              ACHIEVEMENTS
            </h2>
            <div className="nb-grid nb-grid-3 gap-4">
              {profile.achievements.map(a => (
                <div 
                  key={a.id} 
                  className={`nb-card p-4 text-center ${
                    a.unlocked ? 'transform hover:scale-105' : 'opacity-50 grayscale'
                  }`}
                >
                  <div className="text-3xl mb-2">{a.emoji}</div>
                  <div className="nb-subtitle text-xs text-black">
                    {a.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="nb-card p-8">
          <h2 className="nb-title text-2xl text-black mb-6">
            RECENT SESSIONS
          </h2>
          {profile.recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-black opacity-50" />
              <p className="nb-text text-lg text-black">
                Complete your first revision to see activity here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.recentActivity.map((r, i) => {
                const scoreColor = r.averageScore >= 80 ? 'nb-card-lime' : r.averageScore >= 60 ? 'nb-card-yellow' : 'nb-card-coral';
                const textColor = r.averageScore >= 80 ? 'text-black' : r.averageScore >= 60 ? 'text-black' : 'text-black';
                
                return (
                  <div key={i} className={`${scoreColor} p-4 flex items-center justify-between`}>
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 bg-black border-2 border-black" />
                      <span className={`nb-text ${textColor}`}>
                        {r.topicsSummary || 'Revision Session'}
                      </span>
                    </div>
                    <div className={`flex items-center gap-6 nb-text text-sm ${textColor}`}>
                      <span>{r.questionsAnswered}Q</span>
                      <span className="nb-subtitle">{Math.round(r.averageScore)}%</span>
                      <span>{new Date(r.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
