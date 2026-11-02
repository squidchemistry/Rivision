'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, LogIn } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isLogin) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Could not create your account. Please try again.');
          return;
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password' : result.error);
      } else if (result?.ok) {
        router.push('/profile');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-12 px-4">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h1>
          <p className="text-neutral-800">
            {isLogin
              ? 'Login to continue your learning journey'
              : 'Create an account to start studying smarter'}
          </p>
        </div>

        {/* Form Container */}
        <div className="nb-inset border border-black p-8 space-y-6">
          {error && (
            <div className="bg-nb-coral border border-black text-red-800 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCredentialsAuth} className="space-y-4">
            {/* Name Field (Register Only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-neutral-700" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 nb-inset border border-black text-black placeholder:text-neutral-600 focus:outline-none focus:border-black"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-neutral-700" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 nb-inset border border-black text-black placeholder:text-neutral-600 focus:outline-none focus:border-black"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-neutral-700" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 nb-inset border border-black text-black placeholder:text-neutral-600 focus:outline-none focus:border-black"
                  required
                  minLength={isLogin ? undefined : 8}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full nb-btn nb-btn-primary text-black font-semibold py-2.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="pt-6 border-t border-black">
            <p className="text-center text-neutral-800">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                type="button"
                className="text-blue-800 hover:text-black font-semibold transition-colors"
              >
                {isLogin ? 'Register Here' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          <div>
            <div className="text-2xl font-bold text-blue-800">AI</div>
            <p className="text-xs text-neutral-800 mt-1">Powered</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-900">100+</div>
            <p className="text-xs text-neutral-800 mt-1">Questions</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-cyan-900">Free</div>
            <p className="text-xs text-neutral-800 mt-1">To Start</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}