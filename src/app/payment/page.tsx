'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { amountDue, isBillingCycle, PLANS, pricePerMonth, type BillingCycle, type PlanId } from '@/lib/plans';

const paymentMethods = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Transfer' },
];

// Where customers send money. Set these in the environment; nothing is shown until they are.
const payee = {
  upiId: process.env.NEXT_PUBLIC_PAYMENT_UPI_ID,
  accountName: process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME,
  accountNumber: process.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NUMBER,
  ifsc: process.env.NEXT_PUBLIC_PAYMENT_IFSC,
};

type PaymentRequest = { id: string; plan: string; billingCycle: string; amount: number; status: string; createdAt: string };

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentForm />
    </Suspense>
  );
}

function PaymentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  const planParam = searchParams.get('plan');
  const [plan, setPlan] = useState<PlanId>(planParam === 'premium' ? 'premium' : 'pro');
  const cycleParam = searchParams.get('cycle');
  const [cycle, setCycle] = useState<BillingCycle>(isBillingCycle(cycleParam) ? cycleParam : 'monthly');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/payment')
      .then(r => (r.ok ? r.json() : []))
      .then((rows: PaymentRequest[]) => setPending(rows.find(r => r.status === 'pending') ?? null))
      .catch(() => {});
  }, [status]);

  if (status === 'loading') return null;

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-800 mx-auto" />
          <h2 className="text-2xl font-bold text-black">Please Login First</h2>
          <p className="text-neutral-800">You need to be logged in to make a payment.</p>
          <button onClick={() => router.push('/auth')} className="nb-btn nb-btn-primary px-6 py-2">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const planDetails = PLANS[plan];
  const total = amountDue(plan, cycle);
  const payeeConfigured = Boolean(payee.upiId || (payee.accountNumber && payee.ifsc));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billing_cycle: cycle,
          payment_method: paymentMethod,
          transaction_id: transactionId.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to submit payment request');
      setSuccess(true);
      setTimeout(() => router.push('/profile'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="w-16 h-16 text-emerald-800 mx-auto" />
          <h2 className="text-3xl font-bold text-black">Payment Submitted!</h2>
          <p className="text-neutral-800">
            We&apos;ll check your transaction and upgrade your plan, usually within 24 hours.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-32 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl font-bold text-black mb-2">Upgrade to {planDetails.name}</h1>
          <p className="text-lg text-neutral-800">Pay by UPI or bank transfer, then send us the reference number.</p>
        </motion.div>

        {pending && (
          <div className="mb-8 bg-nb-sky border-2 border-black p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-black">
              Your {PLANS[pending.plan as PlanId]?.name ?? pending.plan} payment of ₹{pending.amount} from{' '}
              {new Date(pending.createdAt).toLocaleDateString()} is being verified. You can submit another once it&apos;s reviewed.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <div className="nb-panel p-8 h-fit space-y-6">
            <h3 className="text-2xl font-bold text-black">Order Summary</h3>

            <div className="grid grid-cols-2 gap-2">
              {(['pro', 'premium'] as PlanId[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`py-2 border-2 border-black font-bold ${plan === p ? 'bg-black text-nb-yellow' : 'bg-transparent text-black hover:bg-black/5'}`}
                >
                  {PLANS[p].name}
                </button>
              ))}
              {(['monthly', 'annual'] as BillingCycle[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`py-2 border-2 border-black font-bold ${cycle === c ? 'bg-black text-nb-yellow' : 'bg-transparent text-black hover:bg-black/5'}`}
                >
                  {c === 'monthly' ? 'Monthly' : 'Annual −20%'}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between pb-3 border-b border-black">
                <span className="text-neutral-800">{planDetails.name} plan</span>
                <span className="text-black font-semibold">₹{pricePerMonth(plan, cycle)}/month</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-black">
                <span className="text-neutral-800">AI questions</span>
                <span className="text-black">
                  {planDetails.monthlyQuestions === null ? 'Unlimited' : `${planDetails.monthlyQuestions}/month`}
                </span>
              </div>
              <div className="flex justify-between pb-3 border-b border-black">
                <span className="text-neutral-800">Billing</span>
                <span className="text-black">{cycle === 'annual' ? '12 months, paid up front' : '1 month'}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-lg font-bold text-black">Total to pay</span>
                <span className="text-2xl font-bold text-black tabular-nums">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-black">Pay to</h4>
              {payeeConfigured ? (
                <div className="nb-inset p-4 space-y-1 text-sm text-neutral-900">
                  {payee.upiId && <p><span className="font-semibold">UPI ID:</span> <span className="select-all">{payee.upiId}</span></p>}
                  {payee.accountName && <p><span className="font-semibold">Account name:</span> {payee.accountName}</p>}
                  {payee.accountNumber && <p><span className="font-semibold">Account no.:</span> <span className="select-all">{payee.accountNumber}</span></p>}
                  {payee.ifsc && <p><span className="font-semibold">IFSC:</span> <span className="select-all">{payee.ifsc}</span></p>}
                </div>
              ) : (
                <div className="bg-nb-coral border-2 border-black p-4 text-sm text-black">
                  Payment details haven&apos;t been set up yet. Please contact support before paying.
                </div>
              )}
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="nb-panel p-8 space-y-6">
            <h3 className="text-2xl font-bold text-black">Confirm your payment</h3>

            {error && <div className="bg-nb-coral border border-black text-black px-4 py-3 text-sm">{error}</div>}

            <div>
              <label htmlFor="payment-method" className="block text-sm font-medium text-neutral-900 mb-2">
                Payment method
              </label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 nb-inset text-black focus:outline-none"
              >
                {paymentMethods.map(m => (
                  <option key={m.value} value={m.value} className="bg-nb-yellow">{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="transaction-id" className="block text-sm font-medium text-neutral-900 mb-2">
                {paymentMethod === 'upi' ? 'UPI transaction ID (UTR)' : 'Bank reference number (UTR)'}
              </label>
              <input
                id="transaction-id"
                type="text"
                placeholder="e.g. 412345678901"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                pattern="[A-Za-z0-9\-]{6,40}"
                title="6-40 letters or digits"
                className="w-full px-4 py-2.5 nb-inset text-black placeholder:text-neutral-600 focus:outline-none"
                required
              />
            </div>

            <div className="bg-nb-sky border border-black p-4 text-xs text-black space-y-1">
              <p>Pay exactly ₹{total.toLocaleString('en-IN')}, then enter the reference from your banking app.</p>
              <p>We verify payments within 24 hours and upgrade your plan as soon as it&apos;s confirmed.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !transactionId.trim() || !payeeConfigured || Boolean(pending)}
              className="w-full nb-btn nb-btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit for verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
