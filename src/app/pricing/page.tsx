'use client';

import { useState } from 'react';
import { Check, Zap, Crown, Sparkles, Star, Rocket } from 'lucide-react';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';

const plans = [
  {
    name: 'Free',
    price: PLANS.free.monthlyPrice,
    description: 'Perfect for getting started',
    features: [
      `${PLANS.free.monthlyQuestions} AI questions/month`,
      'Basic difficulty levels',
      'Study progress tracking',
      'Basic analytics dashboard',
      'Email support',
    ],
    icon: Sparkles,
    cta: 'Get Started',
    href: '/auth',
    color: 'nb-card-lime',
    btnColor: 'nb-btn-lime',
  },
  {
    name: 'Pro',
    price: PLANS.pro.monthlyPrice,
    period: '/month',
    description: 'For serious learners',
    features: [
      `${PLANS.pro.monthlyQuestions} AI questions/month`,
      'Advanced difficulty adaptation',
      'Full analytics dashboard',
      'Performance insights',
      'Priority email support',
      'Custom tags & notes',
      'Export study reports',
    ],
    icon: Zap,
    highlighted: true,
    cta: 'Upgrade to Pro',
    href: '/payment?plan=pro',
    color: 'nb-card-yellow',
    btnColor: 'nb-btn-primary',
  },
  {
    name: 'Premium',
    price: PLANS.premium.monthlyPrice,
    period: '/month',
    description: 'For achievers',
    features: [
      'Unlimited AI questions',
      'Real-time adaptation',
      'Advanced analytics',
      'AI-powered insights',
      '24/7 priority support',
      'Team collaboration',
      'API access',
      'Custom integrations',
    ],
    icon: Crown,
    cta: 'Upgrade to Premium',
    href: '/payment?plan=premium',
    color: 'nb-card-purple',
    btnColor: 'nb-btn-purple',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <div className="min-h-screen nb-bg">
      <div className="nb-container py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="nb-badge nb-badge-coral px-6 py-3 text-lg mb-8 inline-block">
            💰 SIMPLE PRICING
          </div>
          <h1 className="nb-title text-6xl md:text-8xl text-black mb-8">
            CHOOSE YOUR<br />
            <span className="inline-block nb-card-sky px-4 py-2 text-black transform rotate-2">
              PLAN
            </span>
          </h1>
          <p className="nb-text text-xl text-black max-w-3xl mx-auto">
            Every plan includes the AI question generator and spaced-repetition reviews. 
            Choose the one that fits your learning goals.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-16">
          <div className="nb-card-emerald p-2 flex items-center gap-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`nb-btn px-6 py-3 text-lg ${
                billingCycle === 'monthly' ? 'nb-btn-primary' : 'nb-btn-lime'
              }`}
            >
              MONTHLY
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`nb-btn px-6 py-3 text-lg ${
                billingCycle === 'annual' ? 'nb-btn-primary' : 'nb-btn-lime'
              }`}
            >
              ANNUAL
              <span className="nb-badge nb-badge-coral px-2 py-1 ml-2 text-xs">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="nb-grid nb-grid-3 gap-8 mb-16">
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            const finalPrice = billingCycle === 'annual' && plan.price > 0 
              ? Math.round(plan.price * 0.8) 
              : plan.price;
            
            return (
              <div
                key={idx}
                className={`${plan.color} p-8 relative ${
                  plan.highlighted ? 'transform -rotate-1 scale-105' : 'transform rotate-1'
                }`}
              >
                {/* Badge */}
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="nb-badge nb-badge-coral px-4 py-2 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Icon & Name */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-4 border-4 border-black">
                    <Icon className="w-8 h-8 text-[#fde047]" />
                  </div>
                  <h3 className="nb-title text-3xl text-black mb-2">
                    {plan.name.toUpperCase()}
                  </h3>
                  <p className="nb-text text-black">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="nb-title text-5xl text-black">
                      ₹{finalPrice}
                    </span>
                    <span className="nb-text text-black">{plan.period}</span>
                  </div>
                  {billingCycle === 'annual' && plan.price > 0 && (
                    <p className="nb-text text-sm text-black">
                      <span className="line-through">₹{plan.price}</span> - 20% OFF!
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Link href={plan.price > 0 ? `${plan.href}&cycle=${billingCycle}` : plan.href} className="block mb-8">
                  <button className={`nb-btn ${plan.btnColor} w-full py-4 text-lg`}>
                    {plan.cta.toUpperCase()}
                  </button>
                </Link>

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="nb-subtitle text-sm text-black mb-4">
                    WHAT&apos;S INCLUDED:
                  </h4>
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-black flex items-center justify-center flex-shrink-0 border-2 border-black">
                        <Check className="w-4 h-4 text-[#fde047]" />
                      </div>
                      <span className="nb-text text-sm text-black">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="nb-card-cyan p-12">
          <h2 className="nb-title text-4xl text-black mb-8 text-center">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="nb-grid nb-grid-2 gap-8">
            {[
              {
                q: 'Can I change plans anytime?',
                a: 'Yes. Upgrade any time and your plan changes as soon as we verify your payment. Paid plans do not renew automatically, so you are never charged without choosing to.',
              },
              {
                q: 'Is there a free trial?',
                a: `Yes! Start with our Free plan with ${PLANS.free.monthlyQuestions} AI questions per month. No credit card required.`,
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept UPI and bank transfer. After paying, enter your transaction reference and we verify it within 24 hours.',
              },
              {
                q: 'Can teams use Rivision?',
                a: 'Yes! Our Premium plan includes team collaboration features. Contact us for enterprise pricing.',
              },
              {
                q: 'Do you offer refunds?',
                a: 'Yes, we offer a 30-day money-back guarantee for all paid plans. No questions asked.',
              },
              {
                q: 'How does the AI work?',
                a: 'Our AI analyzes your content and generates contextual questions using advanced language models.',
              },
            ].map((item, idx) => (
              <div key={idx} className="nb-card-sky p-6">
                <h4 className="nb-subtitle text-lg text-black mb-3">
                  {item.q}
                </h4>
                <p className="nb-text text-black">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16">
          <div className="nb-card-coral p-12 transform -rotate-1">
            <h2 className="nb-title text-4xl md:text-6xl text-black mb-6">
              READY TO START<br />LEARNING?
            </h2>
            <p className="nb-text text-xl text-black mb-8 max-w-2xl mx-auto">
              Join thousands of students who are already learning smarter with AI-powered revision.
            </p>
            <Link href="/auth">
              <button className="nb-btn nb-btn-yellow px-12 py-6 text-2xl flex items-center gap-4 mx-auto">
                <Rocket className="w-8 h-8" />
                GET STARTED NOW
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}