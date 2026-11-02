'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Brain, Zap, Shield, ArrowRight, CheckCircle2, Sparkles, Target, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/profile');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen nb-bg flex justify-center items-center">
        <div className="w-16 h-16 nb-spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen nb-bg">
      {/* Hero Section */}
      <div className="nb-container nb-section">
        <div className="text-center space-y-12">
          {/* Badge */}
          <div className="inline-block">
            <div className="nb-badge nb-badge-coral px-6 py-3 text-lg">
              🤖 AI-POWERED LEARNING
            </div>
          </div>

          {/* Main Title */}
          <div className="space-y-8">
            <h1 className="nb-title text-6xl md:text-9xl text-black leading-none">
              MASTER<br />
              <span className="inline-block nb-card-coral px-6 py-2 text-black transform -rotate-2">
                ANYTHING
              </span><br />
              WITH AI
            </h1>
            <p className="nb-text text-xl md:text-2xl text-black max-w-3xl mx-auto">
              Upload your study materials and let our AI create personalized revision questions. 
              Learn smarter, not harder with adaptive spaced repetition.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/auth">
              <button className="nb-btn nb-btn-primary px-10 py-5 text-xl flex items-center gap-3 group">
                START LEARNING FREE
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="nb-btn nb-btn-lime px-10 py-5 text-xl">
                VIEW PRICING
              </button>
            </Link>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="nb-badge nb-badge-lime px-4 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              FREE FOREVER
            </div>
            <div className="nb-badge nb-badge-sky px-4 py-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI-GENERATED
            </div>
            <div className="nb-badge nb-badge-purple px-4 py-2 flex items-center gap-2">
              <Target className="w-5 h-5" />
              ADAPTIVE
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="nb-container nb-section">
        <div className="text-center mb-16">
          <h2 className="nb-title text-4xl md:text-6xl text-black mb-6">
            HOW IT WORKS
          </h2>
          <p className="nb-text text-xl text-black max-w-2xl mx-auto">
            Three simple steps to transform your learning experience
          </p>
        </div>

        <div className="nb-grid nb-grid-3 gap-8">
          {/* Feature 1 */}
          <div className="nb-card-sky p-8 text-center transform rotate-1">
            <div className="w-20 h-20 bg-black flex items-center justify-center mb-6 mx-auto border-4 border-black">
              <BookOpen className="w-10 h-10 text-sky-400" />
            </div>
            <div className="nb-badge nb-badge-coral px-3 py-1 mb-4">
              STEP 1
            </div>
            <h3 className="nb-subtitle text-2xl text-black mb-4">
              UPLOAD CONTENT
            </h3>
            <p className="nb-text text-black">
              Drop your PDFs, paste notes, or add web links. Our AI reads and understands your study material instantly.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="nb-card-purple p-8 text-center transform -rotate-1">
            <div className="w-20 h-20 bg-black flex items-center justify-center mb-6 mx-auto border-4 border-black">
              <Zap className="w-10 h-10 text-purple-400" />
            </div>
            <div className="nb-badge nb-badge-yellow px-3 py-1 mb-4">
              STEP 2
            </div>
            <h3 className="nb-subtitle text-2xl text-black mb-4">
              AI GENERATES QUESTIONS
            </h3>
            <p className="nb-text text-black">
              Watch as intelligent algorithms create targeted revision questions that test your understanding perfectly.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="nb-card-lime p-8 text-center transform rotate-1">
            <div className="w-20 h-20 bg-black flex items-center justify-center mb-6 mx-auto border-4 border-black">
              <Brain className="w-10 h-10 text-lime-400" />
            </div>
            <div className="nb-badge nb-badge-cyan px-3 py-1 mb-4">
              STEP 3
            </div>
            <h3 className="nb-subtitle text-2xl text-black mb-4">
              ADAPTIVE LEARNING
            </h3>
            <p className="nb-text text-black">
              Practice with spaced repetition that adapts to your performance. Master topics efficiently with AI guidance.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="nb-container nb-section">
        <div className="nb-card-emerald p-12 text-center transform -rotate-1">
          <h2 className="nb-title text-3xl md:text-5xl text-black mb-8">
            JOIN THE LEARNING REVOLUTION
          </h2>
          <div className="nb-grid nb-grid-4 gap-8">
            <div className="text-center">
              <div className="nb-title text-4xl md:text-6xl text-black mb-2">1000+</div>
              <div className="nb-text text-black">STUDENTS</div>
            </div>
            <div className="text-center">
              <div className="nb-title text-4xl md:text-6xl text-black mb-2">50K+</div>
              <div className="nb-text text-black">QUESTIONS</div>
            </div>
            <div className="text-center">
              <div className="nb-title text-4xl md:text-6xl text-black mb-2">95%</div>
              <div className="nb-text text-black">SUCCESS RATE</div>
            </div>
            <div className="text-center">
              <div className="nb-title text-4xl md:text-6xl text-black mb-2">24/7</div>
              <div className="nb-text text-black">AI SUPPORT</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="nb-container nb-section">
        <div className="nb-card-coral p-12 text-center transform rotate-1">
          <h2 className="nb-title text-4xl md:text-6xl text-black mb-6">
            READY TO GET STARTED?
          </h2>
          <p className="nb-text text-xl text-black mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already learning smarter with AI-powered revision.
          </p>
          <Link href="/auth">
            <button className="nb-btn nb-btn-yellow px-12 py-6 text-2xl">
              START YOUR JOURNEY
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
